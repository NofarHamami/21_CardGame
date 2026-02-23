import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Animated,
  Dimensions,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MIN_PLAYERS, MAX_PLAYERS } from '../constants';
import { colors } from '../theme/colors';
import { loadPlayerPreferences, loadLanguagePreference, saveLanguagePreference } from '../utils/storage';
import { loadSavedGame, clearSavedGame, SavedGame } from '../utils/gameSave';
import { Tutorial } from '../components/Tutorial';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type RootStackParamList = {
  Home: undefined;
  PlayerSetup: { gameMode: 'practice' | 'private' | 'random'; numPlayers: number };
  Game: { numPlayers: number; playerName?: string; playerAvatar?: string; gameMode?: 'practice' | 'private' | 'random'; resumeState?: string };
  Scoreboard: { players: Array<{ name: string; avatar?: string; score: number }> };
  WaitingRoom: { gameMode: 'random'; numPlayers: number; playerName: string; playerAvatar: string };
  Stats: undefined;
};

type HomeScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Home'>;

interface HomeScreenProps {
  navigation: HomeScreenNavigationProp;
}

export type GameMode = 'practice' | 'private' | 'random';

type Language = 'he' | 'en';

const translations = {
  he: {
    subtitle: 'משחק קלפים',
    tagline: 'משחק קלפים 21',
    gameModeTitle: 'בחירת משחק',
    practiceMode: 'משחק אימון',
    practiceSubtext: 'נגד מחשב',
    privateMode: 'משחק פרטי',
    privateSubtext: 'מול חברים',
    randomMode: 'משחק רנדומלי',
    randomSubtext: 'משתתפים קיימים',
    playersTitle: 'מספר משתתפים',
    rulesTitle: 'חוקים',
    rule1: '• בנה ערימות מרכזיות מA עד Q',
    rule2: `• מלך הוא ג'וקר`,
    rule3: '• הראשון שמסיים את ערימת ה-21 שלו מנצח!',
    startButton: 'התחל משחק',
    resumeButton: 'המשך משחק',
    stats: 'סטטיסטיקות',
    howToPlay: 'איך משחקים?',
  },
  en: {
    subtitle: 'Card Game',
    tagline: '21 Card Game',
    gameModeTitle: 'Game Mode',
    practiceMode: 'Practice',
    practiceSubtext: 'vs Computer',
    privateMode: 'Private',
    privateSubtext: 'with Friends',
    randomMode: 'Random',
    randomSubtext: 'Existing Players',
    playersTitle: 'Number of Players',
    rulesTitle: 'Rules',
    rule1: '• Build center piles from Ace to Queen',
    rule2: '• Kings are wild cards',
    rule3: '• First to empty your 21-pile wins!',
    startButton: 'Start Game',
    resumeButton: 'Resume Game',
    stats: 'Statistics',
    howToPlay: 'How to Play',
  },
};

