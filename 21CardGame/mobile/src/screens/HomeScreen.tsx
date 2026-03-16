import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Animated,
  Image,
  Switch,
  TextInput,
  useWindowDimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MIN_PLAYERS, MAX_PLAYERS } from '../constants';
import { colors } from '../theme/colors';
import { loadPlayerPreferences, loadLanguagePreference, saveLanguagePreference, loadAIDifficulty, saveAIDifficulty, AIDifficulty, isFirstLaunch, markFirstLaunchDone, loadTutorialDismissed, saveTutorialDismissed } from '../utils/storage';
import { loadSavedGame, clearSavedGame, SavedGame } from '../utils/gameSave';
import { Tutorial } from '../components/Tutorial';
import { RootStackParamList, GameMode } from '../navigation/types';

export type { GameMode };

type HomeScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Home'>;

interface HomeScreenProps {
  navigation: HomeScreenNavigationProp;
}

type Language = 'he' | 'en';
type Step = 'selectMode' | 'configure';
type PrivateAction = 'create' | 'join' | null;

const translations = {
  he: {
    subtitle: 'משחק קלפים',
    tagline: 'משחק קלפים 21',
    gameModeTitle: 'בחירת סוג משחק',
    practiceMode: 'משחק אימון',
    practiceSubtext: 'נגד מחשב',
    privateMode: 'חדר פרטי',
    privateSubtext: 'מול חברים',
    randomMode: 'משחק רנדומלי',
    randomSubtext: 'שיבוץ אוטומטי',
    playersTitle: 'מספר משתתפים',
    startButton: 'התחל משחק',
    findGame: 'מצא משחק',
    resumeButton: 'המשך משחק',
    stats: 'סטטיסטיקות',
    howToPlay: 'איך משחקים?',
    difficultyTitle: 'רמת קושי',
    difficultyEasy: 'קל',
    difficultyMedium: 'בינוני',
    difficultyHard: 'קשה',
    timedMode: 'מצב זמן',
    timedOn: 'פעיל',
    timedOff: 'כבוי',
    back: 'חזור',
    createRoom: 'צור חדר',
    createRoomDesc: 'בחר מספר משתתפים וצור קוד',
    joinRoom: 'הצטרף לחדר',
    joinRoomDesc: 'הכנס קוד שקיבלת מחבר',
    enterCode: 'הכנס קוד חדר',
    or: 'או',
    joinButton: 'הצטרף',
  },
  en: {
    subtitle: 'Card Game',
    tagline: '21 Card Game',
    gameModeTitle: 'Select Game Type',
    practiceMode: 'Training',
    practiceSubtext: 'vs Computer',
    privateMode: 'Private Room',
    privateSubtext: 'with Friends',
    randomMode: 'Random',
    randomSubtext: 'Auto Matchmaking',
    playersTitle: 'Number of Players',
    startButton: 'Start Game',
    findGame: 'Find Game',
    resumeButton: 'Resume Game',
    stats: 'Statistics',
    howToPlay: 'How to Play',
    difficultyTitle: 'AI Difficulty',
    difficultyEasy: 'Easy',
    difficultyMedium: 'Medium',
    difficultyHard: 'Hard',
    timedMode: 'Timed Mode',
    timedOn: 'On',
    timedOff: 'Off',
    back: 'Back',
    createRoom: 'Create Room',
    createRoomDesc: 'Select participants and generate a code',
    joinRoom: 'Join Room',
    joinRoomDesc: 'Enter a code you received from a friend',
    enterCode: 'Enter room code',
    or: 'or',
    joinButton: 'Join',
  },
};

