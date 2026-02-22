import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GameState } from '../engine/GameEngine';

const SAVE_KEY = '@saved_game';

function getStorage() {
  if (Platform.OS === 'web') {
    return {
      async getItem(key: string): Promise<string | null> {
        try { return window.localStorage.getItem(key); } catch { return null; }
      },
      async setItem(key: string, value: string): Promise<void> {
        try { window.localStorage.setItem(key, value); } catch { /* noop */ }
      },
      async removeItem(key: string): Promise<void> {
        try { window.localStorage.removeItem(key); } catch { /* noop */ }
      },
    };
  }
  return AsyncStorage;
}

export interface SavedGame {
  state: GameState;
  gameMode: 'practice' | 'private' | 'random';
  savedAt: number;
}

export async function saveGame(state: GameState, gameMode: string): Promise<void> {
  try {
    const storage = getStorage();
    const saved: SavedGame = {
      state,
      gameMode: gameMode as SavedGame['gameMode'],
      savedAt: Date.now(),
    };
    await storage.setItem(SAVE_KEY, JSON.stringify(saved));
  } catch {
    // ignore
  }
}

export async function loadSavedGame(): Promise<SavedGame | null> {
  try {
    const storage = getStorage();
    const raw = await storage.getItem(SAVE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as SavedGame;
      if (parsed.state && parsed.state.gameStarted && !parsed.state.gameOver) {
        return parsed;
      }
    }
  } catch {
    // ignore
  }
  return null;
}

export async function clearSavedGame(): Promise<void> {
  try {
    const storage = getStorage();
    await storage.removeItem(SAVE_KEY);
  } catch {
    // ignore
  }
}

export async function hasSavedGame(): Promise<boolean> {
  const saved = await loadSavedGame();
  return saved !== null;
}
