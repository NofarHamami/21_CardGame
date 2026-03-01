import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { colors } from '../theme/colors';
import { getMultiplayerService, resetMultiplayerService, MultiplayerEvent, PlayerInfo } from '../services/MultiplayerService';
import { loadLanguagePreference } from '../utils/storage';
import { logger } from '../utils/logger';
import { RootStackParamList } from '../navigation/types';

type Language = 'he' | 'en';

const translations = {
  he: {
    privateTitle: 'חדר פרטי',
    randomTitle: 'מציאת משחק',
    waitingPrivate: 'ממתין לשחקנים...',
    waitingRandom: 'מחפש שחקנים...',
    players: 'שחקנים',
    waitTime: 'זמן המתנה:',
    timeout: 'עברה יותר מדקה',
    timeoutDesc: 'לא נמצאו מספיק שחקנים. האם תרצה לחזור?',
    goBack: 'חזור',
    cancel: 'ביטול',
    you: '(אתה)',
    waitingPlayer: 'מחכה לשחקן...',
    roomCode: 'קוד חדר',
    joinRoom: 'הצטרף',
    connecting: 'מתחבר...',
    connectionFailed: 'חיבור לשרת נכשל',
    startGame: 'התחל משחק',
    copied: 'הקוד הועתק!',
    copyCode: 'העתק קוד',
    shareHint: 'שתף את הקוד עם חברים',
    needMorePlayers: 'צריך לפחות 2 שחקנים',
    searching: 'מחפש משחק מתאים...',
    retry: 'נסה שוב',
    createRoom: 'צור חדר חדש',
    createRoomDesc: 'צור חדר ושלח את הקוד לחברים',
    joinRoomTitle: 'הצטרף לחדר',
    joinRoomDesc: 'הכנס קוד שקיבלת מחבר',
    enterCode: 'הכנס קוד חדר',
    or: 'או',
  },
  en: {
    privateTitle: 'Private Room',
    randomTitle: 'Find a Game',
    waitingPrivate: 'Waiting for players...',
    waitingRandom: 'Searching for players...',
    players: 'Players',
    waitTime: 'Wait time:',
    timeout: 'Over 1 minute elapsed',
    timeoutDesc: 'Not enough players found. Want to go back?',
    goBack: 'Go Back',
    cancel: 'Cancel',
    you: '(you)',
    waitingPlayer: 'Waiting for player...',
    roomCode: 'Room Code',
    joinRoom: 'Join',
    connecting: 'Connecting...',
    connectionFailed: 'Server connection failed',
    startGame: 'Start Game',
    copied: 'Code copied!',
    copyCode: 'Copy Code',
    shareHint: 'Share this code with friends',
    needMorePlayers: 'Need at least 2 players',
    searching: 'Finding a match...',
    retry: 'Retry',
    createRoom: 'Create a Room',
    createRoomDesc: 'Create a room and share the code with friends',
    joinRoomTitle: 'Join a Room',
    joinRoomDesc: 'Enter a code you got from a friend',
    enterCode: 'Enter room code',
    or: 'or',
  },
};

type WaitingRoomScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'WaitingRoom'>;
type WaitingRoomScreenRouteProp = RouteProp<RootStackParamList, 'WaitingRoom'>;

interface WaitingRoomScreenProps {
  navigation: WaitingRoomScreenNavigationProp;
  route: WaitingRoomScreenRouteProp;
}

type PrivateStep = 'choose' | 'hosting' | 'joining';

const WAIT_TIMEOUT_MS = 90 * 1000;

