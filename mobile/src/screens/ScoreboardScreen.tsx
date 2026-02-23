import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { colors } from '../theme/colors';
import { loadLanguagePreference } from '../utils/storage';

type Language = 'he' | 'en';

type RootStackParamList = {
  Home: undefined;
  PlayerSetup: { gameMode: 'practice' | 'private'; numPlayers: number };
  Game: { numPlayers: number; playerName?: string; playerAvatar?: string; gameMode?: 'practice' | 'private' };
  Scoreboard: { players: Array<{ name: string; avatar?: string; score: number }> };
};

type ScoreboardScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Scoreboard'>;
type ScoreboardScreenRouteProp = RouteProp<RootStackParamList, 'Scoreboard'>;

interface ScoreboardScreenProps {
  navigation: ScoreboardScreenNavigationProp;
  route: ScoreboardScreenRouteProp;
}

interface PlayerScore {
  name: string;
  avatar?: string;
  score: number;
}

const translations = {
  he: {
    title: 'טבלת ניקוד',
    winner: '🏆 המנצח!',
    victory: 'ניצחון!',
    score: 'ניקוד:',
    playAgain: 'שחק שוב',
    backToMenu: 'חזור לתפריט',
  },
  en: {
    title: 'Scoreboard',
    winner: '🏆 Winner!',
    victory: 'Victory!',
    score: 'Score:',
    playAgain: 'Play Again',
    backToMenu: 'Back to Menu',
  },
};

/**
 * Scoreboard screen - shows final scores with winner at top
 */
export function ScoreboardScreen({ navigation, route }: ScoreboardScreenProps) {
  const { players } = route.params;
  const [language, setLanguage] = useState<Language>('he');

  useEffect(() => {
    loadLanguagePreference().then(lang => {
      setLanguage(lang);
    });
  }, []);

  const t = translations[language];

  // Sort players: winner (score 100) first, then others by score (higher is better)
  const sortedPlayers = [...players].sort((a, b) => {
    // Winner (score 100) always first
    if (a.score === 100) return -1;
    if (b.score === 100) return 1;
    // Others sorted by score (higher is better - fewer cards remaining = higher score)
    return b.score - a.score;
  });

  const winner = sortedPlayers[0];
  const isWinner = winner.score === 100;

  const handleBackToHome = () => {
    navigation.navigate('Home');
  };

  const handlePlayAgain = () => {
    navigation.navigate('Home');
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
            {isWinner && (
              <View style={styles.winnerBadge}>
                <Text style={styles.winnerText}>{t.winner}</Text>
              </View>
            )}
          </View>

          {/* Scoreboard */}
          <View style={styles.scoreboard}>
            {sortedPlayers.map((player, index) => {
              const isFirstPlace = index === 0;
              const rank = index + 1;
              
              return (
                <View
                  key={`${player.name}-${index}`}
                  style={[
                    styles.scoreRow,
                    isFirstPlace && styles.scoreRowWinner,
                  ]}
                >
                  {/* Rank */}
                  <View style={styles.rankContainer}>
                    {isFirstPlace ? (
                      <Text style={styles.rankEmoji}>🥇</Text>
                    ) : rank === 2 ? (
                      <Text style={styles.rankEmoji}>🥈</Text>
                    ) : rank === 3 ? (
                      <Text style={styles.rankEmoji}>🥉</Text>
                    ) : (
                      <Text style={styles.rankNumber}>{rank}</Text>
                    )}
                  </View>

                  {/* Avatar */}
                  <View style={styles.avatarContainer}>
                    <View style={[
                      styles.avatarCircle,
                      isFirstPlace && styles.avatarCircleWinner,
                    ]}>
                      <Text style={styles.avatarEmoji}>
                        {player.avatar || '😎'}
                      </Text>
                    </View>
                  </View>

                  {/* Name and Score */}
                  <View style={styles.playerInfo}>
                    <Text style={[
                      styles.playerName,
                      isFirstPlace && styles.playerNameWinner,
                    ]}>
                      {player.name}
                    </Text>
                    <Text style={[
                      styles.playerScore,
                      isFirstPlace && styles.playerScoreWinner,
                    ]}>
                      {player.score === 100 ? `100 - ${t.victory}` : `${t.score} ${player.score}`}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>

          {/* Action Buttons */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.playAgainButton}
              onPress={handlePlayAgain}
            >
              <Text style={styles.playAgainButtonText}>{t.playAgain}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.backButton}
              onPress={handleBackToHome}
            >
              <Text style={styles.backButtonText}>{t.backToMenu}</Text>
            </TouchableOpacity>
          </View>
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
  },
  titleSection: {
    alignItems: 'center',
    marginBottom: 30,
  },
  title: {
    fontSize: 42,
    fontWeight: 'bold',
    color: colors.accent,
    marginBottom: 16,
  },
  winnerBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: colors.gold,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  winnerText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.primaryForeground,
  },
  scoreboard: {
    width: '100%',
    marginBottom: 30,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.secondary,
    borderRadius: 14,
    padding: 20,
    marginBottom: 14,
    borderWidth: 2,
    borderColor: colors.border,
    width: '35%',
    height: 120,
    alignSelf: 'center',
  },
  scoreRowWinner: {
    backgroundColor: colors.primary,
    borderColor: colors.accent,
    borderWidth: 3,
    shadowColor: colors.gold,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  rankContainer: {
    width: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankEmoji: {
    fontSize: 40,
  },
  rankNumber: {
    fontSize: 30,
    fontWeight: 'bold',
    color: colors.foreground,
  },
  avatarContainer: {
    marginLeft: 14,
    marginRight: 14,
  },
  avatarCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.muted,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.border,
  },
  avatarCircleWinner: {
    backgroundColor: colors.accent,
    borderColor: colors.primaryForeground,
    borderWidth: 3,
  },
  avatarEmoji: {
    fontSize: 38,
  },
  playerInfo: {
    flex: 1,
    alignItems: 'flex-end',
  },
  playerName: {
    fontSize: 24,
    fontWeight: '600',
    color: colors.foreground,
    marginBottom: 4,
  },
  playerNameWinner: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.primaryForeground,
  },
  playerScore: {
    fontSize: 18,
    color: colors.mutedForeground,
  },
  playerScoreWinner: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.primaryForeground,
  },
  actions: {
    width: '100%',
    gap: 12,
  },
  playAgainButton: {
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
  },
  playAgainButtonText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.primaryForeground,
    textAlign: 'center',
  },
  backButton: {
    alignSelf: 'center',
    marginTop: 8,
  },
  backButtonText: {
    fontSize: 20,
    color: colors.mutedForeground,
    textDecorationLine: 'underline',
  },
});

export default ScoreboardScreen;
