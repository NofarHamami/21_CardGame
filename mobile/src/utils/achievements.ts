import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ACHIEVEMENTS_KEY = '@achievements';

export interface Achievement {
  id: string;
  titleEn: string;
  titleHe: string;
  descEn: string;
  descHe: string;
  icon: string;
  unlocked: boolean;
  unlockedAt?: string;
}

const ACHIEVEMENT_DEFINITIONS: Omit<Achievement, 'unlocked' | 'unlockedAt'>[] = [
  { id: 'first_win', titleEn: 'First Victory', titleHe: 'ניצחון ראשון', descEn: 'Win your first game', descHe: 'נצח במשחק הראשון', icon: '🏆' },
  { id: 'win_streak_3', titleEn: 'Hot Streak', titleHe: 'רצף חם', descEn: 'Win 3 games in a row', descHe: 'נצח 3 משחקים ברצף', icon: '🔥' },
  { id: 'win_streak_5', titleEn: 'Unstoppable', titleHe: 'בלתי ניתן לעצירה', descEn: 'Win 5 games in a row', descHe: 'נצח 5 משחקים ברצף', icon: '⚡' },
  { id: 'games_10', titleEn: 'Regular', titleHe: 'שחקן קבוע', descEn: 'Play 10 games', descHe: 'שחק 10 משחקים', icon: '🎮' },
  { id: 'games_50', titleEn: 'Veteran', titleHe: 'ותיק', descEn: 'Play 50 games', descHe: 'שחק 50 משחקים', icon: '🎖️' },
  { id: 'wins_10', titleEn: 'Champion', titleHe: 'אלוף', descEn: 'Win 10 games', descHe: 'נצח ב-10 משחקים', icon: '👑' },
  { id: 'fast_win', titleEn: 'Speed Demon', titleHe: 'שד מהירות', descEn: 'Win in under 20 turns', descHe: 'נצח בפחות מ-20 תורות', icon: '⏱️' },
  { id: 'no_storage_win', titleEn: 'Purist', titleHe: 'טהרן', descEn: 'Win without using storage', descHe: 'נצח בלי להשתמש באחסון', icon: '✨' },
];

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

export async function loadAchievements(): Promise<Achievement[]> {
  try {
    const storage = getStorage();
    const raw = await storage.getItem(ACHIEVEMENTS_KEY);
    const saved: Record<string, { unlocked: boolean; unlockedAt?: string }> = raw ? JSON.parse(raw) : {};
    return ACHIEVEMENT_DEFINITIONS.map(def => ({
      ...def,
      unlocked: saved[def.id]?.unlocked || false,
      unlockedAt: saved[def.id]?.unlockedAt,
    }));
  } catch {
    return ACHIEVEMENT_DEFINITIONS.map(def => ({ ...def, unlocked: false }));
  }
}

async function saveAchievementState(achievements: Achievement[]): Promise<void> {
  try {
    const storage = getStorage();
    const state: Record<string, { unlocked: boolean; unlockedAt?: string }> = {};
    achievements.forEach(a => {
      if (a.unlocked) {
        state[a.id] = { unlocked: true, unlockedAt: a.unlockedAt };
      }
    });
    await storage.setItem(ACHIEVEMENTS_KEY, JSON.stringify(state));
  } catch { /* ignore */ }
}

export interface GameResultForAchievements {
  won: boolean;
  turnsPlayed: number;
  gamesPlayed: number;
  gamesWon: number;
  currentWinStreak: number;
  usedStorage: boolean;
}

export async function checkAndUnlockAchievements(result: GameResultForAchievements): Promise<Achievement[]> {
  const achievements = await loadAchievements();
  const newlyUnlocked: Achievement[] = [];
  const now = new Date().toISOString();

  const unlock = (id: string) => {
    const ach = achievements.find(a => a.id === id);
    if (ach && !ach.unlocked) {
      ach.unlocked = true;
      ach.unlockedAt = now;
      newlyUnlocked.push(ach);
    }
  };

  if (result.won) unlock('first_win');
  if (result.currentWinStreak >= 3) unlock('win_streak_3');
  if (result.currentWinStreak >= 5) unlock('win_streak_5');
  if (result.gamesPlayed >= 10) unlock('games_10');
  if (result.gamesPlayed >= 50) unlock('games_50');
  if (result.gamesWon >= 10) unlock('wins_10');
  if (result.won && result.turnsPlayed < 20) unlock('fast_win');
  if (result.won && !result.usedStorage) unlock('no_storage_win');

  await saveAchievementState(achievements);
  return newlyUnlocked;
}
