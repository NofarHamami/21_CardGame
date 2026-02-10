import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { colors } from '../theme/colors';

type RootStackParamList = {
  Home: undefined;
  PlayerSetup: { gameMode: 'practice' | 'private' | 'random'; numPlayers: number };
  Game: { numPlayers: number; playerName?: string; playerAvatar?: string; gameMode?: 'practice' | 'private' | 'random' };
  Scoreboard: { players: Array<{ name: string; avatar?: string; score: number }> };
  WaitingRoom: { gameMode: 'random'; numPlayers: number; playerName: string; playerAvatar: string };
};

type WaitingRoomScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'WaitingRoom'>;
type WaitingRoomScreenRouteProp = RouteProp<RootStackParamList, 'WaitingRoom'>;

interface WaitingRoomScreenProps {
  navigation: WaitingRoomScreenNavigationProp;
  route: WaitingRoomScreenRouteProp;
}

const WAIT_TIMEOUT_MS = 60 * 1000; // 1 minute

/**
 * Waiting room screen - wait for other players to join
 */
export function WaitingRoomScreen({ navigation, route }: WaitingRoomScreenProps) {
  const { numPlayers, playerName, playerAvatar } = route.params;
  const [currentPlayers, setCurrentPlayers] = useState(1); // Start with current player
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [showTimeoutMessage, setShowTimeoutMessage] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Simulate players joining (in real app, this would be from a server)
    // For demo purposes, simulate random players joining
    const simulatePlayersJoining = () => {
      const randomDelay = Math.random() * 3000 + 2000; // 2-5 seconds
      setTimeout(() => {
        if (currentPlayers < numPlayers) {
          setCurrentPlayers(prev => Math.min(prev + 1, numPlayers));
        }
      }, randomDelay);
    };

    // Simulate first player joining after 3 seconds
    const firstPlayerTimeout = setTimeout(() => {
      if (currentPlayers < numPlayers) {
        setCurrentPlayers(prev => prev + 1);
        simulatePlayersJoining();
      }
    }, 3000);

    // Set up timeout for 1 minute
    timeoutRef.current = setTimeout(() => {
      setShowTimeoutMessage(true);
    }, WAIT_TIMEOUT_MS);

    // Update elapsed time every second
    intervalRef.current = setInterval(() => {
      setTimeElapsed(prev => prev + 1);
    }, 1000);

    return () => {
      clearTimeout(firstPlayerTimeout);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [currentPlayers, numPlayers]);

  // Check if all players have joined
  useEffect(() => {
    if (currentPlayers >= numPlayers) {
      // All players joined - start the game
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      
      // Navigate to game after a short delay
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

  const handleChangeGame = () => {
    navigation.navigate('Home');
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
          {/* Title */}
          <View style={styles.titleSection}>
            <Text style={styles.title}>חדר המתנה</Text>
            <Text style={styles.subtitle}>מחכים למשתתפים נוספים...</Text>
          </View>

          {/* Player count */}
          <View style={styles.playerCountSection}>
            <Text style={styles.playerCountText}>
              {currentPlayers} / {numPlayers}
            </Text>
            <Text style={styles.playerCountLabel}>משתתפים</Text>
          </View>

          {/* Loading indicator */}
          <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />

          {/* Current players list */}
          <View style={styles.playersList}>
            <View style={styles.playerItem}>
              <Text style={styles.playerAvatar}>{playerAvatar}</Text>
              <Text style={styles.playerName}>{playerName} (אתה)</Text>
            </View>
            {currentPlayers > 1 && (
              <>
                {Array.from({ length: currentPlayers - 1 }).map((_, i) => (
                  <View key={i} style={styles.playerItem}>
                    <Text style={styles.playerAvatar}>😎</Text>
                    <Text style={styles.playerName}>שחקן {i + 2}</Text>
                  </View>
                ))}
              </>
            )}
            {currentPlayers < numPlayers && (
              <>
                {Array.from({ length: numPlayers - currentPlayers }).map((_, i) => (
                  <View key={`waiting-${i}`} style={[styles.playerItem, styles.playerItemWaiting]}>
                    <Text style={styles.playerAvatar}>⏳</Text>
                    <Text style={styles.playerNameWaiting}>מחכה למשתתף...</Text>
                  </View>
                ))}
              </>
            )}
          </View>

          {/* Timer */}
          <View style={styles.timerSection}>
            <Text style={styles.timerLabel}>זמן המתנה:</Text>
            <Text style={styles.timerText}>{formatTime(timeElapsed)}</Text>
          </View>

          {/* Timeout message */}
          {showTimeoutMessage && (
            <View style={styles.timeoutMessage}>
              <Text style={styles.timeoutTitle}>עברה יותר מדקה</Text>
              <Text style={styles.timeoutText}>
                לא נמצאו מספיק משתתפים. האם תרצה להחליף משחק?
              </Text>
              <TouchableOpacity
                style={styles.changeGameButton}
                onPress={handleChangeGame}
              >
                <Text style={styles.changeGameButtonText}>החליף משחק</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Cancel button */}
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => navigation.navigate('Home')}
          >
            <Text style={styles.cancelButtonText}>ביטול</Text>
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
  playerCountSection: {
    alignItems: 'center',
    marginBottom: 30,
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
    marginBottom: 30,
  },
  playersList: {
    width: '100%',
    maxWidth: 300,
    marginBottom: 30,
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
    marginBottom: 20,
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
    marginBottom: 20,
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
    marginTop: 20,
  },
  cancelButtonText: {
    fontSize: 16,
    color: colors.mutedForeground,
    textDecorationLine: 'underline',
  },
});

export default WaitingRoomScreen;
