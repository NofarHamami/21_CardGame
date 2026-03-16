import { WebSocketServer, WebSocket } from 'ws';
import { v4 as uuidv4 } from 'uuid';

const PORT = Number(process.env.PORT) || 8080;

interface Player {
  id: string;
  ws: WebSocket;
  name: string;
  avatar: string;
  connected: boolean;
  playerIndex: number;
}

interface Room {
  code: string;
  host: string;
  players: Player[];
  maxPlayers: number;
  status: 'waiting' | 'playing' | 'finished';
  gameState: any | null;
  mode: 'private' | 'random';
  timedMode?: boolean;
}

interface QueueEntry {
  playerId: string;
  ws: WebSocket;
  name: string;
  avatar: string;
  numPlayers: number;
  timedMode: boolean;
  joinedAt: number;
}

const rooms = new Map<string, Room>();
const matchmakingQueue: QueueEntry[] = [];

function generateRoomCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

function broadcast(room: Room, message: object, exclude?: string) {
  const data = JSON.stringify(message);
  room.players.forEach(player => {
    if (player.id !== exclude && player.ws.readyState === WebSocket.OPEN) {
      player.ws.send(data);
    }
  });
}

function broadcastAll(room: Room, message: object) {
  const data = JSON.stringify(message);
  room.players.forEach(player => {
    if (player.ws.readyState === WebSocket.OPEN) {
      player.ws.send(data);
    }
  });
}

function sendTo(ws: WebSocket, message: object) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(message));
  }
}

function getRoomInfo(room: Room) {
  return {
    roomCode: room.code,
    hostName: room.players.find(p => p.id === room.host)?.name || '',
    playerCount: room.players.length,
    maxPlayers: room.maxPlayers,
    status: room.status,
    players: room.players.map(p => ({
      id: p.id,
      name: p.name,
      avatar: p.avatar,
      connected: p.connected,
      playerIndex: p.playerIndex,
    })),
  };
}

function validateTurn(room: Room, playerId: string): string | null {
  if (!room.gameState) return 'Game has not started';
  if (room.status !== 'playing') return 'Game is not in progress';
  if (room.gameState.gameOver) return 'Game is over';

  const player = room.players.find(p => p.id === playerId);
  if (!player) return 'Player not in room';
  if (room.gameState.currentPlayerIndex !== player.playerIndex) return 'Not your turn';

  return null;
}

function validateMove(room: Room, playerId: string, move: any): string | null {
  const turnError = validateTurn(room, playerId);
  if (turnError) return turnError;

  if (!move || !move.type) return 'Invalid move format';

  if (move.type === 'playToCenter') {
    if (move.source == null || move.sourceIndex == null || move.centerPileIndex == null) {
      return 'Missing move parameters for playToCenter';
    }
    if (move.centerPileIndex < 0 || move.centerPileIndex >= 4) {
      return 'Invalid center pile index';
    }
  } else if (move.type === 'playToStorage') {
    if (move.source == null || move.sourceIndex == null || move.storageIndex == null) {
      return 'Missing move parameters for playToStorage';
    }
    if (move.storageIndex < 0 || move.storageIndex >= 5) {
      return 'Invalid storage index';
    }
  } else if (move.type === 'endTurn') {
    // Validated by turn check above
  } else {
    return `Unknown move type: ${move.type}`;
  }

  return null;
}

/**
 * Try to match players in the queue into a game room.
 * Groups by numPlayers AND timedMode so players only match with identical settings.
 */
