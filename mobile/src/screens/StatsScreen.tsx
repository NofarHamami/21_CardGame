import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors } from '../theme/colors';
import { GameStats, loadGameStats, getWinRate, getAverageTurns } from '../utils/gameStats';
import { loadLanguagePreference } from '../utils/storage';

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

  useEffect(() => {
    loadLanguagePreference().then(setLanguage);
    loadGameStats().then(setStats);
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

      <TouchableOpacity
        style={styles.backBtn}
        onPress={() => navigation.goBack()}
        accessibilityRole="button"
        accessibilityLabel={t.back}
      >
        <Text style={styles.backBtnText}>{t.back}</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: 24,
    alignItems: 'center',
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
