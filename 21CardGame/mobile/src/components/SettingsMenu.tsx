import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import { colors } from '../theme/colors';
import { savePlayerPreferences, loadPlayerPreferences, loadLanguagePreference, saveReduceMotion, loadReduceMotion, saveThemePreference, loadThemePreference, ThemePreset } from '../utils/storage';
import { isReduceMotionEnabled, setReduceMotion as setReduceMotionGlobal } from '../utils/sounds';
import { setActiveTheme, getActiveTheme, themePresets, ThemePresetName } from '../theme/colors';

type Language = 'he' | 'en';

interface SettingsMenuProps {
  visible: boolean;
  onClose: () => void;
  currentName?: string;
  currentAvatar?: string;
  onSave?: (name: string, avatar: string) => void;
}

// Available avatars
const AVATARS = ['😎', '🤠', '🎩', '👑', '🎭', '🦸', '🧙', '🦊', '🐱', '🐼', '🦁', '🐯'];

const translations = {
  he: {
    title: 'הגדרות שחקן',
    playerName: 'שם שחקן',
    placeholder: 'הכנס שם...',
    avatar: 'אווטאר',
    save: 'שמור',
    defaultName: 'שחקן 1',
    accessibility: 'נגישות',
    reduceMotion: 'הפחת אנימציות',
    theme: 'ערכת נושא',
    themeClassic: 'קלאסי',
    themeBlue: 'כחול',
    themePurple: 'סגול',
    themeRed: 'אדום',
    on: 'פעיל',
    off: 'כבוי',
  },
  en: {
    title: 'Player Settings',
    playerName: 'Player Name',
    placeholder: 'Enter name...',
    avatar: 'Avatar',
    save: 'Save',
    defaultName: 'Player 1',
    accessibility: 'Accessibility',
    reduceMotion: 'Reduce Motion',
    theme: 'Theme',
    themeClassic: 'Classic',
    themeBlue: 'Blue',
    themePurple: 'Purple',
    themeRed: 'Red',
    on: 'On',
    off: 'Off',
  },
};

/**
 * Settings menu component for changing player name and avatar
 */