function processMatchmakingQueue() {
  // Group by "numPlayers|timedMode" key
  const byKey = new Map<string, QueueEntry[]>();
  for (const entry of matchmakingQueue) {
    const key = `${entry.numPlayers}|${entry.timedMode}`;
    const list = byKey.get(key) || [];
    list.push(entry);
    byKey.set(key, list);
  }

  for (const [, entries] of byKey) {
    const numPlayers = entries[0].numPlayers;
    const timedMode = entries[0].timedMode;
    while (entries.length >= numPlayers) {
      const matched = entries.splice(0, numPlayers);
      // Remove from global queue
      for (const m of matched) {
        const idx = matchmakingQueue.indexOf(m);
        if (idx >= 0) matchmakingQueue.splice(idx, 1);
      }

      const code = generateRoomCode();
      const room: Room = {
        code,
        host: matched[0].playerId,
        players: matched.map((m, i) => ({
          id: m.playerId,
          ws: m.ws,
          name: m.name,
          avatar: m.avatar,
          connected: true,
          playerIndex: i,
        })),
        maxPlayers: numPlayers,
        status: 'waiting',
        gameState: null,
        mode: 'random',
        timedMode,
      };

      rooms.set(code, room);

      // Notify all matched players
      broadcastAll(room, {
        type: 'room_created',
        payload: getRoomInfo(room),
      });

      // Auto-start after a short delay
      setTimeout(() => {
        if (room.status === 'waiting' && room.players.length >= 2) {
          room.status = 'playing';
          broadcastAll(room, {
            type: 'game_started',
            payload: {
              players: room.players.map(p => ({
                id: p.id,
                name: p.name,
                avatar: p.avatar,
                playerIndex: p.playerIndex,
              })),
              timedMode: room.timedMode || false,
            },
          });
        }
      }, 2000);
    }
  }
}

const wss = new WebSocketServer({ port: PORT });
console.log(`21CardGame WebSocket server running on port ${PORT}`);

// Periodically process the matchmaking queue
setInterval(processMatchmakingQueue, 2000);