export function HomeScreen({ navigation }: HomeScreenProps) {
  const { width: screenWidth } = useWindowDimensions();
  const [step, setStep] = useState<Step>('selectMode');
  const [selectedGameMode, setSelectedGameMode] = useState<GameMode | null>(null);
  const [privateAction, setPrivateAction] = useState<PrivateAction>(null);
  const [selectedPlayers, setSelectedPlayers] = useState(2);
  const [savedPreferences, setSavedPreferences] = useState<{ name: string; avatar: string } | null>(null);
  const [language, setLanguage] = useState<Language>('he');
  const [savedGame, setSavedGame] = useState<SavedGame | null>(null);
  const [tutorialVisible, setTutorialVisible] = useState(false);
  const [aiDifficulty, setAiDifficulty] = useState<AIDifficulty>('medium');
  const [timedMode, setTimedMode] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const fadeAnim = useState(new Animated.Value(0))[0];
  const slideAnim = useState(new Animated.Value(50))[0];

  useEffect(() => {
    loadPlayerPreferences().then(prefs => {
      if (prefs) setSavedPreferences(prefs);
    });
    loadLanguagePreference().then(lang => setLanguage(lang));
    loadSavedGame().then(saved => setSavedGame(saved));
    loadAIDifficulty().then(d => setAiDifficulty(d));
    isFirstLaunch().then(first => {
      if (first) {
        loadTutorialDismissed().then(dismissed => {
          if (!dismissed) {
            setTutorialVisible(true);
          }
        });
        markFirstLaunchDone();
      }
    });

    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 800, useNativeDriver: true }),
    ]).start();
  }, []);

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

  const handleDifficultySelect = async (difficulty: AIDifficulty) => {
    setAiDifficulty(difficulty);
    await saveAIDifficulty(difficulty);
  };

  const handleGameModeSelect = (mode: GameMode) => {
    setSelectedGameMode(mode);
    setPrivateAction(null);
    setJoinCode('');
    setStep('configure');
  };

  const handleBack = () => {
    if (selectedGameMode === 'private' && privateAction) {
      setPrivateAction(null);
      setJoinCode('');
    } else {
      setStep('selectMode');
      setSelectedGameMode(null);
      setPrivateAction(null);
      setJoinCode('');
    }
  };

  const handleResumeGame = () => {
    if (!savedGame) return;
    navigation.navigate('Game', {
      numPlayers: savedGame.state.players.length,
      gameMode: savedGame.gameMode,
      resumeState: JSON.stringify(savedGame.state),
    });
  };

  const navigateToGame = (mode: GameMode) => {
    clearSavedGame();
    setSavedGame(null);

    if (savedPreferences) {
      if (mode === 'practice') {
        navigation.navigate('Game', {
          numPlayers: selectedPlayers,
          playerName: savedPreferences.name,
          playerAvatar: savedPreferences.avatar,
          gameMode: mode,
          aiDifficulty,
          timedMode,
        });
      } else if (mode === 'random') {
        navigation.navigate('WaitingRoom', {
          gameMode: 'random',
          numPlayers: selectedPlayers,
          playerName: savedPreferences.name,
          playerAvatar: savedPreferences.avatar,
          timedMode,
        });
      } else if (mode === 'private' && privateAction === 'create') {
        navigation.navigate('WaitingRoom', {
          gameMode: 'private',
          numPlayers: selectedPlayers,
          playerName: savedPreferences.name,
          playerAvatar: savedPreferences.avatar,
          privateAction: 'create',
        });
      } else if (mode === 'private' && privateAction === 'join') {
        navigation.navigate('WaitingRoom', {
          gameMode: 'private',
          numPlayers: 2,
          playerName: savedPreferences.name,
          playerAvatar: savedPreferences.avatar,
          privateAction: 'join',
          joinCode: joinCode.toUpperCase(),
        });
      }
    } else {
      navigation.navigate('PlayerSetup', {
        gameMode: mode,
        numPlayers: selectedPlayers,
      });
    }
  };

  const handleStartGame = () => {
    if (!selectedGameMode) return;
    navigateToGame(selectedGameMode);
  };

  const gameModes: { mode: GameMode; emoji: string }[] = [
    { mode: 'practice', emoji: '🎯' },
    { mode: 'private', emoji: '🔒' },
    { mode: 'random', emoji: '🎲' },
  ];

  const getModeTitle = (mode: GameMode) =>
    mode === 'practice' ? t.practiceMode : mode === 'private' ? t.privateMode : t.randomMode;

  const getModeSubtext = (mode: GameMode) =>
    mode === 'practice' ? t.practiceSubtext : mode === 'private' ? t.privateSubtext : t.randomSubtext;

  const renderPlayerSelector = () => (
    <>
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
              accessibilityRole="button"
              accessibilityLabel={`${numPlayers} ${language === 'he' ? 'שחקנים' : 'players'}`}
              accessibilityState={{ selected: isSelected }}
            >
              <Text style={[styles.playerButtonText, isSelected && styles.playerButtonTextSelected]}>
                {numPlayers}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </>
  );

  const renderActionButton = (label: string, onPress: () => void, disabled?: boolean) => (
    <TouchableOpacity
      style={[styles.actionButton, { maxWidth: screenWidth - 100 }, disabled && styles.actionButtonDisabled]}
      onPress={onPress}
      activeOpacity={0.9}
      disabled={disabled}
    >
      <LinearGradient
        colors={[colors.primary, colors.accent]}
        style={styles.actionButtonGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      >
        <Text style={styles.actionButtonText}>{label}</Text>
      </LinearGradient>
    </TouchableOpacity>
  );

  // ─── STEP 1: Select game type ───
  const renderSelectMode = () => (
    <>
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

      <Text style={styles.sectionTitle}>{t.gameModeTitle}</Text>

      <View style={styles.modeCardsContainer}>
        {gameModes.map(({ mode, emoji }) => (
          <TouchableOpacity
            key={mode}
            style={styles.modeCard}
            onPress={() => handleGameModeSelect(mode)}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel={getModeTitle(mode)}
          >
            <Text style={styles.modeCardEmoji}>{emoji}</Text>
            <View style={styles.modeCardTextContainer}>
              <Text style={styles.modeCardTitle}>{getModeTitle(mode)}</Text>
              <Text style={styles.modeCardSubtext}>{getModeSubtext(mode)}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>

      {savedGame && (
        <TouchableOpacity
          style={[styles.resumeButton, { maxWidth: screenWidth - 100 }]}
          onPress={handleResumeGame}
          activeOpacity={0.9}
        >
          <Text style={styles.resumeButtonText}>{t.resumeButton}</Text>
        </TouchableOpacity>
      )}

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
    </>
  );

  // ─── STEP 2: Configure (Training) ───
  const renderPracticeConfigure = () => (
    <>
      {renderPlayerSelector()}

      <Text style={styles.sectionTitle}>{t.difficultyTitle}</Text>
      <View style={[styles.playerButtons, language === 'he' && { flexDirection: 'row-reverse' }]}>
        {(['easy', 'medium', 'hard'] as AIDifficulty[]).map((d) => {
          const isSelected = aiDifficulty === d;
          const label = d === 'easy' ? t.difficultyEasy : d === 'medium' ? t.difficultyMedium : t.difficultyHard;
          return (
            <TouchableOpacity
              key={d}
              style={[styles.difficultyButton, isSelected && styles.difficultyButtonSelected]}
              onPress={() => handleDifficultySelect(d)}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={label}
              accessibilityState={{ selected: isSelected }}
            >
              <Text style={[styles.difficultyButtonText, isSelected && styles.difficultyButtonTextSelected]}>
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.timedModeRow}>
        <View>
          <Text style={styles.sectionTitle}>{t.timedMode}</Text>
          <Text style={styles.timedModeDesc}>
            {language === 'he' ? '30 שניות לכל תור' : '30 seconds per turn'}
          </Text>
        </View>
        <Switch
          value={timedMode}
          onValueChange={setTimedMode}
          trackColor={{ false: colors.border, true: colors.success }}
          thumbColor="#ffffff"
          ios_backgroundColor={colors.border}
          accessibilityLabel={t.timedMode}
        />
      </View>

      {renderActionButton(t.startButton, handleStartGame)}
    </>
  );

  // ─── STEP 2: Configure (Random) ───
  const renderRandomConfigure = () => (
    <>
      {renderPlayerSelector()}

      <View style={styles.timedModeRow}>
        <View>
          <Text style={styles.sectionTitle}>{t.timedMode}</Text>
          <Text style={styles.timedModeDesc}>
            {language === 'he' ? '30 שניות לכל תור' : '30 seconds per turn'}
          </Text>
        </View>
        <Switch
          value={timedMode}
          onValueChange={setTimedMode}
          trackColor={{ false: colors.border, true: colors.success }}
          thumbColor="#ffffff"
          ios_backgroundColor={colors.border}
          accessibilityLabel={t.timedMode}
        />
      </View>

      {renderActionButton(t.findGame, handleStartGame)}
    </>
  );

  // ─── STEP 2: Configure (Private - choose action) ───
  const renderPrivateChoose = () => (
    <>
      <TouchableOpacity style={styles.privateChoiceCard} onPress={() => setPrivateAction('create')} activeOpacity={0.8}>
        <Text style={styles.privateChoiceEmoji}>🏠</Text>
        <View style={styles.privateChoiceTextContainer}>
          <Text style={styles.privateChoiceTitle}>{t.createRoom}</Text>
          <Text style={styles.privateChoiceDesc}>{t.createRoomDesc}</Text>
        </View>
      </TouchableOpacity>

      <Text style={styles.orText}>— {t.or} —</Text>

      <TouchableOpacity style={styles.privateChoiceCard} onPress={() => setPrivateAction('join')} activeOpacity={0.8}>
        <Text style={styles.privateChoiceEmoji}>🔗</Text>
        <View style={styles.privateChoiceTextContainer}>
          <Text style={styles.privateChoiceTitle}>{t.joinRoom}</Text>
          <Text style={styles.privateChoiceDesc}>{t.joinRoomDesc}</Text>
        </View>
      </TouchableOpacity>
    </>
  );

  // ─── STEP 2: Configure (Private - Create Room) ───
  const renderPrivateCreate = () => (
    <>
      {renderPlayerSelector()}
      {renderActionButton(t.createRoom, handleStartGame)}
    </>
  );

  // ─── STEP 2: Configure (Private - Join Room) ───
  const renderPrivateJoin = () => (
    <>
      <Text style={styles.sectionTitle}>{t.enterCode}</Text>
      <View style={styles.joinRow}>
        <TextInput
          style={styles.joinInput}
          value={joinCode}
          onChangeText={setJoinCode}
          placeholder="ABC123"
          placeholderTextColor={colors.mutedForeground}
          autoCapitalize="characters"
          maxLength={6}
          autoFocus
          accessibilityLabel={t.enterCode}
        />
      </View>
      {renderActionButton(t.joinButton, handleStartGame, joinCode.length < 4)}
    </>
  );

  // ─── STEP 2: Configure (Private - routing) ───
  const renderPrivateConfigure = () => {
    if (!privateAction) return renderPrivateChoose();
    if (privateAction === 'create') return renderPrivateCreate();
    return renderPrivateJoin();
  };

  const renderConfigureStep = () => {
    const configTitle = privateAction === 'create'
      ? t.createRoom
      : privateAction === 'join'
        ? t.joinRoom
        : getModeTitle(selectedGameMode!);

    return (
      <>
        <View style={styles.configHeader}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleBack}
            accessibilityRole="button"
            accessibilityLabel={t.back}
          >
            <Text style={styles.backButtonText}>
              {language === 'he' ? '→' : '←'} {t.back}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.logoContainerSmall}>
          <Image
            source={language === 'en'
              ? require('../../assets/logo-en.png')
              : require('../../assets/logo-main.png')}
            style={styles.logoSmall}
            resizeMode="contain"
            accessibilityLabel={language === 'en' ? '21 Card Game logo' : 'לוגו משחק קלפים 21'}
          />
        </View>

        <Text style={styles.configTitle}>{configTitle}</Text>

        {selectedGameMode === 'practice' && renderPracticeConfigure()}
        {selectedGameMode === 'random' && renderRandomConfigure()}
        {selectedGameMode === 'private' && renderPrivateConfigure()}
      </>
    );
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
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
            {step === 'selectMode' ? renderSelectMode() : renderConfigureStep()}
          </Animated.View>
        </ScrollView>
      </SafeAreaView>

      <Tutorial
        visible={tutorialVisible}
        onClose={() => setTutorialVisible(false)}
        language={language}
        onDontShowAgain={(dismissed) => saveTutorialDismissed(dismissed)}
      />
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

  // ─── Logo ───
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
  logoContainerSmall: {
    marginBottom: 16,
    width: 120,
    height: 120,
    borderRadius: 60,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0d5a2e',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
    elevation: 12,
  },
  logoSmall: {
    width: 160,
    height: 160,
  },

  // ─── Section titles ───
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.primary,
    marginBottom: 16,
  },
  configTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.accent,
    marginBottom: 24,
    textAlign: 'center',
  },

  // ─── Step 1: Game mode cards ───
  modeCardsContainer: {
    width: '100%',
    gap: 12,
    marginBottom: 24,
  },
  modeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.secondary,
    borderRadius: 16,
    paddingVertical: 20,
    paddingHorizontal: 24,
    borderWidth: 2,
    borderColor: colors.border,
  },
  modeCardEmoji: {
    fontSize: 32,
    marginRight: 16,
  },
  modeCardTextContainer: {
    flex: 1,
  },
  modeCardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.foreground,
    marginBottom: 2,
  },
  modeCardSubtext: {
    fontSize: 13,
    color: colors.mutedForeground,
  },

  // ─── Step 2: Config header ───
  configHeader: {
    width: '100%',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  backButton: {
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
  },

  // ─── Player selector ───
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

  // ─── Difficulty ───
  difficultyButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: colors.secondary,
    minWidth: 80,
    alignItems: 'center',
  },
  difficultyButtonSelected: {
    backgroundColor: colors.primary,
    borderWidth: 2,
    borderColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  difficultyButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.foreground,
  },
  difficultyButtonTextSelected: {
    color: colors.primaryForeground,
  },

  // ─── Timed mode ───
  timedModeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
    width: '100%',
  },
  timedModeDesc: {
    fontSize: 12,
    color: colors.mutedForeground,
    marginTop: -12,
    marginBottom: 4,
  },

  // ─── Private: Create / Join choice ───
  privateChoiceCard: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.secondary,
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
    borderColor: colors.border,
  },
  privateChoiceEmoji: {
    fontSize: 32,
    marginRight: 16,
  },
  privateChoiceTextContainer: {
    flex: 1,
  },
  privateChoiceTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.foreground,
    marginBottom: 2,
  },
  privateChoiceDesc: {
    fontSize: 13,
    color: colors.mutedForeground,
  },
  orText: {
    fontSize: 14,
    color: colors.mutedForeground,
    marginVertical: 12,
  },

  // ─── Private: Join code input ───
  joinRow: {
    width: '100%',
    marginBottom: 24,
  },
  joinInput: {
    width: '100%',
    backgroundColor: colors.secondary,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    color: colors.foreground,
    fontSize: 24,
    fontWeight: 'bold',
    letterSpacing: 6,
    borderWidth: 2,
    borderColor: colors.border,
    textAlign: 'center',
  },

  // ─── Action button ───
  actionButton: {
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    marginBottom: 24,
  },
  actionButtonDisabled: {
    opacity: 0.5,
    shadowOpacity: 0,
    elevation: 0,
  },
  actionButtonGradient: {
    paddingHorizontal: 60,
    paddingVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 56,
  },
  actionButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.primaryForeground,
  },

  // ─── Resume button ───
  resumeButton: {
    width: '100%',
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

  // ─── Bottom links ───
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

  // ─── Language toggle ───
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
