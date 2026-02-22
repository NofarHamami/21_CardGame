import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, StatusBar } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { useGameEngine } from '../hooks/useGameEngine';
import { GameBoard } from '../components/GameBoard';
import { colors } from '../theme/colors';
import { getPersonalPileSize, Player } from '../models/Player';
import { loadLanguagePreference } from '../utils/storage';
import { recordGameResult } from '../utils/gameStats';
import { playWinSound, playLoseSound } from '../utils/sounds';

type Language = 'he' | 'en';

const AVATARS = ['😎', '🤠', '🎩', '👑', '🎭', '🦸', '🧙', '🦊', '🐱', '🐼', '🦁', '🐯'];

const translations = {
  he: {
    player: 'שחקן',
    computer: 'מחשב',
  },
  en: {
    player: 'Player',
    computer: 'Computer',
  },
};

type RootStackParamList = {
  Home: undefined;
  PlayerSetup: { gameMode: 'practice' | 'private' | 'random'; numPlayers: number };
  Game: {
    numPlayers: number;
    playerName?: string;
    playerAvatar?: string;
    gameMode?: 'practice' | 'private' | 'random';
    resumeState?: string;
  };
  Scoreboard: { players: Array<{ name: string; avatar?: string; score: number }> };
  WaitingRoom: { gameMode: 'random'; numPlayers: number; playerName: string; playerAvatar: string };
};

type GameScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Game'>;
type GameScreenRouteProp = RouteProp<RootStackParamList, 'Game'>;

interface GameScreenProps {
  navigation: GameScreenNavigationProp;
  route: GameScreenRouteProp;
}

function calculateScore(player: Player, rank: number, totalPlayers: number): number {
  if (rank === 1) return 100;
  const scoreByRank: Record<number, number> = { 2: 80, 3: 60, 4: 40 };
  return scoreByRank[rank] || Math.max(10, 100 - (rank * 20));
}

export function GameScreen({ navigation, route }: GameScreenProps) {
  const { numPlayers, playerName, playerAvatar, gameMode, resumeState } = route.params;
  const gameEngine = useGameEngine();
  const hasNavigatedToScoreboard = useRef(false);
  const hasRecordedResult = useRef(false);
  const [language, setLanguage] = useState<Language>('he');

  useEffect(() => {
    loadLanguagePreference().then(lang => setLanguage(lang));
  }, []);

  const t = translations[language];

  // Resume saved game if provided
  useEffect(() => {
    if (resumeState) {
      try {
        const state = JSON.parse(resumeState);
        gameEngine.loadState(state);
        return;
      } catch { /* fall through to normal start */ }
    }

    if (numPlayers) {
      const playerConfigs: Array<{ name: string; avatar?: string; isAI?: boolean }> = [];
      const firstPlayerAvatar = playerAvatar || AVATARS[0];

      playerConfigs.push({
        name: playerName || `${t.player} 1`,
        avatar: firstPlayerAvatar,
      });

      let avatarOffset = 1;
      for (let i = 1; i < numPlayers; i++) {
        const isAI = gameMode === 'practice';
        const avatarIndex = (avatarOffset - 1) % AVATARS.length;
        const name = isAI
          ? (numPlayers === 2 ? t.computer : `${t.computer} ${i}`)
          : (numPlayers === 2 ? t.player : `${t.player} ${i + 1}`);

        playerConfigs.push({
          name,
          avatar: AVATARS[avatarIndex],
          isAI,
        });
        avatarOffset++;
      }

      gameEngine.startGame(numPlayers, playerConfigs);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [numPlayers, playerName, playerAvatar, gameMode, language, t]);

  // Navigate to scoreboard and record stats when game ends
  useEffect(() => {
    if (gameEngine.isGameOver && gameEngine.winner && !hasNavigatedToScoreboard.current) {
      hasNavigatedToScoreboard.current = true;

      // Record stats
      if (!hasRecordedResult.current) {
        hasRecordedResult.current = true;
        const humanWon = !gameEngine.winner.isAI;
        if (humanWon) {
          playWinSound();
        } else {
          playLoseSound();
        }
        recordGameResult(humanWon, gameEngine.turnCount);
      }

      const playersSortedByCards = [...gameEngine.players].sort((a, b) => {
        return getPersonalPileSize(a) - getPersonalPileSize(b);
      });

      const playersWithScores = playersSortedByCards.map((player, index) => ({
        name: player.name,
        avatar: player.avatar,
        score: calculateScore(player, index + 1, gameEngine.players.length),
      }));

      navigation.replace('Scoreboard', { players: playersWithScores });
    }
  }, [gameEngine.isGameOver, gameEngine.winner, gameEngine.players, gameEngine.turnCount, navigation]);

  const handleNewGame = () => {
    hasNavigatedToScoreboard.current = false;
    hasRecordedResult.current = false;
    gameEngine.resetGame();
    navigation.navigate('Home');
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />
      <GameBoard gameEngine={gameEngine} onNewGame={handleNewGame} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
});

export default GameScreen;
