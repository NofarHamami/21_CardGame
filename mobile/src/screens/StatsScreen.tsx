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
import { colors } from '../theme/colors';
import { GameStats, loadGameStats, getWinRate, getAverageTurns } from '../utils/gameStats';
import { loadLanguagePreference } from '../utils/storage';
import { Achievement, loadAchievements } from '../utils/achievements';

type Language = 'he' | 'en';

const translations = {
  he: {
    title: 'סטטיסטיקות',
    gamesPlayed: 'משחקים',
    wins: 'ניצחונות',
    losses: 'הפסדים',
    winRate: 'אחוז ניצחון',
    currentStreak: 'רצף נוכחי',
    bestStreak: 'רצף שיא',
    avgTurns: 'תורות ממוצע',
    back: 'חזרה',
    noGames: 'עדיין לא שיחקת. התחל משחק!',
    achievements: 'הישגים',
    locked: 'נעול',
  },
  en: {
    title: 'Statistics',
    gamesPlayed: 'Games Played',
    wins: 'Wins',
    losses: 'Losses',
    winRate: 'Win Rate',
    currentStreak: 'Current Streak',
    bestStreak: 'Best Streak',
    avgTurns: 'Avg Turns',
    back: 'Back',
    noGames: "You haven't played yet. Start a game!",
    achievements: 'Achievements',
    locked: 'Locked',
  },
};

type RootStackParamList = {
  Home: undefined;
  Stats: undefined;
};

interface StatsScreenProps {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Stats'>;
}

export function StatsScreen({ navigation }: StatsScreenProps) {
  const [stats, setStats] = useState<GameStats | null>(null);
  const [language, setLanguage] = useState<Language>('he');
  const [achievements, setAchievements] = useState<Achievement[]>([]);

  useEffect(() => {
    loadLanguagePreference().then(setLanguage);
    loadGameStats().then(setStats);
    loadAchievements().then(setAchievements);
  }, []);

  const t = translations[language];

  if (!stats) {
    return (
      <View style={styles.container}>
        <Text style={styles.loading}>{language === 'he' ? 'טוען...' : 'Loading...'}</Text>
      </View>
    );
  }

  const winRate = getWinRate(stats);
  const avgTurns = getAverageTurns(stats);

  const statItems = [
    { label: t.gamesPlayed, value: stats.gamesPlayed.toString() },
    { label: t.wins, value: stats.gamesWon.toString() },
    { label: t.losses, value: stats.gamesLost.toString() },
    { label: t.winRate, value: `${winRate}%` },
    { label: t.currentStreak, value: stats.currentWinStreak.toString() },
    { label: t.bestStreak, value: stats.longestWinStreak.toString() },
    { label: t.avgTurns, value: avgTurns.toString() },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>{t.title}</Text>

        {stats.gamesPlayed === 0 ? (
          <Text style={styles.noGames}>{t.noGames}</Text>
        ) : (
          <View style={styles.grid}>
            {statItems.map((item, idx) => (
              <View key={idx} style={styles.statCard}>
                <Text style={styles.statValue}>{item.value}</Text>
                <Text style={styles.statLabel}>{item.label}</Text>
              </View>
            ))}
          </View>
        )}

        {achievements.length > 0 && (
          <>
            <Text style={styles.achievementsTitle}>{t.achievements}</Text>
            <View style={styles.achievementsGrid}>
              {achievements.map(ach => (
                <View key={ach.id} style={[styles.achievementCard, !ach.unlocked && styles.achievementLocked]}>
                  <Text style={styles.achievementIcon}>{ach.unlocked ? ach.icon : '🔒'}</Text>
                  <Text style={[styles.achievementTitle, !ach.unlocked && styles.achievementTitleLocked]}>
                    {language === 'he' ? ach.titleHe : ach.titleEn}
                  </Text>
                  <Text style={styles.achievementDesc}>
                    {language === 'he' ? ach.descHe : ach.descEn}
                  </Text>
                </View>
              ))}
            </View>
          </>
        )}

        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel={t.back}
        >
          <Text style={styles.backBtnText}>{t.back}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: 24,
    alignItems: 'center',
    flexGrow: 1,
  },
  loading: {
    color: colors.foreground,
    fontSize: 16,
    marginTop: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.gold,
    marginTop: 20,
    marginBottom: 32,
  },
  noGames: {
    color: colors.mutedForeground,
    fontSize: 16,
    textAlign: 'center',
    marginTop: 40,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
    maxWidth: 400,
  },
  statCard: {
    backgroundColor: colors.secondary,
    borderRadius: 12,
    padding: 16,
    minWidth: 110,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.gold,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: colors.mutedForeground,
    textAlign: 'center',
  },
  achievementsTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.gold,
    marginTop: 28,
    marginBottom: 16,
    textAlign: 'center',
  },
  achievementsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
    maxWidth: 500,
  },
  achievementCard: {
    backgroundColor: colors.secondary,
    borderRadius: 10,
    padding: 12,
    width: 110,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  achievementLocked: {
    opacity: 0.5,
  },
  achievementIcon: {
    fontSize: 28,
    marginBottom: 4,
  },
  achievementTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.gold,
    textAlign: 'center',
    marginBottom: 2,
  },
  achievementTitleLocked: {
    color: colors.mutedForeground,
  },
  achievementDesc: {
    fontSize: 10,
    color: colors.mutedForeground,
    textAlign: 'center',
  },
  backBtn: {
    marginTop: 32,
    backgroundColor: colors.secondary,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  backBtnText: {
    color: colors.foreground,
    fontSize: 16,
    fontWeight: '600',
  },
});

export default StatsScreen;
