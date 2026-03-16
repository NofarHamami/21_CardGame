import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Platform,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { colors } from '../theme/colors';
import { loadLanguagePreference } from '../utils/storage';
import { loadGameStats } from '../utils/gameStats';
import { RootStackParamList } from '../navigation/types';

type Language = 'he' | 'en';

type ScoreboardScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Scoreboard'>;
type ScoreboardScreenRouteProp = RouteProp<RootStackParamList, 'Scoreboard'>;

interface ScoreboardScreenProps {
  navigation: ScoreboardScreenNavigationProp;
  route: ScoreboardScreenRouteProp;
}

const translations = {
  he: {
    title: 'טבלת ניקוד',
    victory: 'ניצחון!',
    score: 'ניקוד:',
    totalPoints: 'סה"כ נקודות',
    playAgain: 'שחק שוב',
    rematch: 'משחק חוזר',
    backToMenu: 'חזור לתפריט',
  },
  en: {
    title: 'Scoreboard',
    victory: 'Victory!',
    score: 'Score:',
    totalPoints: 'Total Points',
    playAgain: 'Play Again',
    rematch: 'Rematch',
    backToMenu: 'Back to Menu',
  },
};

export function ScoreboardScreen({ navigation, route }: ScoreboardScreenProps) {
  const { players, gameMode, numPlayers, aiDifficulty } = route.params;
  const [language, setLanguage] = useState<Language>('he');
  const [totalPoints, setTotalPoints] = useState<number | null>(null);

  useEffect(() => {
    loadLanguagePreference().then(lang => {
      setLanguage(lang);
    });
    loadGameStats().then(stats => {
      setTotalPoints(stats.totalPoints);
    });
  }, []);

  useEffect(() => {
    if (Platform.OS === 'web') {
      const style = document.createElement('style');
      style.textContent = `
        html, body, #root, [data-testid="scrollview"] {
          overflow: hidden !important;
        }
        *::-webkit-scrollbar { display: none !important; }
        * { scrollbar-width: none !important; }
      `;
      document.head.appendChild(style);
      document.body.style.overflow = 'hidden';
      return () => {
        document.head.removeChild(style);
        document.body.style.overflow = '';
      };
    }
  }, []);

  const t = translations[language];

  const sortedPlayers = [...players].sort((a, b) => {
    if (a.score === 100) return -1;
    if (b.score === 100) return 1;
    return b.score - a.score;
  });

  const handleBackToHome = () => {
    navigation.navigate('Home');
  };

  const handleRematch = () => {
    navigation.replace('Game', {
      numPlayers: numPlayers || players.length,
      playerName: sortedPlayers.find(p => p.score === 100)?.name || players[0]?.name,
      playerAvatar: sortedPlayers.find(p => p.score === 100)?.avatar || players[0]?.avatar,
      gameMode: (gameMode as 'practice' | 'private') || 'practice',
      aiDifficulty,
    });
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          showsHorizontalScrollIndicator={false}
        >
          <View style={styles.titleSection}>
            <Text style={styles.title}>{t.title}</Text>
          </View>

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
                  <View style={styles.rankContainer}>
                    {isFirstPlace ? (
                      <Text style={styles.rankEmoji}>{'🥇'}</Text>
                    ) : rank === 2 ? (
                      <Text style={styles.rankEmoji}>{'🥈'}</Text>
                    ) : rank === 3 ? (
                      <Text style={styles.rankEmoji}>{'🥉'}</Text>
                    ) : (
                      <Text style={styles.rankNumber}>{rank}</Text>
                    )}
                  </View>

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

          {totalPoints != null && (
            <View style={styles.totalPointsBanner}>
              <Text style={styles.totalPointsLabel}>{t.totalPoints}</Text>
              <Text style={styles.totalPointsValue}>{totalPoints.toLocaleString()}</Text>
            </View>
          )}

          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.rematchButton}
              onPress={handleRematch}
              accessibilityRole="button"
              accessibilityLabel={t.rematch}
            >
              <Text style={styles.rematchButtonText}>{t.rematch}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.backButton}
              onPress={handleBackToHome}
              accessibilityRole="button"
              accessibilityLabel={t.backToMenu}
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
  scoreboard: {
    width: '100%',
    marginBottom: 20,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.secondary,
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    borderWidth: 2,
    borderColor: colors.border,
    width: '50%',
    minHeight: 100,
    alignSelf: 'center',
    overflow: 'hidden',
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
    width: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankEmoji: {
    fontSize: 36,
  },
  rankNumber: {
    fontSize: 26,
    fontWeight: 'bold',
    color: colors.foreground,
  },
  avatarContainer: {
    marginLeft: 10,
    marginRight: 10,
  },
  avatarCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
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
    fontSize: 32,
  },
  playerInfo: {
    flex: 1,
    alignItems: 'flex-end',
  },
  playerName: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.foreground,
    marginBottom: 2,
  },
  playerNameWinner: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.primaryForeground,
  },
  playerScore: {
    fontSize: 16,
    color: colors.mutedForeground,
    marginBottom: 6,
  },
  playerScoreWinner: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.primaryForeground,
  },
  totalPointsBanner: {
    alignItems: 'center',
    marginBottom: 24,
    paddingVertical: 14,
    paddingHorizontal: 28,
    backgroundColor: colors.secondary,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.gold,
    alignSelf: 'center',
    minWidth: 180,
  },
  totalPointsLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.mutedForeground,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  totalPointsValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.gold,
  },
  actions: {
    width: '100%',
    gap: 12,
    alignItems: 'center',
  },
  rematchButton: {
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
  },
  rematchButtonText: {
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
