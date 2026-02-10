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
import { savePlayerPreferences, loadPlayerPreferences, loadLanguagePreference } from '../utils/storage';

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
  },
  en: {
    title: 'Player Settings',
    playerName: 'Player Name',
    placeholder: 'Enter name...',
    avatar: 'Avatar',
    save: 'Save',
    defaultName: 'Player 1',
  },
};

/**
 * Settings menu component for changing player name and avatar
 */
export function SettingsMenu({ visible, onClose, currentName, currentAvatar, onSave }: SettingsMenuProps) {
  const [playerName, setPlayerName] = useState(currentName || '');
  const [selectedAvatar, setSelectedAvatar] = useState<string>(currentAvatar || AVATARS[0]);
  const [language, setLanguage] = useState<Language>('he');

  useEffect(() => {
    // Load language preference
    loadLanguagePreference().then(lang => {
      setLanguage(lang);
    });
  }, []);

  useEffect(() => {
    if (visible) {
      // Load saved preferences when modal opens
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
      // Reload language preference when modal opens
      loadLanguagePreference().then(lang => {
        setLanguage(lang);
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
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.accent,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.secondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 20,
    color: colors.foreground,
    fontWeight: 'bold',
  },
  scrollView: {
    flex: 1,
  },
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    color: colors.accent,
    marginBottom: 12,
    fontWeight: '600',
  },
  nameInput: {
    backgroundColor: colors.secondary,
    borderRadius: 12,
    padding: 16,
    fontSize: 18,
    color: colors.foreground,
    borderWidth: 2,
    borderColor: colors.border,
  },
  avatarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'center',
  },
  avatarButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
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
    borderWidth: 3,
  },
  avatarEmoji: {
    fontSize: 32,
  },
  avatarCheckmark: {
    position: 'absolute',
    top: -5,
    right: -5,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.success,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.background,
  },
  checkmarkText: {
    color: colors.foreground,
    fontSize: 14,
    fontWeight: 'bold',
  },
  saveButton: {
    backgroundColor: colors.primary,
    margin: 20,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: colors.gold,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  saveButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.primaryForeground,
  },
});

export default SettingsMenu;
