import { WebSocketServer, WebSocket } from 'ws';
import { v4 as uuidv4 } from 'uuid';

const PORT = Number(process.env.PORT) || 8080;

interface Player {
  id: string;
  ws: WebSocket;
  name: string;
  avatar: string;
  connected: boolean;
}

interface Room {
  code: string;
  host: string;
  players: Player[];
  maxPlayers: number;
  status: 'waiting' | 'playing' | 'finished';
  gameState: unknown | null;
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
    })),
  };
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
        };
        room.players.push(player);
        currentRoom = room;
        const info = getRoomInfo(room);
        broadcast(room, {
          type: 'player_joined',
          player: { id: player.id, name: player.name, avatar: player.avatar, connected: true },
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
        broadcast(currentRoom, {
          type: 'game_started',
          payload: { players: currentRoom.players.map(p => ({ id: p.id, name: p.name, avatar: p.avatar })) },
        });
        break;
      }

      case 'player_move': {
        if (!currentRoom) break;
        broadcast(currentRoom, {
          type: 'state_updated',
          payload: data.payload,
        }, playerId);
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
      // Remove disconnected players after a timeout
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
