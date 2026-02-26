import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const PLAYER_NAME_KEY = '@player_name';
const PLAYER_AVATAR_KEY = '@player_avatar';
const LANGUAGE_KEY = '@language';
const MUTE_KEY = '@mute_preference';
const VOLUME_KEY = '@volume_preference';
const AI_DIFFICULTY_KEY = '@ai_difficulty';
const FIRST_LAUNCH_KEY = '@first_launch_done';
const REDUCE_MOTION_KEY = '@reduce_motion';
const THEME_KEY = '@theme_preference';

export interface PlayerPreferences {
  name: string;
  avatar: string;
}

/**
 * Get localStorage safely for web platform
 */
const getLocalStorage = (): Storage | null => {
  if (typeof window === 'undefined') {
    return null;
  }
  try {
    return window.localStorage;
  } catch {
    return null;
  }
};

/**
 * Web storage implementation using localStorage
 */
const getWebStorage = () => {
  const localStorage = getLocalStorage();
  
  if (!localStorage) {
    // No-op storage fallback
    return {
      async getItem(): Promise<string | null> {
        return null;
      },
      async setItem(): Promise<void> {
        // No-op
      },
      async removeItem(): Promise<void> {
        // No-op
      },
      async multiGet(keys: string[]): Promise<[string, string | null][]> {
        return keys.map(key => [key, null]);
      },
      async multiSet(): Promise<void> {
        // No-op
      },
      async multiRemove(): Promise<void> {
        // No-op
      },
    };
  }

  return {
    async getItem(key: string): Promise<string | null> {
      try {
        return localStorage.getItem(key);
      } catch {
        return null;
      }
    },
    async setItem(key: string, value: string): Promise<void> {
      try {
        localStorage.setItem(key, value);
      } catch {
        // Ignore errors
      }
    },
    async removeItem(key: string): Promise<void> {
      try {
        localStorage.removeItem(key);
      } catch {
        // Ignore errors
      }
    },
    async multiGet(keys: string[]): Promise<[string, string | null][]> {
      try {
        return keys.map(key => [key, localStorage.getItem(key)]);
      } catch {
        return keys.map(key => [key, null]);
      }
    },
    async multiSet(keyValuePairs: [string, string][]): Promise<void> {
      try {
        keyValuePairs.forEach(([key, value]) => {
          localStorage.setItem(key, value);
        });
      } catch {
        // Ignore errors
      }
    },
    async multiRemove(keys: string[]): Promise<void> {
      try {
        keys.forEach(key => localStorage.removeItem(key));
      } catch {
        // Ignore errors
      }
    },
  };
};

/**
 * Get storage implementation
 * Uses localStorage for web, AsyncStorage for native platforms
 */
function getStorage() {
  if (Platform.OS === 'web') {
    return getWebStorage();
  }
  return AsyncStorage;
}

/**
 * Save player preferences (name and avatar)
 */
export async function savePlayerPreferences(name: string, avatar: string): Promise<void> {
  try {
    const storage = getStorage();
    await storage.multiSet([
      [PLAYER_NAME_KEY, name],
      [PLAYER_AVATAR_KEY, avatar],
    ]);
  } catch (error) {
    console.error('Error saving player preferences:', error);
  }
}

/**
 * Load player preferences
 */
export async function loadPlayerPreferences(): Promise<PlayerPreferences | null> {
  try {
    const storage = getStorage();
    const [name, avatar] = await storage.multiGet([
      PLAYER_NAME_KEY,
      PLAYER_AVATAR_KEY,
    ]);
    
    if (name[1] && avatar[1]) {
      return {
        name: name[1],
        avatar: avatar[1],
      };
    }
    return null;
  } catch (error) {
    console.error('Error loading player preferences:', error);
    return null;
  }
}

/**
 * Clear player preferences
 */
export async function clearPlayerPreferences(): Promise<void> {
  try {
    const storage = getStorage();
    await storage.multiRemove([PLAYER_NAME_KEY, PLAYER_AVATAR_KEY]);
  } catch (error) {
    console.error('Error clearing player preferences:', error);
  }
}

/**
 * Save language preference
 */
