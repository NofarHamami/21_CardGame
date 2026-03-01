import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { colors } from '../theme/colors';
import { generateRoomCode, getMultiplayerService, MultiplayerEvent } from '../services/MultiplayerService';
import { loadLanguagePreference } from '../utils/storage';
import { logger } from '../utils/logger';
import { RootStackParamList } from '../navigation/types';

type Language = 'he' | 'en';

const translations = {
  he: {
    title: 'חדר המתנה',
    waiting: 'מחכים למשתתפים נוספים...',
    players: 'משתתפים',
    waitTime: 'זמן המתנה:',
    timeout: 'עברה יותר מדקה',
    timeoutDesc: 'לא נמצאו מספיק משתתפים. האם תרצה להחליף משחק?',
    changeGame: 'החליף משחק',
    cancel: 'ביטול',
    you: '(אתה)',
    waitingPlayer: 'מחכה למשתתף...',
    roomCode: 'קוד חדר',
    joinRoom: 'הצטרף לחדר',
    createRoom: 'צור חדר',
    orJoin: 'או הצטרף עם קוד:',
    connecting: 'מתחבר...',
    connectionFailed: 'חיבור לשרת נכשל. משתמש במצב סימולציה.',
  },
  en: {
    title: 'Waiting Room',
    waiting: 'Waiting for more players...',
    players: 'Players',
    waitTime: 'Wait time:',
    timeout: 'Over 1 minute elapsed',
    timeoutDesc: "Not enough players found. Want to change the game?",
    changeGame: 'Change Game',
    cancel: 'Cancel',
    you: '(you)',
    waitingPlayer: 'Waiting for player...',
    roomCode: 'Room Code',
    joinRoom: 'Join Room',
    createRoom: 'Create Room',
    orJoin: 'Or join with code:',
    connecting: 'Connecting...',
    connectionFailed: 'Server connection failed. Using simulation mode.',
  },
};

type WaitingRoomScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'WaitingRoom'>;
type WaitingRoomScreenRouteProp = RouteProp<RootStackParamList, 'WaitingRoom'>;

interface WaitingRoomScreenProps {
  navigation: WaitingRoomScreenNavigationProp;
  route: WaitingRoomScreenRouteProp;
}

const WAIT_TIMEOUT_MS = 60 * 1000;

