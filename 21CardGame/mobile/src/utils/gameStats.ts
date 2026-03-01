import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STATS_KEY = '@game_stats';

export interface GameStats {
  gamesPlayed: number;
  gamesWon: number;
  gamesLost: number;
  currentWinStreak: number;
  longestWinStreak: number;
  totalTurnsPlayed: number;
}

const DEFAULT_STATS: GameStats = {
  gamesPlayed: 0,
  gamesWon: 0,
  gamesLost: 0,
  currentWinStreak: 0,
  longestWinStreak: 0,
  totalTurnsPlayed: 0,
};

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

export async function loadGameStats(): Promise<GameStats> {
  try {
    const storage = getStorage();
    const raw = await storage.getItem(STATS_KEY);
    if (raw) {
      return { ...DEFAULT_STATS, ...JSON.parse(raw) };
    }
  } catch {
    // ignore
  }
  return { ...DEFAULT_STATS };
}

export async function saveGameStats(stats: GameStats): Promise<void> {
  try {
    const storage = getStorage();
    await storage.setItem(STATS_KEY, JSON.stringify(stats));
  } catch {
    // ignore
  }
}

export async function recordGameResult(won: boolean, turnsPlayed: number): Promise<GameStats> {
  const stats = await loadGameStats();
  stats.gamesPlayed += 1;
  stats.totalTurnsPlayed += turnsPlayed;

  if (won) {
    stats.gamesWon += 1;
    stats.currentWinStreak += 1;
    if (stats.currentWinStreak > stats.longestWinStreak) {
      stats.longestWinStreak = stats.currentWinStreak;
    }
  } else {
    stats.gamesLost += 1;
    stats.currentWinStreak = 0;
  }

  await saveGameStats(stats);
  return stats;
}

export function getWinRate(stats: GameStats): number {
  if (stats.gamesPlayed === 0) return 0;
  return Math.round((stats.gamesWon / stats.gamesPlayed) * 100);
}

export function getAverageTurns(stats: GameStats): number {
  if (stats.gamesPlayed === 0) return 0;
  return Math.round(stats.totalTurnsPlayed / stats.gamesPlayed);
}
