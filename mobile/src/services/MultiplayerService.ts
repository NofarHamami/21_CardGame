import { GameState } from '../engine/GameEngine';
import { logger } from '../utils/logger';

/**
 * Multiplayer service layer for real-time game synchronization.
 *
 * This module defines the interface and a WebSocket-based implementation
 * for multiplayer gameplay. Connect to any WebSocket-compatible backend
 * (e.g. Firebase Realtime Database, Supabase Realtime, custom Node.js server).
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
}

export type MultiplayerEvent =
  | { type: 'room_created'; room: RoomInfo }
  | { type: 'player_joined'; player: PlayerInfo; room: RoomInfo }
  | { type: 'player_left'; playerId: string; room: RoomInfo }
  | { type: 'game_started'; state: GameState }
  | { type: 'state_updated'; state: GameState }
  | { type: 'game_over'; state: GameState }
  | { type: 'error'; message: string }
  | { type: 'disconnected' };

type EventListener = (event: MultiplayerEvent) => void;

export class MultiplayerService {
  private ws: WebSocket | null = null;
  private listeners: Set<EventListener> = new Set();
  private _roomCode: string | null = null;
  private _playerId: string | null = null;
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

  get isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
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
      try {
        this.ws = new WebSocket(this.serverUrl);

        this.ws.onopen = () => {
          logger.debug('MultiplayerService: Connected to server');
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            this.handleMessage(data);
          } catch (e) {
            logger.error('MultiplayerService: Failed to parse message', e);
          }
        };

        this.ws.onclose = () => {
          logger.debug('MultiplayerService: Disconnected');
          this.emit({ type: 'disconnected' });
          this.scheduleReconnect();
        };

        this.ws.onerror = (err) => {
          logger.error('MultiplayerService: WebSocket error', err);
          reject(new Error('Connection failed'));
        };
      } catch (e) {
        reject(e);
      }
    });
  }

  private handleMessage(data: { type: string; payload?: unknown }) {
    switch (data.type) {
      case 'room_created':
        this._roomCode = (data.payload as RoomInfo).roomCode;
        this.emit({ type: 'room_created', room: data.payload as RoomInfo });
        break;
      case 'player_joined':
        this.emit(data as MultiplayerEvent);
        break;
      case 'player_left':
        this.emit(data as MultiplayerEvent);
        break;
      case 'game_started':
        this.emit({ type: 'game_started', state: data.payload as GameState });
        break;
      case 'state_updated':
        this.emit({ type: 'state_updated', state: data.payload as GameState });
        break;
      case 'game_over':
        this.emit({ type: 'game_over', state: data.payload as GameState });
        break;
      case 'error':
        this.emit({ type: 'error', message: (data.payload as { message: string }).message });
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

  startGame(): void {
    this.send('start_game', { roomCode: this._roomCode });
  }

  sendMove(moveType: string, moveData: unknown): void {
    this.send('player_move', {
      roomCode: this._roomCode,
      playerId: this._playerId,
      moveType,
      moveData,
    });
  }

  leaveRoom(): void {
    this.send('leave_room', { roomCode: this._roomCode, playerId: this._playerId });
    this._roomCode = null;
  }

  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this._roomCode = null;
    this._playerId = null;
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      logger.debug('MultiplayerService: Attempting reconnect...');
      this.connect().catch(() => {
        logger.debug('MultiplayerService: Reconnect failed, will retry');
        this.scheduleReconnect();
      });
    }, 3000);
  }
}

/**
 * Generate a 6-character room code.
 */
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
