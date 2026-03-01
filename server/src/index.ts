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
}

const rooms = new Map<string, Room>();

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

/**
 * Validate that it's the player's turn and the game is active.
 */
function validateTurn(room: Room, playerId: string): string | null {
  if (!room.gameState) return 'Game has not started';
  if (room.status !== 'playing') return 'Game is not in progress';
  if (room.gameState.gameOver) return 'Game is over';

  const player = room.players.find(p => p.id === playerId);
  if (!player) return 'Player not in room';
  if (room.gameState.currentPlayerIndex !== player.playerIndex) return 'Not your turn';

  return null;
}

/**
 * Basic move validation: checks if the move structure is well-formed
 * and it's the player's turn. The client still computes the resulting
 * state but the server verifies the key invariants.
 */
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
    // End turn validated by turn check above
  } else {
    return `Unknown move type: ${move.type}`;
  }

  return null;
}

const wss = new WebSocketServer({ port: PORT });
console.log(`21CardGame WebSocket server running on port ${PORT}`);

wss.on('connection', (ws: WebSocket) => {
  const playerId = uuidv4();
  let currentRoom: Room | null = null;

  ws.on('message', (raw: Buffer) => {
    let data: { type: string; payload?: any };
    try {
      data = JSON.parse(raw.toString());
    } catch {
      sendTo(ws, { type: 'error', payload: { message: 'Invalid JSON' } });
      return;
    }

    switch (data.type) {
      case 'create_room': {
        const { playerName, playerAvatar, maxPlayers } = data.payload || {};
        const code = generateRoomCode();
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
        };
        rooms.set(code, room);
        currentRoom = room;
        sendTo(ws, { type: 'room_created', payload: getRoomInfo(room) });
        break;
      }

      case 'join_room': {
        const { roomCode, playerName, playerAvatar } = data.payload || {};
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

      case 'start_game': {
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
        // Host sends initial state; server stores it
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

        // Accept move and update authoritative state
        if (newState) {
          currentRoom.gameState = newState;
        }

        broadcast(currentRoom, {
          type: 'state_updated',
          payload: { gameState: currentRoom.gameState, move },
        }, playerId);

        // Check for game over
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