export function SettingsMenu({ visible, onClose, currentName, currentAvatar, onSave }: SettingsMenuProps) {
  const [playerName, setPlayerName] = useState(currentName || '');
  const [selectedAvatar, setSelectedAvatar] = useState<string>(currentAvatar || AVATARS[0]);
  const [language, setLanguage] = useState<Language>('he');
  const [reduceMotion, setReduceMotionState] = useState(isReduceMotionEnabled());
  const [activeTheme, setActiveThemeState] = useState<ThemePresetName>(getActiveTheme());

  useEffect(() => {
    // Load language preference
    loadLanguagePreference().then(lang => {
      setLanguage(lang);
    });
  }, []);

  useEffect(() => {
    if (visible) {
      loadPlayerPreferences().then(prefs => {
        if (prefs) {
          setPlayerName(prefs.name);
          setSelectedAvatar(prefs.avatar);
        } else if (currentName) {
          setPlayerName(currentName);
        }
        if (currentAvatar) {
          setSelectedAvatar(currentAvatar);
        }
      });
      loadLanguagePreference().then(lang => {
        setLanguage(lang);
      });
      loadReduceMotion().then(rm => {
        setReduceMotionState(rm);
        setReduceMotionGlobal(rm);
      });
      loadThemePreference().then(theme => {
        setActiveThemeState(theme as ThemePresetName);
      });
    }
  }, [visible, currentName, currentAvatar]);

  const t = translations[language];

  const handleSave = async () => {
    const finalName = playerName.trim() || t.defaultName;
    await savePlayerPreferences(finalName, selectedAvatar);
    if (onSave) {
      onSave(finalName, selectedAvatar);
    }
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <SafeAreaView style={styles.modalContent}>
          <View style={styles.header}>
            <Text style={styles.title}>{t.title}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
            {/* Name Input */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t.playerName}</Text>
              <TextInput
                style={styles.nameInput}
                value={playerName}
                onChangeText={setPlayerName}
                placeholder={t.placeholder}
                placeholderTextColor={colors.mutedForeground}
                maxLength={20}
              />
            </View>

            {/* Avatar Selection */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t.avatar}</Text>
              <View style={styles.avatarGrid}>
                {AVATARS.map((avatar) => {
                  const isSelected = selectedAvatar === avatar;
                  return (
                    <TouchableOpacity
                      key={avatar}
                      style={[
                        styles.avatarButton,
                        isSelected && styles.avatarButtonSelected,
                      ]}
                      onPress={() => setSelectedAvatar(avatar)}
                    >
                      <Text style={styles.avatarEmoji}>{avatar}</Text>
                      {isSelected && (
                        <View style={styles.avatarCheckmark}>
                          <Text style={styles.checkmarkText}>✓</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Accessibility */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t.accessibility}</Text>
              <View style={styles.toggleRow}>
                <Text style={styles.toggleLabel}>{t.reduceMotion}</Text>
                <TouchableOpacity
                  style={[styles.toggleButton, reduceMotion && styles.toggleButtonActive]}
                  onPress={() => {
                    const next = !reduceMotion;
                    setReduceMotionState(next);
                    setReduceMotionGlobal(next);
                    saveReduceMotion(next);
                  }}
                  accessibilityRole="switch"
                  accessibilityState={{ checked: reduceMotion }}
                  accessibilityLabel={t.reduceMotion}
                >
                  <Text style={styles.toggleText}>{reduceMotion ? t.on : t.off}</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Theme */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t.theme}</Text>
              <View style={styles.themeGrid}>
                {(Object.keys(themePresets) as ThemePresetName[]).map((theme) => {
                  const isSelected = activeTheme === theme;
                  const preset = themePresets[theme];
                  const label = theme === 'classic' ? t.themeClassic
                    : theme === 'blue' ? t.themeBlue
                    : theme === 'purple' ? t.themePurple
                    : t.themeRed;
                  return (
                    <TouchableOpacity
                      key={theme}
                      style={[styles.themeButton, isSelected && styles.themeButtonSelected]}
                      onPress={() => {
                        setActiveThemeState(theme);
                        setActiveTheme(theme);
                        saveThemePreference(theme as ThemePreset);
                      }}
                      accessibilityLabel={label}
                      accessibilityState={{ selected: isSelected }}
                    >
                      <View style={[styles.themePreview, { backgroundColor: preset.background }]}>
                        <View style={[styles.themePreviewDot, { backgroundColor: preset.primary }]} />
                      </View>
                      <Text style={[styles.themeLabel, isSelected && styles.themeLabelSelected]}>{label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Save Button */}
            <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
              <Text style={styles.saveButtonText}>{t.save}</Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: colors.background,
    borderRadius: 16,
    maxHeight: '70%',
    width: '100%',
    maxWidth: 400,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.accent,
  },
  closeButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.secondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 16,
    color: colors.foreground,
    fontWeight: 'bold',
  },
  scrollView: {
    flex: 1,
  },
  section: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  sectionTitle: {
    fontSize: 14,
    color: colors.accent,
    marginBottom: 8,
    fontWeight: '600',
  },
  nameInput: {
    backgroundColor: colors.secondary,
    borderRadius: 10,
    padding: 10,
    fontSize: 15,
    color: colors.foreground,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  avatarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
  },
  avatarButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.border,
    position: 'relative',
  },
  avatarButtonSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.accent,
    borderWidth: 2.5,
  },
  avatarEmoji: {
    fontSize: 22,
  },
  avatarCheckmark: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.success,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.background,
  },
  checkmarkText: {
    color: colors.foreground,
    fontSize: 11,
    fontWeight: 'bold',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toggleLabel: {
    fontSize: 14,
    color: colors.foreground,
  },
  toggleButton: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: colors.secondary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  toggleButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.accent,
  },
  toggleText: {
    color: colors.foreground,
    fontSize: 12,
    fontWeight: '600',
  },
  themeGrid: {
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'center',
  },
  themeButton: {
    alignItems: 'center',
    gap: 4,
    padding: 6,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  themeButtonSelected: {
    borderColor: colors.gold,
  },
  themePreview: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  themePreviewDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  themeLabel: {
    fontSize: 11,
    color: colors.mutedForeground,
  },
  themeLabelSelected: {
    color: colors.gold,
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: colors.primary,
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 16,
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
    shadowColor: colors.gold,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.primaryForeground,
  },
});

export default SettingsMenu;