export function WaitingRoomScreen({ navigation, route }: WaitingRoomScreenProps) {
  const { gameMode, numPlayers, playerName, playerAvatar } = route.params;
  const isPrivate = gameMode === 'private';

  const [privateStep, setPrivateStep] = useState<PrivateStep>('choose');
  const [remotePlayers, setRemotePlayers] = useState<PlayerInfo[]>([]);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [showTimeoutMessage, setShowTimeoutMessage] = useState(false);
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [joinCode, setJoinCode] = useState('');
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'connecting' | 'connected' | 'failed'>('idle');
  const [codeCopied, setCodeCopied] = useState(false);
  const [language, setLanguage] = useState<Language>('he');
  const [isHost, setIsHost] = useState(false);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [roomMaxPlayers, setRoomMaxPlayers] = useState(numPlayers);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  // Refs to avoid stale closures in the event listener
  const remotePlayersRef = useRef<PlayerInfo[]>([]);
  const roomCodeRef = useRef<string | null>(null);
  const playerIdRef = useRef<string | null>(null);
  const connectionStatusRef = useRef(connectionStatus);

  remotePlayersRef.current = remotePlayers;
  roomCodeRef.current = roomCode;
  playerIdRef.current = playerId;
  connectionStatusRef.current = connectionStatus;

  useEffect(() => {
    loadLanguagePreference().then(setLanguage);
  }, []);

  const t = translations[language];

  const handleEvent = useCallback((event: MultiplayerEvent) => {
    switch (event.type) {
      case 'room_created':
        setRoomCode(event.room.roomCode);
        setIsHost(true);
        setRemotePlayers(event.room.players);
        if (event.room.maxPlayers) setRoomMaxPlayers(event.room.maxPlayers);
        break;
      case 'player_joined':
        setRemotePlayers(event.room.players);
        if (event.room.maxPlayers) setRoomMaxPlayers(event.room.maxPlayers);
        setJoinError(null);
        break;
      case 'player_left':
        setRemotePlayers(event.room.players);
        break;
      case 'game_started':
        if (intervalRef.current) clearInterval(intervalRef.current);
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        navigation.replace('Game', {
          numPlayers: event.players.length,
          playerName,
          playerAvatar,
          gameMode,
          roomCode: roomCodeRef.current || undefined,
          playerId: playerIdRef.current || undefined,
        });
        break;
      case 'error':
        logger.error('WaitingRoom error:', event.message);
        setJoinError(event.message);
        break;
      case 'disconnected':
        if (connectionStatusRef.current !== 'idle') {
          setConnectionStatus('failed');
        }
        break;
    }
  }, [navigation, playerName, playerAvatar, gameMode]);

  // Keep the listener fresh when handleEvent changes
  useEffect(() => {
    const service = getMultiplayerService();
    if (!service.isConnected) return;
    if (unsubscribeRef.current) unsubscribeRef.current();
    unsubscribeRef.current = service.addEventListener(handleEvent);
  }, [handleEvent]);

  const connectAndDo = useCallback(async (action: (service: ReturnType<typeof getMultiplayerService>) => void) => {
    setConnectionStatus('connecting');
    setJoinError(null);
    try {
      const service = getMultiplayerService();
      if (!service.isConnected) {
        await service.connect();
      }
      setConnectionStatus('connected');
      setPlayerId(service.playerId);
      if (unsubscribeRef.current) unsubscribeRef.current();
      unsubscribeRef.current = service.addEventListener(handleEvent);
      action(service);
    } catch {
      logger.debug('WaitingRoom: Server unavailable');
      setConnectionStatus('failed');
    }
  }, [handleEvent]);

  // For random mode, connect immediately
  useEffect(() => {
    if (!isPrivate) {
      connectAndDo((service) => {
        service.joinMatchmaking(playerName, playerAvatar, numPlayers);
      });
    }

    return () => {
      if (unsubscribeRef.current) unsubscribeRef.current();
    };
  }, []);

  // Timer (starts when in hosting/joining/random state)
  useEffect(() => {
    if (privateStep === 'choose' && isPrivate) return;

    intervalRef.current = setInterval(() => setTimeElapsed(prev => prev + 1), 1000);
    timeoutRef.current = setTimeout(() => setShowTimeoutMessage(true), WAIT_TIMEOUT_MS);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [privateStep, isPrivate]);

  const handleCreateRoom = () => {
    setPrivateStep('hosting');
    connectAndDo((service) => {
      service.createRoom(playerName, playerAvatar, numPlayers);
    });
  };

  const handleShowJoin = () => {
    setPrivateStep('joining');
    // Connect but don't join yet — wait for user to enter code
    connectAndDo(() => {});
  };

  const handleJoinRoom = () => {
    if (joinCode.length < 4) return;
    const code = joinCode.toUpperCase();
    setJoinError(null);
    const service = getMultiplayerService();
    if (service.isConnected) {
      service.joinRoom(code, playerName, playerAvatar);
      setRoomCode(code);
      setIsHost(false);
    }
  };

  const handleCopyCode = async () => {
    if (!roomCode) return;
    try {
      await Clipboard.setStringAsync(roomCode);
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2000);
    } catch {
      // Clipboard not available
    }
  };

  const handleStartGame = () => {
    if (remotePlayers.length < 2) return;
    const service = getMultiplayerService();
    service.startGame();
  };

  const handleCancel = () => {
    resetMultiplayerService();
    navigation.navigate('Home');
  };

  const handleBackToChoose = () => {
    resetMultiplayerService();
    setPrivateStep('choose');
    setRoomCode(null);
    setRemotePlayers([]);
    setJoinCode('');
    setJoinError(null);
    setTimeElapsed(0);
    setShowTimeoutMessage(false);
    setConnectionStatus('idle');
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const totalPlayers = remotePlayers.length;
  const canStart = isHost && totalPlayers >= 2;

  // ─── PRIVATE: Choose create or join ───
  if (isPrivate && privateStep === 'choose') {
    return (
      <View style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.content}>
            <View style={styles.titleSection}>
              <Text style={styles.title}>{t.privateTitle}</Text>
            </View>

            <TouchableOpacity style={styles.choiceCard} onPress={handleCreateRoom} activeOpacity={0.8}>
              <Text style={styles.choiceEmoji}>🏠</Text>
              <Text style={styles.choiceTitle}>{t.createRoom}</Text>
              <Text style={styles.choiceDesc}>{t.createRoomDesc}</Text>
            </TouchableOpacity>

            <Text style={styles.orText}>— {t.or} —</Text>

            <TouchableOpacity style={styles.choiceCard} onPress={handleShowJoin} activeOpacity={0.8}>
              <Text style={styles.choiceEmoji}>🔗</Text>
              <Text style={styles.choiceTitle}>{t.joinRoomTitle}</Text>
              <Text style={styles.choiceDesc}>{t.joinRoomDesc}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
              <Text style={styles.cancelButtonText}>{t.cancel}</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  // ─── PRIVATE: Joining a room ───
  if (isPrivate && privateStep === 'joining' && !roomCode) {
    return (
      <View style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.content}>
            <View style={styles.titleSection}>
              <Text style={styles.title}>{t.joinRoomTitle}</Text>
              <Text style={styles.subtitle}>{t.joinRoomDesc}</Text>
            </View>

            {connectionStatus === 'connecting' && (
              <View style={styles.connectingSection}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={styles.connectingText}>{t.connecting}</Text>
              </View>
            )}

            {connectionStatus === 'failed' && (
              <View style={styles.errorSection}>
                <Text style={styles.errorText}>{t.connectionFailed}</Text>
                <TouchableOpacity style={styles.retryButton} onPress={handleShowJoin}>
                  <Text style={styles.retryButtonText}>{t.retry}</Text>
                </TouchableOpacity>
              </View>
            )}

            {connectionStatus === 'connected' && (
              <View style={styles.joinSection}>
                <Text style={styles.joinLabel}>{t.enterCode}</Text>
                <View style={styles.joinRow}>
                  <TextInput
                    style={styles.joinInput}
                    value={joinCode}
                    onChangeText={(text) => { setJoinCode(text); setJoinError(null); }}
                    placeholder="ABC123"
                    placeholderTextColor={colors.mutedForeground}
                    autoCapitalize="characters"
                    maxLength={6}
                    autoFocus
                    accessibilityLabel={t.roomCode}
                  />
                  <TouchableOpacity
                    style={[styles.joinButton, joinCode.length < 4 && styles.joinButtonDisabled]}
                    onPress={handleJoinRoom}
                    disabled={joinCode.length < 4}
                  >
                    <Text style={styles.joinButtonText}>{t.joinRoom}</Text>
                  </TouchableOpacity>
                </View>
                {joinError && (
                  <Text style={styles.joinErrorText}>{joinError}</Text>
                )}
              </View>
            )}

            <TouchableOpacity style={styles.backLink} onPress={handleBackToChoose}>
              <Text style={styles.cancelButtonText}>{t.goBack}</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  // ─── MAIN WAITING ROOM (hosting / joined / random) ───
  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>
          <View style={styles.titleSection}>
            <Text style={styles.title}>
              {isPrivate ? t.privateTitle : t.randomTitle}
            </Text>
            <Text style={styles.subtitle}>
              {isPrivate ? t.waitingPrivate : t.waitingRandom}
            </Text>
          </View>

          {connectionStatus === 'failed' && (
            <View style={styles.errorSection}>
              <Text style={styles.errorText}>{t.connectionFailed}</Text>
              <TouchableOpacity style={styles.retryButton} onPress={() => {
                if (isPrivate) handleCreateRoom();
              }}>
                <Text style={styles.retryButtonText}>{t.retry}</Text>
              </TouchableOpacity>
            </View>
          )}

          {connectionStatus === 'connecting' && (
            <View style={styles.connectingSection}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.connectingText}>{t.connecting}</Text>
            </View>
          )}

          {connectionStatus === 'connected' && (
            <>
              {/* Room Code (host in private mode) */}
              {isPrivate && isHost && roomCode && (
                <View style={styles.roomCodeSection}>
                  <Text style={styles.roomCodeLabel}>{t.roomCode}</Text>
                  <Text style={styles.roomCodeText}>{roomCode}</Text>
                  <TouchableOpacity style={styles.copyButton} onPress={handleCopyCode}>
                    <Text style={styles.copyButtonText}>
                      {codeCopied ? t.copied : t.copyCode}
                    </Text>
                  </TouchableOpacity>
                  <Text style={styles.shareHint}>{t.shareHint}</Text>
                </View>
              )}

              {/* Joined room code display (joiner in private mode) */}
              {isPrivate && !isHost && roomCode && (
                <View style={styles.roomCodeSection}>
                  <Text style={styles.roomCodeLabel}>{t.roomCode}</Text>
                  <Text style={styles.roomCodeText}>{roomCode}</Text>
                </View>
              )}

              {/* Searching indicator (random mode) */}
              {!isPrivate && (
                <View style={styles.searchingSection}>
                  <ActivityIndicator size="small" color={colors.gold} />
                  <Text style={styles.searchingText}>{t.searching}</Text>
                </View>
              )}

              {/* Player count */}
              <View style={styles.playerCountSection}>
                <Text style={styles.playerCountText}>{totalPlayers} / {roomMaxPlayers}</Text>
                <Text style={styles.playerCountLabel}>{t.players}</Text>
              </View>

              {/* Players list */}
              <View style={styles.playersList}>
                {remotePlayers.map((p) => (
                  <View key={p.id} style={styles.playerItem}>
                    <Text style={styles.playerAvatar}>{p.avatar || '😎'}</Text>
                    <Text style={styles.playerName}>
                      {p.name} {p.id === playerId ? t.you : ''}
                    </Text>
                    {!p.connected && (
                      <View style={styles.disconnectedBadge}>
                        <Text style={styles.disconnectedText}>⚡</Text>
                      </View>
                    )}
                  </View>
                ))}
                {totalPlayers < roomMaxPlayers &&
                  Array.from({ length: roomMaxPlayers - totalPlayers }).map((_, i) => (
                    <View key={`waiting-${i}`} style={[styles.playerItem, styles.playerItemWaiting]}>
                      <Text style={styles.playerAvatar}>⏳</Text>
                      <Text style={styles.playerNameWaiting}>{t.waitingPlayer}</Text>
                    </View>
                  ))
                }
              </View>

              {/* Start button (host only, private mode) */}
              {isPrivate && isHost && (
                <TouchableOpacity
                  style={[styles.startButton, !canStart && styles.startButtonDisabled]}
                  onPress={handleStartGame}
                  disabled={!canStart}
                  accessibilityLabel={t.startGame}
                >
                  <Text style={styles.startButtonText}>
                    {canStart ? t.startGame : t.needMorePlayers}
                  </Text>
                </TouchableOpacity>
              )}
            </>
          )}

          {/* Timer */}
          {(privateStep !== 'choose') && (
            <View style={styles.timerSection}>
              <Text style={styles.timerLabel}>{t.waitTime}</Text>
              <Text style={styles.timerText}>{formatTime(timeElapsed)}</Text>
            </View>
          )}

          {showTimeoutMessage && (
            <View style={styles.timeoutMessage}>
              <Text style={styles.timeoutTitle}>{t.timeout}</Text>
              <Text style={styles.timeoutText}>{t.timeoutDesc}</Text>
              <TouchableOpacity style={styles.goBackButton} onPress={handleCancel}>
                <Text style={styles.goBackButtonText}>{t.goBack}</Text>
              </TouchableOpacity>
            </View>
          )}

          <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
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
    marginBottom: 28,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.accent,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: colors.foreground,
    opacity: 0.8,
    textAlign: 'center',
  },

  // ─── Choose screen ───
  choiceCard: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: colors.secondary,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.border,
    marginBottom: 8,
  },
  choiceEmoji: {
    fontSize: 36,
    marginBottom: 8,
  },
  choiceTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.foreground,
    marginBottom: 4,
  },
  choiceDesc: {
    fontSize: 13,
    color: colors.mutedForeground,
    textAlign: 'center',
  },
  orText: {
    fontSize: 14,
    color: colors.mutedForeground,
    marginVertical: 12,
  },

  // ─── Error / connecting ───
  errorSection: {
    alignItems: 'center',
    marginBottom: 24,
    backgroundColor: colors.secondary,
    padding: 20,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.destructive,
    width: '100%',
    maxWidth: 300,
  },
  errorText: {
    fontSize: 16,
    color: colors.destructive,
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingHorizontal: 24,
    paddingVertical: 10,
  },
  retryButtonText: {
    color: colors.primaryForeground,
    fontWeight: 'bold',
    fontSize: 14,
  },
  connectingSection: {
    alignItems: 'center',
    marginBottom: 24,
    gap: 12,
  },
  connectingText: {
    fontSize: 16,
    color: colors.mutedForeground,
  },

  // ─── Room code ───
  roomCodeSection: {
    alignItems: 'center',
    marginBottom: 20,
    backgroundColor: colors.secondary,
    paddingVertical: 16,
    paddingHorizontal: 28,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: colors.gold,
    width: '100%',
    maxWidth: 300,
  },
  roomCodeLabel: {
    fontSize: 12,
    color: colors.mutedForeground,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  roomCodeText: {
    fontSize: 36,
    fontWeight: 'bold',
    color: colors.gold,
    letterSpacing: 6,
    marginBottom: 8,
  },
  copyButton: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 8,
    marginBottom: 8,
  },
  copyButtonText: {
    color: colors.primaryForeground,
    fontWeight: '600',
    fontSize: 13,
  },
  shareHint: {
    fontSize: 12,
    color: colors.mutedForeground,
    fontStyle: 'italic',
  },

  // ─── Join ───
  joinSection: {
    alignItems: 'center',
    marginBottom: 20,
    width: '100%',
    maxWidth: 300,
  },
  joinLabel: {
    fontSize: 15,
    color: colors.foreground,
    marginBottom: 12,
    fontWeight: '500',
  },
  joinRow: {
    flexDirection: 'row',
    gap: 8,
    width: '100%',
  },
  joinInput: {
    flex: 1,
    backgroundColor: colors.secondary,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: colors.foreground,
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 3,
    borderWidth: 2,
    borderColor: colors.border,
    textAlign: 'center',
  },
  joinButton: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    justifyContent: 'center',
  },
  joinButtonDisabled: {
    opacity: 0.4,
  },
  joinButtonText: {
    color: colors.primaryForeground,
    fontWeight: 'bold',
    fontSize: 15,
  },
  joinErrorText: {
    color: colors.destructive,
    fontSize: 13,
    marginTop: 8,
    textAlign: 'center',
  },

  // ─── Searching ───
  searchingSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 20,
    backgroundColor: colors.secondary,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  searchingText: {
    fontSize: 14,
    color: colors.gold,
    fontWeight: '500',
  },

  // ─── Player count & list ───
  playerCountSection: {
    alignItems: 'center',
    marginBottom: 16,
  },
  playerCountText: {
    fontSize: 42,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 4,
  },
  playerCountLabel: {
    fontSize: 16,
    color: colors.foreground,
  },
  playersList: {
    width: '100%',
    maxWidth: 300,
    marginBottom: 16,
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
    opacity: 0.5,
    borderStyle: 'dashed',
  },
  playerAvatar: {
    fontSize: 28,
    marginRight: 12,
  },
  playerName: {
    fontSize: 16,
    color: colors.foreground,
    fontWeight: '500',
    flex: 1,
  },
  playerNameWaiting: {
    fontSize: 16,
    color: colors.mutedForeground,
    fontStyle: 'italic',
  },
  disconnectedBadge: {
    backgroundColor: colors.destructive,
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  disconnectedText: {
    fontSize: 10,
  },

  // ─── Start / actions ───
  startButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingHorizontal: 40,
    paddingVertical: 14,
    alignItems: 'center',
    width: '100%',
    maxWidth: 300,
    marginBottom: 16,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  startButtonDisabled: {
    opacity: 0.5,
    shadowOpacity: 0,
    elevation: 0,
  },
  startButtonText: {
    color: colors.primaryForeground,
    fontWeight: 'bold',
    fontSize: 16,
  },
  timerSection: {
    alignItems: 'center',
    marginBottom: 12,
  },
  timerLabel: {
    fontSize: 13,
    color: colors.mutedForeground,
    marginBottom: 2,
  },
  timerText: {
    fontSize: 20,
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
  goBackButton: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  goBackButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.primaryForeground,
  },
  cancelButton: {
    marginTop: 16,
  },
  backLink: {
    marginTop: 20,
  },
  cancelButtonText: {
    fontSize: 16,
    color: colors.mutedForeground,
    textDecorationLine: 'underline',
  },
});

export default WaitingRoomScreen;
