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

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type RootStackParamList = {
  Home: undefined;
  PlayerSetup: { gameMode: 'practice' | 'private' | 'random'; numPlayers: number };
  Game: { numPlayers: number; playerName?: string; playerAvatar?: string; gameMode?: 'practice' | 'private' | 'random' };
  Scoreboard: { players: Array<{ name: string; avatar?: string; score: number }> };
  WaitingRoom: { gameMode: 'random'; numPlayers: number; playerName: string; playerAvatar: string };
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
  },
};

/**
 * Home screen with classic card game styling
 */
export function HomeScreen({ navigation }: HomeScreenProps) {
  const [selectedPlayers, setSelectedPlayers] = useState(2);
  const [selectedGameMode, setSelectedGameMode] = useState<GameMode>('practice');
  const [savedPreferences, setSavedPreferences] = useState<{ name: string; avatar: string } | null>(null);
  const [language, setLanguage] = useState<Language>('he');
  const fadeAnim = useState(new Animated.Value(0))[0];
  const slideAnim = useState(new Animated.Value(50))[0];

  // Load saved preferences on mount
  useEffect(() => {
    loadPlayerPreferences().then(prefs => {
      if (prefs) {
        setSavedPreferences(prefs);
      }
    });
    loadLanguagePreference().then(lang => {
      setLanguage(lang);
    });

    // Animate entrance
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const toggleLanguage = async () => {
    const newLanguage = language === 'he' ? 'en' : 'he';
    setLanguage(newLanguage);
    await saveLanguagePreference(newLanguage);
  };

  const t = translations[language];

  const handleGameModeSelect = (mode: GameMode) => {
    setSelectedGameMode(mode);
  };

  const handleStartGame = () => {
    // If we have saved preferences, skip PlayerSetup and go directly to game/waiting room
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
      // No saved preferences - go to PlayerSetup
      console.log('Navigating to PlayerSetup with:', { gameMode: selectedGameMode, numPlayers: selectedPlayers });
      navigation.navigate('PlayerSetup', { 
        gameMode: selectedGameMode, 
        numPlayers: selectedPlayers 
      });
    }
  };

  return (
    <View style={styles.container}>
      {/* Background decorative blur elements */}
      <View style={styles.backgroundDecorations}>
        <View style={[styles.blurCircle, styles.blurCircle1]} />
        <View style={[styles.blurCircle, styles.blurCircle2]} />
        <View style={[styles.blurCircle, styles.blurCircle3]} />
      </View>

      <SafeAreaView style={styles.safeArea}>
        {/* Language toggle button */}
        <TouchableOpacity 
          style={styles.languageButton}
          onPress={toggleLanguage}
          accessibilityLabel={language === 'he' ? 'Switch to English' : 'עבור לעברית'}
        >
          <Text style={styles.languageButtonText}>{language === 'he' ? 'EN' : 'עב'}</Text>
        </TouchableOpacity>
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View
            style={[
              styles.contentWrapper,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            {/* Logo */}
            <View style={styles.logoContainer}>
              <Image 
                source={require('../../assets/logo-21.png')}
                style={styles.logo}
                resizeMode="contain"
              />
            </View>

            {/* Title */}
            <Text style={styles.title}>{t.subtitle}</Text>
            <Text style={styles.tagline}>{t.tagline}</Text>

            {/* Card illustration */}
            <View style={styles.cardIllustration}>
              {/* Ace of Spades */}
              <View style={[styles.simpleCard, styles.cardLeft]}>
                <Text style={styles.cardRank}>A</Text>
                <View style={styles.cardSuitContainer}>
                  <Text style={styles.cardSuit}>♠</Text>
                </View>
              </View>
              {/* Ace of Hearts */}
              <View style={[styles.simpleCard, styles.cardRight]}>
                <Text style={[styles.cardRank, styles.cardRankRed]}>A</Text>
                <View style={styles.cardSuitContainer}>
                  <Text style={[styles.cardSuit, styles.cardSuitRed]}>♥</Text>
                </View>
              </View>
            </View>

            {/* Game Mode Section */}
            <Text style={styles.sectionTitle}>{t.gameModeTitle}</Text>
            <View style={styles.gameModeButtons}>
              {(['practice', 'private', 'random'] as GameMode[]).map((mode) => (
                <TouchableOpacity
                  key={mode}
                  style={[
                    styles.gameModeButton,
                    selectedGameMode === mode && styles.gameModeButtonSelected,
                  ]}
                  onPress={() => handleGameModeSelect(mode)}
                  activeOpacity={0.7}
                >
                  <Text style={[
                    styles.gameModeButtonText,
                    selectedGameMode === mode && styles.gameModeButtonTextSelected,
                  ]}>
                    {mode === 'practice' ? t.practiceMode : mode === 'private' ? t.privateMode : t.randomMode}
                  </Text>
                  <Text style={[
                    styles.gameModeSubtext,
                    selectedGameMode === mode && styles.gameModeSubtextSelected,
                  ]}>
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
                    style={[
                      styles.playerButton,
                      isSelected && styles.playerButtonSelected,
                    ]}
                    onPress={() => setSelectedPlayers(numPlayers)}
                    activeOpacity={0.7}
                  >
                    <Text style={[
                      styles.playerButtonText,
                      isSelected && styles.playerButtonTextSelected,
                    ]}>
                      {numPlayers}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Rules Section */}
            <View style={styles.rulesSection}>
              <Text style={styles.rulesTitle}>{t.rulesTitle}</Text>
              <View style={styles.rulesList}>
                <View style={styles.ruleItem}>
                  <Text style={styles.ruleBullet}>•</Text>
                  <Text style={styles.ruleText}>{t.rule1.replace('• ', '')}</Text>
                </View>
                <View style={styles.ruleItem}>
                  <Text style={styles.ruleBullet}>•</Text>
                  <Text style={styles.ruleText}>{t.rule2.replace('• ', '')}</Text>
                </View>
                <View style={styles.ruleItem}>
                  <Text style={styles.ruleBullet}>•</Text>
                  <Text style={styles.ruleText}>{t.rule3.replace('• ', '')}</Text>
                </View>
              </View>
            </View>

            {/* Start Game Button */}
            <TouchableOpacity 
              style={styles.startButton}
              onPress={handleStartGame}
              activeOpacity={0.9}
            >
              <LinearGradient
                colors={[colors.primary, colors.accent]}
                style={styles.startButtonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Text style={styles.startButtonText}>{t.startButton}</Text>
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
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
  backgroundDecorations: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
  },
  blurCircle: {
    position: 'absolute',
    borderRadius: 9999,
    backgroundColor: colors.primary,
    opacity: 0.05,
  },
  blurCircle1: {
    width: 128,
    height: 128,
    top: 40,
    left: 40,
  },
  blurCircle2: {
    width: 192,
    height: 192,
    bottom: 80,
    right: 80,
  },
  blurCircle3: {
    width: 96,
    height: 96,
    top: '33%',
    right: 40,
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
    marginBottom: 16,
  },
  logo: {
    width: 160,
    height: 160,
  },
  title: {
    fontSize: 30,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  tagline: {
    fontSize: 14,
    color: colors.mutedForeground,
    marginBottom: 32,
  },
  cardIllustration: {
    position: 'relative',
    height: 112,
    width: 160,
    marginBottom: 32,
  },
  simpleCard: {
    position: 'absolute',
    width: 80,
    height: 112,
    backgroundColor: colors.card,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  cardLeft: {
    left: 16,
    top: 0,
    transform: [{ rotate: '-12deg' }],
  },
  cardRight: {
    right: 16,
    top: 0,
    transform: [{ rotate: '12deg' }],
  },
  cardRank: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.cardForeground,
  },
  cardRankRed: {
    color: colors.cardRed,
  },
  cardSuitContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardSuit: {
    fontSize: 30,
    color: colors.cardForeground,
  },
  cardSuitRed: {
    color: colors.cardRed,
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
