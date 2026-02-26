import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  TextInput,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { colors } from '../theme/colors';
import { GameMode } from './HomeScreen';
import { savePlayerPreferences, loadPlayerPreferences, loadLanguagePreference } from '../utils/storage';
import { RootStackParamList } from '../navigation/types';

type Language = 'he' | 'en';

type PlayerSetupScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'PlayerSetup'>;
type PlayerSetupScreenRouteProp = RouteProp<RootStackParamList, 'PlayerSetup'>;

interface PlayerSetupScreenProps {
  navigation: PlayerSetupScreenNavigationProp;
  route: PlayerSetupScreenRouteProp;
}

// Available avatars
const AVATARS = ['😎', '🤠', '🎩', '👑', '🎭', '🦸', '🧙', '🦊', '🐱', '🐼', '🦁', '🐯'];

const translations = {
  he: {
    title: 'הגדרת שחקן',
    practiceSubtitle: 'משחק אימון',
    privateSubtitle: 'משחק פרטי',
    selectName: 'בחר שם',
    placeholder: 'הכנס שם...',
    selectAvatar: 'בחר אווטאר',
    startGame: 'התחל משחק',
    back: 'חזור',
    defaultName: 'שחקן 1',
  },
  en: {
    title: 'Player Setup',
    practiceSubtitle: 'Practice Game',
    privateSubtitle: 'Private Game',
    selectName: 'Select Name',
    placeholder: 'Enter name...',
    selectAvatar: 'Select Avatar',
    startGame: 'Start Game',
    back: 'Back',
    defaultName: 'Player 1',
  },
};

/**
 * Player setup screen - choose name and avatar
 */
export function PlayerSetupScreen({ navigation, route }: PlayerSetupScreenProps) {
  const { gameMode, numPlayers } = route.params;
  const [playerName, setPlayerName] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState<string>(AVATARS[0]);
  const [language, setLanguage] = useState<Language>('he');

  // Load saved preferences and language on mount
  useEffect(() => {
    loadPlayerPreferences().then(prefs => {
      if (prefs) {
        setPlayerName(prefs.name);
        setSelectedAvatar(prefs.avatar);
      }
    });
    loadLanguagePreference().then(lang => {
      setLanguage(lang);
    });
  }, []);

  const t = translations[language];

  const handleStartGame = async () => {
    const finalName = playerName.trim() || t.defaultName;
    
    // Save preferences for next time
    await savePlayerPreferences(finalName, selectedAvatar);
    
    // For random mode, go to waiting room instead of directly to game
    if (gameMode === 'random') {
      navigation.navigate('WaitingRoom', {
        gameMode: 'random',
        numPlayers,
        playerName: finalName,
        playerAvatar: selectedAvatar,
      });
    } else {
      // For practice and private modes, go directly to game
      navigation.navigate('Game', {
        numPlayers,
        playerName: finalName,
        playerAvatar: selectedAvatar,
        gameMode,
      });
    }
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Title */}
          <View style={styles.titleSection}>
            <Text style={styles.title}>{t.title}</Text>
            <Text style={styles.subtitle}>
              {gameMode === 'practice' ? t.practiceSubtitle : t.privateSubtitle}
            </Text>
          </View>

          {/* Name Input */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t.selectName}</Text>
            <TextInput
              style={styles.nameInput}
              value={playerName}
              onChangeText={setPlayerName}
              placeholder={t.placeholder}
              placeholderTextColor={colors.mutedForeground}
              maxLength={20}
              accessibilityLabel={t.selectName}
              accessibilityHint={t.placeholder}
            />
          </View>

          {/* Avatar Selection */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t.selectAvatar}</Text>
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
                    accessibilityRole="button"
                    accessibilityLabel={`${language === 'he' ? 'אווטאר' : 'Avatar'} ${avatar}`}
                    accessibilityState={{ selected: isSelected }}
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

          {/* Start Button */}
          <TouchableOpacity
            style={styles.startButton}
            onPress={handleStartGame}
            accessibilityRole="button"
            accessibilityLabel={t.startGame}
          >
            <Text style={styles.startButtonText}>{t.startGame}</Text>
          </TouchableOpacity>

          {/* Back Button */}
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            accessibilityRole="button"
            accessibilityLabel={t.back}
          >
            <Text style={styles.backButtonText}>{t.back}</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
    justifyContent: 'center',
  },
  titleSection: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.accent,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    color: colors.foreground,
    opacity: 0.8,
  },
  section: {
    marginBottom: 30,
    width: '100%',
  },
  sectionTitle: {
    fontSize: 18,
    color: colors.accent,
    marginBottom: 16,
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
    width: 70,
    height: 70,
    borderRadius: 35,
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
    fontSize: 36,
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
  startButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 60,
    paddingVertical: 16,
    borderRadius: 12,
    shadowColor: colors.gold,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
    minWidth: 200,
    alignSelf: 'center',
    marginTop: 20,
  },
  startButtonText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.primaryForeground,
    textAlign: 'center',
  },
  backButton: {
    marginTop: 16,
    alignSelf: 'center',
  },
  backButtonText: {
    fontSize: 16,
    color: colors.mutedForeground,
    textDecorationLine: 'underline',
  },
});

export default PlayerSetupScreen;