export function HomeScreen({ navigation }: HomeScreenProps) {
  const [selectedPlayers, setSelectedPlayers] = useState(2);
  const [selectedGameMode, setSelectedGameMode] = useState<GameMode>('practice');
  const [savedPreferences, setSavedPreferences] = useState<{ name: string; avatar: string } | null>(null);
  const [language, setLanguage] = useState<Language>('he');
  const [savedGame, setSavedGame] = useState<SavedGame | null>(null);
  const [tutorialVisible, setTutorialVisible] = useState(false);
  const fadeAnim = useState(new Animated.Value(0))[0];
  const slideAnim = useState(new Animated.Value(50))[0];

  useEffect(() => {
    loadPlayerPreferences().then(prefs => {
      if (prefs) setSavedPreferences(prefs);
    });
    loadLanguagePreference().then(lang => setLanguage(lang));
    loadSavedGame().then(saved => setSavedGame(saved));

    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 800, useNativeDriver: true }),
    ]).start();
  }, []);

  // Refresh saved game when screen gets focus
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadSavedGame().then(saved => setSavedGame(saved));
    });
    return unsubscribe;
  }, [navigation]);

  const toggleLanguage = async () => {
    const newLanguage = language === 'he' ? 'en' : 'he';
    setLanguage(newLanguage);
    await saveLanguagePreference(newLanguage);
  };

  const t = translations[language];

  const handleGameModeSelect = (mode: GameMode) => {
    setSelectedGameMode(mode);
  };

  const handleResumeGame = () => {
    if (!savedGame) return;
    navigation.navigate('Game', {
      numPlayers: savedGame.state.players.length,
      gameMode: savedGame.gameMode,
      resumeState: JSON.stringify(savedGame.state),
    });
  };

  const handleStartGame = () => {
    // Clear any saved game when starting new
    clearSavedGame();
    setSavedGame(null);

    if (savedPreferences) {
      if (selectedGameMode === 'random') {
        navigation.navigate('WaitingRoom', {
          gameMode: 'random',
          numPlayers: selectedPlayers,
          playerName: savedPreferences.name,
          playerAvatar: savedPreferences.avatar,
        });
      } else {
        navigation.navigate('Game', {
          numPlayers: selectedPlayers,
          playerName: savedPreferences.name,
          playerAvatar: savedPreferences.avatar,
          gameMode: selectedGameMode,
        });
      }
    } else {
      navigation.navigate('PlayerSetup', {
        gameMode: selectedGameMode,
        numPlayers: selectedPlayers,
      });
    }
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {/* Language toggle */}
        <TouchableOpacity
          style={styles.languageButton}
          onPress={toggleLanguage}
          accessibilityLabel={language === 'he' ? 'Switch to English' : 'Switch to Hebrew'}
        >
          <Text style={styles.languageButtonText}>{language === 'he' ? 'EN' : 'עב'}</Text>
        </TouchableOpacity>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <Animated.View
            style={[styles.contentWrapper, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}
          >
            {/* Logo */}
            <View style={styles.logoContainer}>
              <Image
                source={language === 'en'
                  ? require('../../assets/logo-en.png')
                  : require('../../assets/logo-main.png')}
                style={styles.logo}
                resizeMode="contain"
                accessibilityLabel={language === 'en' ? '21 Card Game logo' : 'לוגו משחק קלפים 21'}
              />
            </View>

            {/* Game Mode */}
            <Text style={styles.sectionTitle}>{t.gameModeTitle}</Text>
            <View style={[styles.gameModeButtons, language === 'he' && styles.gameModeButtonsRTL]}>
              {(language === 'he' ? ['random', 'private', 'practice'] as GameMode[] : ['practice', 'private', 'random'] as GameMode[]).map((mode) => (
                <TouchableOpacity
                  key={mode}
                  style={[styles.gameModeButton, selectedGameMode === mode && styles.gameModeButtonSelected]}
                  onPress={() => handleGameModeSelect(mode)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.gameModeButtonText, selectedGameMode === mode && styles.gameModeButtonTextSelected]}>
                    {mode === 'practice' ? t.practiceMode : mode === 'private' ? t.privateMode : t.randomMode}
                  </Text>
                  <Text style={[styles.gameModeSubtext, selectedGameMode === mode && styles.gameModeSubtextSelected]}>
                    {mode === 'practice' ? t.practiceSubtext : mode === 'private' ? t.privateSubtext : t.randomSubtext}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Number of Players */}
            <Text style={styles.sectionTitle}>{t.playersTitle}</Text>
            <View style={styles.playerButtons}>
              {Array.from({ length: MAX_PLAYERS - MIN_PLAYERS + 1 }).map((_, i) => {
                const numPlayers = MIN_PLAYERS + i;
                const isSelected = selectedPlayers === numPlayers;
                return (
                  <TouchableOpacity
                    key={numPlayers}
                    style={[styles.playerButton, isSelected && styles.playerButtonSelected]}
                    onPress={() => setSelectedPlayers(numPlayers)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.playerButtonText, isSelected && styles.playerButtonTextSelected]}>
                      {numPlayers}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Rules */}
            <View style={styles.rulesSection}>
              <Text style={styles.rulesTitle}>{t.rulesTitle}</Text>
              <View style={styles.rulesList}>
                {[t.rule1, t.rule2, t.rule3].map((rule, idx) => (
                  <View key={idx} style={[styles.ruleItem, language === 'he' && styles.ruleItemRtl]}>
                    <Text style={styles.ruleBullet}>•</Text>
                    <Text style={[styles.ruleText, language === 'he' && styles.ruleTextRtl]}>{rule.replace('• ', '')}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Resume Game Button */}
            {savedGame && (
              <TouchableOpacity style={styles.resumeButton} onPress={handleResumeGame} activeOpacity={0.9}>
                <Text style={styles.resumeButtonText}>{t.resumeButton}</Text>
              </TouchableOpacity>
            )}

            {/* Start Game Button */}
            <TouchableOpacity style={styles.startButton} onPress={handleStartGame} activeOpacity={0.9}>
              <LinearGradient
                colors={[colors.primary, colors.accent]}
                style={styles.startButtonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Text style={styles.startButtonText}>{t.startButton}</Text>
              </LinearGradient>
            </TouchableOpacity>

            {/* Bottom links */}
            <View style={styles.bottomLinks}>
              <TouchableOpacity
                style={styles.linkButton}
                onPress={() => setTutorialVisible(true)}
                accessibilityRole="button"
                accessibilityLabel={t.howToPlay}
              >
                <Text style={styles.linkText}>{t.howToPlay}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.linkButton}
                onPress={() => navigation.navigate('Stats' as never)}
                accessibilityRole="button"
                accessibilityLabel={t.stats}
              >
                <Text style={styles.linkText}>{t.stats}</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </ScrollView>
      </SafeAreaView>

      {/* Tutorial overlay */}
      <Tutorial visible={tutorialVisible} onClose={() => setTutorialVisible(false)} language={language} />
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
    padding: 32,
    paddingTop: 80,
    paddingBottom: 40,
    alignItems: 'center',
  },
  contentWrapper: {
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  logoContainer: {
    marginBottom: 24,
    width: 250,
    height: 250,
    borderRadius: 125,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0d5a2e',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 30,
    elevation: 20,
  },
  logo: {
    width: 340,
    height: 340,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.primary,
    marginBottom: 16,
  },
  gameModeButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 32,
    width: '100%',
  },
  gameModeButtonsRTL: {
    flexDirection: 'row',
  },
  gameModeButton: {
    flex: 1,
    minWidth: 100,
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 90,
  },
  gameModeButtonSelected: {
    backgroundColor: colors.secondary,
    borderWidth: 2,
    borderColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  gameModeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.foreground,
    marginBottom: 4,
  },
  gameModeButtonTextSelected: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.foreground,
    marginBottom: 4,
  },
  gameModeSubtext: {
    fontSize: 12,
    color: colors.mutedForeground,
  },
  gameModeSubtextSelected: {
    fontSize: 12,
    color: colors.mutedForeground,
  },
  playerButtons: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 32,
  },
  playerButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.secondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playerButtonSelected: {
    backgroundColor: colors.primary,
    borderWidth: 2,
    borderColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  playerButtonText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.foreground,
  },
  playerButtonTextSelected: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.primaryForeground,
  },
  rulesSection: {
    width: '100%',
    backgroundColor: colors.secondary,
    opacity: 0.8,
    borderRadius: 12,
    padding: 20,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: colors.border,
  },
  rulesTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.primary,
    marginBottom: 12,
    textAlign: 'center',
  },
  rulesList: {
    gap: 8,
  },
  ruleItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  ruleItemRtl: {
    flexDirection: 'row-reverse',
  },
  ruleBullet: {
    fontSize: 14,
    color: colors.primary,
    marginTop: 2,
  },
  ruleText: {
    flex: 1,
    fontSize: 14,
    color: colors.foreground,
    lineHeight: 20,
  },
  ruleTextRtl: {
    textAlign: 'right',
  },
  resumeButton: {
    width: '100%',
    maxWidth: SCREEN_WIDTH - 100,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: colors.secondary,
    borderWidth: 2,
    borderColor: colors.gold,
    paddingHorizontal: 60,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  resumeButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.gold,
  },
  startButton: {
    width: '100%',
    maxWidth: SCREEN_WIDTH - 100,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    marginBottom: 24,
  },
  startButtonGradient: {
    paddingHorizontal: 60,
    paddingVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 56,
  },
  startButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.primaryForeground,
  },
  bottomLinks: {
    flexDirection: 'row',
    gap: 24,
    marginTop: 8,
  },
  linkButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  linkText: {
    color: colors.mutedForeground,
    fontSize: 14,
    textDecorationLine: 'underline',
  },
  languageButton: {
    position: 'absolute',
    left: 20,
    top: 20,
    zIndex: 1000,
    backgroundColor: colors.secondary,
    borderRadius: 25,
    width: 56,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  languageButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.foreground,
  },
});

export default HomeScreen;