wss.on('connection', (ws: WebSocket) => {
  const playerId = uuidv4();
  let currentRoom: Room | null = null;

  console.log(`[CONN] Player connected: ${playerId}`);

  // Send welcome with player ID
  sendTo(ws, { type: 'welcome', payload: { playerId } });

  ws.on('message', (raw: Buffer) => {
    let data: { type: string; payload?: any };
    try {
      data = JSON.parse(raw.toString());
    } catch {
      sendTo(ws, { type: 'error', payload: { message: 'Invalid JSON' } });
      return;
    }

    // Resolve currentRoom for players matched via matchmaking queue
    // (processMatchmakingQueue creates rooms but can't update this closure variable)
    if (!currentRoom) {
      for (const room of rooms.values()) {
        if (room.players.some(p => p.id === playerId)) {
          currentRoom = room;
          break;
        }
      }
    }

    switch (data.type) {
      case 'create_room': {
        const { playerName, playerAvatar, maxPlayers } = data.payload || {};
        const code = generateRoomCode();
        console.log(`[ROOM] ${playerName} creating room ${code} (max ${maxPlayers})`);
        const player: Player = {
          id: playerId,
          ws,
          name: playerName || 'Host',
          avatar: playerAvatar || '😎',
          connected: true,
          playerIndex: 0,
        };
        const room: Room = {
          code,
          host: playerId,
          players: [player],
          maxPlayers: maxPlayers || 4,
          status: 'waiting',
          gameState: null,
          mode: 'private',
        };
        rooms.set(code, room);
        currentRoom = room;
        sendTo(ws, { type: 'room_created', payload: getRoomInfo(room) });
        break;
      }

      case 'join_room': {
        const { roomCode, playerName, playerAvatar } = data.payload || {};
        console.log(`[JOIN] ${playerName} joining room ${roomCode}`);
        const room = rooms.get(roomCode);
        if (!room) {
          sendTo(ws, { type: 'error', payload: { message: 'Room not found' } });
          break;
        }
        if (room.status !== 'waiting') {
          sendTo(ws, { type: 'error', payload: { message: 'Game already in progress' } });
          break;
        }
        if (room.players.length >= room.maxPlayers) {
          sendTo(ws, { type: 'error', payload: { message: 'Room is full' } });
          break;
        }
        const player: Player = {
          id: playerId,
          ws,
          name: playerName || 'Player',
          avatar: playerAvatar || '😎',
          connected: true,
          playerIndex: room.players.length,
        };
        room.players.push(player);
        currentRoom = room;
        const info = getRoomInfo(room);
        broadcastAll(room, {
          type: 'player_joined',
          player: { id: player.id, name: player.name, avatar: player.avatar, connected: true, playerIndex: player.playerIndex },
          room: info,
        });
        break;
      }

      case 'join_matchmaking': {
        const { playerName, playerAvatar, numPlayers, timedMode } = data.payload || {};
        // Remove any existing queue entry for this player
        const existingIdx = matchmakingQueue.findIndex(e => e.playerId === playerId);
        if (existingIdx >= 0) matchmakingQueue.splice(existingIdx, 1);

        matchmakingQueue.push({
          playerId,
          ws,
          name: playerName || 'Player',
          avatar: playerAvatar || '😎',
          numPlayers: numPlayers || 2,
          timedMode: !!timedMode,
          joinedAt: Date.now(),
        });

        sendTo(ws, { type: 'matchmaking_queued', payload: { position: matchmakingQueue.length } });

        // Try immediate matching
        processMatchmakingQueue();
        break;
      }

      case 'start_game': {
        console.log(`[START] Player ${playerId} requesting game start`);
        if (!currentRoom || currentRoom.host !== playerId) {
          sendTo(ws, { type: 'error', payload: { message: 'Only host can start' } });
          break;
        }
        if (currentRoom.players.length < 2) {
          sendTo(ws, { type: 'error', payload: { message: 'Need at least 2 players' } });
          break;
        }
        currentRoom.status = 'playing';
        broadcastAll(currentRoom, {
          type: 'game_started',
          payload: {
            players: currentRoom.players.map(p => ({
              id: p.id,
              name: p.name,
              avatar: p.avatar,
              playerIndex: p.playerIndex,
            })),
          },
        });
        break;
      }

      case 'sync_state': {
        if (!currentRoom) break;
        const player = currentRoom.players.find(p => p.id === playerId);
        if (player && currentRoom.host === playerId && data.payload?.gameState) {
          currentRoom.gameState = data.payload.gameState;
          broadcast(currentRoom, {
            type: 'state_updated',
            payload: { gameState: currentRoom.gameState },
          }, playerId);
        }
        break;
      }

      case 'player_move': {
        if (!currentRoom) break;

        const move = data.payload?.move;
        const newState = data.payload?.gameState;

        const error = validateMove(currentRoom, playerId, move);
        if (error) {
          sendTo(ws, { type: 'move_rejected', payload: { message: error } });
          break;
        }

        if (newState) {
          currentRoom.gameState = newState;
        }

        broadcast(currentRoom, {
          type: 'state_updated',
          payload: { gameState: currentRoom.gameState, move },
        }, playerId);

        if (currentRoom.gameState?.gameOver) {
          currentRoom.status = 'finished';
          broadcastAll(currentRoom, {
            type: 'game_over',
            payload: {
              winner: currentRoom.gameState.winner,
              gameState: currentRoom.gameState,
            },
          });
        }
        break;
      }

      case 'leave_room': {
        if (!currentRoom) break;
        currentRoom.players = currentRoom.players.filter(p => p.id !== playerId);
        broadcast(currentRoom, {
          type: 'player_left',
          playerId,
          room: getRoomInfo(currentRoom),
        });
        if (currentRoom.players.length === 0) {
          rooms.delete(currentRoom.code);
        }
        currentRoom = null;
        break;
      }

      default:
        sendTo(ws, { type: 'error', payload: { message: `Unknown type: ${data.type}` } });
    }
  });

  ws.on('close', () => {
    // Remove from matchmaking queue
    const queueIdx = matchmakingQueue.findIndex(e => e.playerId === playerId);
    if (queueIdx >= 0) matchmakingQueue.splice(queueIdx, 1);

    if (currentRoom) {
      const player = currentRoom.players.find(p => p.id === playerId);
      if (player) {
        player.connected = false;
        broadcast(currentRoom, {
          type: 'player_left',
          playerId,
          room: getRoomInfo(currentRoom),
        });
      }
      // Cleanup after 30s if they don't reconnect
      setTimeout(() => {
        if (currentRoom) {
          currentRoom.players = currentRoom.players.filter(p => p.id !== playerId);
          if (currentRoom.players.length === 0) {
            rooms.delete(currentRoom.code);
          }
        }
      }, 30000);
    }
  });
});