export async function saveLanguagePreference(language: 'he' | 'en'): Promise<void> {
  try {
    const storage = getStorage();
    await storage.setItem(LANGUAGE_KEY, language);
  } catch (error) {
    console.error('Error saving language preference:', error);
  }
}

/**
 * Load language preference
 */
export async function loadLanguagePreference(): Promise<'he' | 'en'> {
  try {
    const storage = getStorage();
    const language = await storage.getItem(LANGUAGE_KEY);
    return (language === 'en' || language === 'he') ? language : 'he';
  } catch (error) {
    console.error('Error loading language preference:', error);
    return 'he';
  }
}

/**
 * Save mute preference
 */
export async function saveMutePreference(muted: boolean): Promise<void> {
  try {
    const storage = getStorage();
    await storage.setItem(MUTE_KEY, muted ? 'true' : 'false');
  } catch (error) {
    console.error('Error saving mute preference:', error);
  }
}

/**
 * Load mute preference
 */
export async function loadMutePreference(): Promise<boolean> {
  try {
    const storage = getStorage();
    const value = await storage.getItem(MUTE_KEY);
    return value === 'true';
  } catch (error) {
    console.error('Error loading mute preference:', error);
    return false;
  }
}

export async function saveVolumePreference(volume: number): Promise<void> {
  try {
    const storage = getStorage();
    await storage.setItem(VOLUME_KEY, volume.toString());
  } catch (error) {
    console.error('Error saving volume preference:', error);
  }
}

export async function loadVolumePreference(): Promise<number> {
  try {
    const storage = getStorage();
    const value = await storage.getItem(VOLUME_KEY);
    if (value != null) {
      const parsed = parseFloat(value);
      if (!isNaN(parsed)) return Math.max(0, Math.min(1, parsed));
    }
    return 1.0;
  } catch (error) {
    console.error('Error loading volume preference:', error);
    return 1.0;
  }
}

export type AIDifficulty = 'easy' | 'medium' | 'hard';

/**
 * Save AI difficulty preference
 */
export async function saveAIDifficulty(difficulty: AIDifficulty): Promise<void> {
  try {
    const storage = getStorage();
    await storage.setItem(AI_DIFFICULTY_KEY, difficulty);
  } catch (error) {
    console.error('Error saving AI difficulty:', error);
  }
}

/**
 * Load AI difficulty preference
 */
export async function loadAIDifficulty(): Promise<AIDifficulty> {
  try {
    const storage = getStorage();
    const value = await storage.getItem(AI_DIFFICULTY_KEY);
    return (value === 'easy' || value === 'medium' || value === 'hard') ? value : 'medium';
  } catch (error) {
    console.error('Error loading AI difficulty:', error);
    return 'medium';
  }
}

export async function isFirstLaunch(): Promise<boolean> {
  try {
    const storage = getStorage();
    const value = await storage.getItem(FIRST_LAUNCH_KEY);
    return value !== 'true';
  } catch { return true; }
}

export async function markFirstLaunchDone(): Promise<void> {
  try {
    const storage = getStorage();
    await storage.setItem(FIRST_LAUNCH_KEY, 'true');
  } catch { /* ignore */ }
}

export async function saveReduceMotion(enabled: boolean): Promise<void> {
  try {
    const storage = getStorage();
    await storage.setItem(REDUCE_MOTION_KEY, enabled ? 'true' : 'false');
  } catch { /* ignore */ }
}

export async function loadReduceMotion(): Promise<boolean> {
  try {
    const storage = getStorage();
    const value = await storage.getItem(REDUCE_MOTION_KEY);
    return value === 'true';
  } catch { return false; }
}

export type ThemePreset = 'classic' | 'blue' | 'purple' | 'red';

export async function saveThemePreference(theme: ThemePreset): Promise<void> {
  try {
    const storage = getStorage();
    await storage.setItem(THEME_KEY, theme);
  } catch { /* ignore */ }
}

export async function loadThemePreference(): Promise<ThemePreset> {
  try {
    const storage = getStorage();
    const value = await storage.getItem(THEME_KEY);
    return (value === 'classic' || value === 'blue' || value === 'purple' || value === 'red') ? value : 'classic';
  } catch { return 'classic'; }
}
