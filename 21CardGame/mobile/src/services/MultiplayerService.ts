import { GameState } from '../engine/GameEngine';
import { logger } from '../utils/logger';

/**
 * Multiplayer service layer for real-time game synchronization.
 *
 * WebSocket-based implementation for multiplayer gameplay.
 * Supports private rooms (invite via code) and random matchmaking.
 */

export interface RoomInfo {
  roomCode: string;
  hostName: string;
  playerCount: number;
  maxPlayers: number;
  status: 'waiting' | 'playing' | 'finished';
  players: PlayerInfo[];
}

export interface PlayerInfo {
  id: string;
  name: string;
  avatar?: string;
  connected: boolean;
  playerIndex?: number;
}

export type MultiplayerEvent =
  | { type: 'room_created'; room: RoomInfo }
  | { type: 'player_joined'; player: PlayerInfo; room: RoomInfo }
  | { type: 'player_left'; playerId: string; room: RoomInfo }
  | { type: 'game_started'; players: PlayerInfo[]; localPlayerIndex: number }
  | { type: 'state_updated'; state: GameState; move?: unknown }
  | { type: 'move_rejected'; message: string }
  | { type: 'game_over'; state: GameState }
  | { type: 'error'; message: string }
  | { type: 'disconnected' };

type EventListener = (event: MultiplayerEvent) => void;

export class MultiplayerService {
  private ws: WebSocket | null = null;
  private listeners: Set<EventListener> = new Set();
  private _roomCode: string | null = null;
  private _playerId: string | null = null;
  private _localPlayerIndex: number = 0;
  private _gamePlayers: PlayerInfo[] | null = null;
  private _gameStarted: boolean = false;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private serverUrl: string;

  constructor(serverUrl: string = 'ws://localhost:8080') {
    this.serverUrl = serverUrl;
  }

  get roomCode(): string | null {
    return this._roomCode;
  }

  get playerId(): string | null {
    return this._playerId;
  }

  get localPlayerIndex(): number {
    return this._localPlayerIndex;
  }

  get isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  get gamePlayers(): PlayerInfo[] | null {
    return this._gamePlayers;
  }

  get gameStarted(): boolean {
    return this._gameStarted;
  }