export function WaitingRoomScreen({ navigation, route }: WaitingRoomScreenProps) {
  const { numPlayers, playerName, playerAvatar } = route.params;
  const [currentPlayers, setCurrentPlayers] = useState(1);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [showTimeoutMessage, setShowTimeoutMessage] = useState(false);
  const [roomCode, setRoomCode] = useState(() => generateRoomCode());
  const [joinCode, setJoinCode] = useState('');
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'connecting' | 'connected' | 'simulating'>('idle');
  const [language, setLanguage] = useState<Language>('he');
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    loadLanguagePreference().then(setLanguage);
  }, []);

  const t = translations[language];

  // Try to connect to multiplayer server, fall back to simulation
  useEffect(() => {
    let cancelled = false;

    const tryConnect = async () => {
      setConnectionStatus('connecting');
      try {
        const service = getMultiplayerService();
        await service.connect();
        if (!cancelled) {
          setConnectionStatus('connected');
          service.createRoom(playerName, playerAvatar, numPlayers);

          const unsubscribe = service.addEventListener((event: MultiplayerEvent) => {
            if (event.type === 'player_joined') {
              setCurrentPlayers(event.room.players.length);
            }
            if (event.type === 'game_started') {
              navigation.replace('Game', {
                numPlayers,
                playerName,
                playerAvatar,
                gameMode: 'random',
              });
            }
          });

          return () => {
            unsubscribe();
            service.disconnect();
          };
        }
      } catch {
        if (!cancelled) {
          logger.debug('WaitingRoom: Server unavailable, using simulation');
          setConnectionStatus('simulating');
          startSimulation();
        }
      }
    };

    tryConnect();

    return () => {
      cancelled = true;
    };
  }, []);

  const startSimulation = () => {
    const delays = Array.from({ length: numPlayers - 1 }, (_, i) =>
      setTimeout(() => {
        setCurrentPlayers(prev => Math.min(prev + 1, numPlayers));
      }, 3000 + i * 2500)
    );

    return () => delays.forEach(clearTimeout);
  };

  // Timer and timeout
  useEffect(() => {
    intervalRef.current = setInterval(() => setTimeElapsed(prev => prev + 1), 1000);
    timeoutRef.current = setTimeout(() => setShowTimeoutMessage(true), WAIT_TIMEOUT_MS);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  // Start game when all players join
  useEffect(() => {
    if (currentPlayers >= numPlayers) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);

      setTimeout(() => {
        navigation.replace('Game', {
          numPlayers,
          playerName,
          playerAvatar,
          gameMode: 'random',
        });
      }, 1000);
    }
  }, [currentPlayers, numPlayers, navigation, playerName, playerAvatar]);

  const handleJoinRoom = () => {
    if (joinCode.length >= 4) {
      const service = getMultiplayerService();
      service.joinRoom(joinCode.toUpperCase(), playerName, playerAvatar);
      setRoomCode(joinCode.toUpperCase());
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>
          <View style={styles.titleSection}>
            <Text style={styles.title}>{t.title}</Text>
            <Text style={styles.subtitle}>{t.waiting}</Text>
          </View>

          {/* Room Code */}
          <View style={styles.roomCodeSection}>
            <Text style={styles.roomCodeLabel}>{t.roomCode}</Text>
            <Text style={styles.roomCodeText}>{roomCode}</Text>
          </View>

          {/* Join with code */}
          <View style={styles.joinSection}>
            <Text style={styles.joinLabel}>{t.orJoin}</Text>
            <View style={styles.joinRow}>
              <TextInput
                style={styles.joinInput}
                value={joinCode}
                onChangeText={setJoinCode}
                placeholder="ABC123"
                placeholderTextColor={colors.mutedForeground}
                autoCapitalize="characters"
                maxLength={6}
              />
              <TouchableOpacity style={styles.joinButton} onPress={handleJoinRoom} disabled={joinCode.length < 4}>
                <Text style={styles.joinButtonText}>{t.joinRoom}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Player count */}
          <View style={styles.playerCountSection}>
            <Text style={styles.playerCountText}>{currentPlayers} / {numPlayers}</Text>
            <Text style={styles.playerCountLabel}>{t.players}</Text>
          </View>

          <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />

          {/* Connection status */}
          {connectionStatus === 'simulating' && (
            <Text style={styles.connectionNote}>{t.connectionFailed}</Text>
          )}

          {/* Players list */}
          <View style={styles.playersList}>
            <View style={styles.playerItem}>
              <Text style={styles.playerAvatar}>{playerAvatar}</Text>
              <Text style={styles.playerName}>{playerName} {t.you}</Text>
            </View>
            {currentPlayers > 1 &&
              Array.from({ length: currentPlayers - 1 }).map((_, i) => (
                <View key={i} style={styles.playerItem}>
                  <Text style={styles.playerAvatar}>😎</Text>
                  <Text style={styles.playerName}>{language === 'he' ? `שחקן ${i + 2}` : `Player ${i + 2}`}</Text>
                </View>
              ))
            }
            {currentPlayers < numPlayers &&
              Array.from({ length: numPlayers - currentPlayers }).map((_, i) => (
                <View key={`waiting-${i}`} style={[styles.playerItem, styles.playerItemWaiting]}>
                  <Text style={styles.playerAvatar}>⏳</Text>
                  <Text style={styles.playerNameWaiting}>{t.waitingPlayer}</Text>
                </View>
              ))
            }
          </View>

          {/* Timer */}
          <View style={styles.timerSection}>
            <Text style={styles.timerLabel}>{t.waitTime}</Text>
            <Text style={styles.timerText}>{formatTime(timeElapsed)}</Text>
          </View>

          {showTimeoutMessage && (
            <View style={styles.timeoutMessage}>
              <Text style={styles.timeoutTitle}>{t.timeout}</Text>
              <Text style={styles.timeoutText}>{t.timeoutDesc}</Text>
              <TouchableOpacity style={styles.changeGameButton} onPress={() => navigation.navigate('Home')}>
                <Text style={styles.changeGameButtonText}>{t.changeGame}</Text>
              </TouchableOpacity>
            </View>
          )}

          <TouchableOpacity style={styles.cancelButton} onPress={() => navigation.navigate('Home')}>
            <Text style={styles.cancelButtonText}>{t.cancel}</Text>
          </TouchableOpacity>
        </View>
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
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleSection: {
    alignItems: 'center',
    marginBottom: 24,
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
  roomCodeSection: {
    alignItems: 'center',
    marginBottom: 16,
    backgroundColor: colors.secondary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.gold,
  },
  roomCodeLabel: {
    fontSize: 12,
    color: colors.mutedForeground,
    marginBottom: 4,
  },
  roomCodeText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.gold,
    letterSpacing: 4,
  },
  joinSection: {
    alignItems: 'center',
    marginBottom: 20,
    width: '100%',
    maxWidth: 300,
  },
  joinLabel: {
    fontSize: 13,
    color: colors.mutedForeground,
    marginBottom: 8,
  },
  joinRow: {
    flexDirection: 'row',
    gap: 8,
  },
  joinInput: {
    flex: 1,
    backgroundColor: colors.secondary,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    color: colors.foreground,
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 2,
    borderWidth: 1,
    borderColor: colors.border,
  },
  joinButton: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    justifyContent: 'center',
  },
  joinButtonText: {
    color: colors.primaryForeground,
    fontWeight: 'bold',
    fontSize: 14,
  },
  playerCountSection: {
    alignItems: 'center',
    marginBottom: 16,
  },
  playerCountText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 8,
  },
  playerCountLabel: {
    fontSize: 18,
    color: colors.foreground,
  },
  loader: {
    marginBottom: 16,
  },
  connectionNote: {
    fontSize: 12,
    color: colors.mutedForeground,
    fontStyle: 'italic',
    marginBottom: 12,
    textAlign: 'center',
  },
  playersList: {
    width: '100%',
    maxWidth: 300,
    marginBottom: 20,
  },
  playerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.secondary,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: colors.border,
  },
  playerItemWaiting: {
    opacity: 0.6,
    borderStyle: 'dashed',
  },
  playerAvatar: {
    fontSize: 32,
    marginRight: 12,
  },
  playerName: {
    fontSize: 16,
    color: colors.foreground,
    fontWeight: '500',
  },
  playerNameWaiting: {
    fontSize: 16,
    color: colors.mutedForeground,
    fontStyle: 'italic',
  },
  timerSection: {
    alignItems: 'center',
    marginBottom: 16,
  },
  timerLabel: {
    fontSize: 14,
    color: colors.mutedForeground,
    marginBottom: 4,
  },
  timerText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.accent,
  },
  timeoutMessage: {
    backgroundColor: colors.secondary,
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    width: '100%',
    maxWidth: 300,
    borderWidth: 2,
    borderColor: colors.accent,
  },
  timeoutTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.accent,
    marginBottom: 8,
    textAlign: 'center',
  },
  timeoutText: {
    fontSize: 14,
    color: colors.foreground,
    marginBottom: 16,
    textAlign: 'center',
  },
  changeGameButton: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  changeGameButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.primaryForeground,
  },
  cancelButton: {
    marginTop: 8,
  },
  cancelButtonText: {
    fontSize: 16,
    color: colors.mutedForeground,
    textDecorationLine: 'underline',
  },
});

export default WaitingRoomScreen;
