import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const REPLAY_KEY = '@game_replays';
const MAX_REPLAYS = 10;

export interface ReplayMove {
  turn: number;
  playerIndex: number;
  playerName: string;
  type: 'playToCenter' | 'playToStorage' | 'endTurn';
  source?: string;
  sourceIndex?: number;
  destination?: string;
  destinationIndex?: number;
  cardRank?: number;
  cardSuit?: string;
  timestamp: number;
}

export interface GameReplay {
  id: string;
  date: string;
  playerNames: string[];
  winnerName: string;
  moves: ReplayMove[];
  totalTurns: number;
}

function getStorage() {
  if (Platform.OS === 'web') {
    return {
      async getItem(key: string): Promise<string | null> {
        try { return window.localStorage.getItem(key); } catch { return null; }
      },
      async setItem(key: string, value: string): Promise<void> {
        try { window.localStorage.setItem(key, value); } catch { /* noop */ }
      },
    };
  }
  return AsyncStorage;
}

let _currentMoves: ReplayMove[] = [];

export function startRecording() {
  _currentMoves = [];
}

export function recordMove(move: ReplayMove) {
  _currentMoves.push(move);
}

export function getCurrentMoves(): ReplayMove[] {
  return [..._currentMoves];
}

export async function saveReplay(replay: GameReplay): Promise<void> {
  try {
    const storage = getStorage();
    const raw = await storage.getItem(REPLAY_KEY);
    const replays: GameReplay[] = raw ? JSON.parse(raw) : [];
    replays.unshift(replay);
    if (replays.length > MAX_REPLAYS) {
      replays.length = MAX_REPLAYS;
    }
    await storage.setItem(REPLAY_KEY, JSON.stringify(replays));
  } catch { /* ignore */ }
}

export async function loadReplays(): Promise<GameReplay[]> {
  try {
    const storage = getStorage();
    const raw = await storage.getItem(REPLAY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export async function clearReplays(): Promise<void> {
  try {
    const storage = getStorage();
    await storage.setItem(REPLAY_KEY, '[]');
  } catch { /* ignore */ }
}