  addEventListener(listener: EventListener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit(event: MultiplayerEvent) {
    this.listeners.forEach(fn => {
      try { fn(event); } catch (e) { logger.error('MultiplayerService listener error:', e); }
    });
  }

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      let settled = false;

      const timeout = setTimeout(() => {
        if (!settled) {
          settled = true;
          if (this.ws) {
            this.ws.onopen = null;
            this.ws.onerror = null;
            this.ws.onclose = null;
            this.ws.close();
            this.ws = null;
          }
          reject(new Error('Connection timed out'));
        }
      }, 5000);

      try {
        this.ws = new WebSocket(this.serverUrl);

        this.ws.onopen = () => {
          if (settled) return;
          settled = true;
          clearTimeout(timeout);
          logger.debug('MultiplayerService: Connected to server');
          resolve();
        };

        this.ws.onmessage = (event: MessageEvent) => {
          try {
            const data = JSON.parse(typeof event.data === 'string' ? event.data : '');
            this.handleMessage(data);
          } catch (e) {
            logger.error('MultiplayerService: Failed to parse message', e);
          }
        };

        this.ws.onclose = () => {
          if (!settled) {
            settled = true;
            clearTimeout(timeout);
            reject(new Error('Connection closed'));
          }
          logger.debug('MultiplayerService: Disconnected');
          this.emit({ type: 'disconnected' });
        };

        this.ws.onerror = () => {
          if (!settled) {
            settled = true;
            clearTimeout(timeout);
            reject(new Error('Connection failed'));
          }
        };
      } catch (e) {
        settled = true;
        clearTimeout(timeout);
        reject(e);
      }
    });
  }

  private handleMessage(data: { type: string; payload?: any; [key: string]: any }) {
    switch (data.type) {
      case 'room_created': {
        const room = data.payload as RoomInfo;
        this._roomCode = room.roomCode;
        this.emit({ type: 'room_created', room });
        break;
      }
      case 'player_joined': {
        const room = (data as any).room || data.payload?.room;
        const player = (data as any).player || data.payload?.player;
        if (room && player) {
          this.emit({ type: 'player_joined', player, room });
        }
        break;
      }
      case 'player_left': {
        const room = (data as any).room || data.payload?.room;
        const leftPlayerId = (data as any).playerId || data.payload?.playerId;
        if (room) {
          this.emit({ type: 'player_left', playerId: leftPlayerId, room });
        }
        break;
      }
      case 'welcome':
        this._playerId = (data.payload as any)?.playerId || null;
        break;
      case 'game_started': {
        const payload = data.payload as any;
        const players: PlayerInfo[] = payload?.players || [];
        const myPlayer = players.find(p => p.id === this._playerId);
        if (myPlayer?.playerIndex != null) {
          this._localPlayerIndex = myPlayer.playerIndex;
        }
        this._gamePlayers = players;
        this._gameStarted = true;
        this.emit({
          type: 'game_started',
          players,
          localPlayerIndex: this._localPlayerIndex,
        });
        break;
      }
      case 'state_updated': {
        const payload = data.payload as any;
        this.emit({
          type: 'state_updated',
          state: payload?.gameState || payload,
          move: payload?.move,
        });
        break;
      }
      case 'move_rejected':
        this.emit({ type: 'move_rejected', message: (data.payload as any)?.message || 'Move rejected' });
        break;
      case 'game_over': {
        const payload = data.payload as any;
        this.emit({ type: 'game_over', state: payload?.gameState || payload });
        break;
      }
      case 'error':
        this.emit({ type: 'error', message: (data.payload as any)?.message || 'Unknown error' });
        break;
      default:
        logger.debug('MultiplayerService: Unknown message type', data.type);
    }
  }

  private send(type: string, payload?: unknown) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      logger.error('MultiplayerService: Not connected');
      return;
    }
    this.ws.send(JSON.stringify({ type, payload }));
  }

  createRoom(playerName: string, playerAvatar: string, maxPlayers: number): void {
    this.send('create_room', { playerName, playerAvatar, maxPlayers });
  }

  joinRoom(roomCode: string, playerName: string, playerAvatar: string): void {
    this._roomCode = roomCode;
    this.send('join_room', { roomCode, playerName, playerAvatar });
  }

  joinMatchmaking(playerName: string, playerAvatar: string, numPlayers: number): void {
    this.send('join_matchmaking', { playerName, playerAvatar, numPlayers });
  }

  startGame(): void {
    this.send('start_game', { roomCode: this._roomCode });
  }

  sendMove(move: { type: string; [key: string]: any }, gameState: GameState): void {
    this.send('player_move', {
      roomCode: this._roomCode,
      playerId: this._playerId,
      move,
      gameState,
    });
  }

  syncState(gameState: GameState): void {
    this.send('sync_state', { gameState });
  }

  leaveRoom(): void {
    if (this._roomCode) {
      this.send('leave_room', { roomCode: this._roomCode, playerId: this._playerId });
    }
    this._roomCode = null;
  }

  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.leaveRoom();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this._roomCode = null;
    this._playerId = null;
    this._localPlayerIndex = 0;
    this._gamePlayers = null;
    this._gameStarted = false;
  }
}

export function generateRoomCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

let _instance: MultiplayerService | null = null;

export function getMultiplayerService(serverUrl?: string): MultiplayerService {
  if (!_instance) {
    _instance = new MultiplayerService(serverUrl);
  }
  return _instance;
}

export function resetMultiplayerService(): void {
  if (_instance) {
    _instance.disconnect();
    _instance = null;
  }
}
