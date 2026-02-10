import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, StatusBar } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { useGameEngine } from '../hooks/useGameEngine';
import { GameBoard } from '../components/GameBoard';
import { colors } from '../theme/colors';
import { getPersonalPileSize, Player } from '../models/Player';
import { loadLanguagePreference } from '../utils/storage';

type Language = 'he' | 'en';

// Available avatars for different players
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
  Game: { numPlayers: number; playerName?: string; playerAvatar?: string; gameMode?: 'practice' | 'private' | 'random' };
  Scoreboard: { players: Array<{ name: string; avatar?: string; score: number }> };
  WaitingRoom: { gameMode: 'random'; numPlayers: number; playerName: string; playerAvatar: string };
};

type GameScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Game'>;
type GameScreenRouteProp = RouteProp<RootStackParamList, 'Game'>;

interface GameScreenProps {
  navigation: GameScreenNavigationProp;
  route: GameScreenRouteProp;
}

/**
 * Calculate player score based on remaining cards in personal pile
 * Winner gets 100, others get score based on ranking (fewer cards = higher rank = higher score)
 * Score distribution by rank:
 * - 1st place (winner): 100
 * - 2nd place: 80
 * - 3rd place: 60
 * - 4th place: 40
 */
function calculateScore(player: Player, rank: number, totalPlayers: number): number {
  if (rank === 1) {
    return 100; // Winner
  }
  
  // Score distribution based on rank
  // Fewer cards = better rank = higher score
  const scoreByRank: Record<number, number> = {
    2: 80,
    3: 60,
    4: 40,
  };
  
  return scoreByRank[rank] || Math.max(10, 100 - (rank * 20));
}

/**
 * Main game screen
 */
export function GameScreen({ navigation, route }: GameScreenProps) {
  const { numPlayers, playerName, playerAvatar, gameMode } = route.params;
  const gameEngine = useGameEngine();
  const hasNavigatedToScoreboard = useRef(false);
  const [language, setLanguage] = useState<Language>('he');

  // Load language preference
  useEffect(() => {
    loadLanguagePreference().then(lang => {
      setLanguage(lang);
    });
  }, []);

  const t = translations[language];

  // Start the game when the screen loads or when numPlayers changes
  useEffect(() => {
    // Start game when component mounts or numPlayers changes
    if (numPlayers) {
      console.log('GameScreen: Starting game with', numPlayers, 'players');
      
      // Create player configs
      const playerConfigs: Array<{ name: string; avatar?: string }> = [];
      
      // First player is the human player (if provided)
      // Use provided avatar or assign first avatar
      const firstPlayerAvatar = playerAvatar || AVATARS[0];
      if (playerName) {
        playerConfigs.push({ name: playerName, avatar: firstPlayerAvatar });
      } else {
        playerConfigs.push({ name: `${t.player} 1`, avatar: firstPlayerAvatar });
      }
      
      // Add other players (for practice mode, they'll be AI; for private, they'll be other humans)
      // Assign different avatars, skipping the one used by first player
      let avatarOffset = 1; // Start from second avatar to avoid duplicate
      for (let i = 1; i < numPlayers; i++) {
        if (gameMode === 'practice') {
          // AI players for practice mode - assign different avatars
          const avatarIndex = (avatarOffset - 1) % AVATARS.length;
          // For 2-player games, use simple name without number
          const playerName = numPlayers === 2 ? t.computer : `${t.computer} ${i}`;
          playerConfigs.push({ name: playerName, avatar: AVATARS[avatarIndex] });
        } else {
          // Other human players for private mode - assign different avatars
          const avatarIndex = avatarOffset % AVATARS.length;
          // For 2-player games, use simple name without number
          const playerName = numPlayers === 2 ? t.player : `${t.player} ${i + 1}`;
          playerConfigs.push({ name: playerName, avatar: AVATARS[avatarIndex] });
        }
        avatarOffset++;
      }
      
      gameEngine.startGame(numPlayers, playerConfigs);
    }
    // startGame is stable (useCallback with empty deps), so it's safe to omit from deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [numPlayers, playerName, playerAvatar, gameMode, language, t]);

  // Navigate to scoreboard when game ends
  useEffect(() => {
    if (gameEngine.isGameOver && gameEngine.winner && !hasNavigatedToScoreboard.current) {
      hasNavigatedToScoreboard.current = true;
      
      // Sort players by remaining cards (fewer cards = better rank)
      const playersSortedByCards = [...gameEngine.players].sort((a, b) => {
        const aCards = getPersonalPileSize(a);
        const bCards = getPersonalPileSize(b);
        return aCards - bCards; // Ascending: fewer cards first
      });
      
      // Calculate scores based on rank
      const playersWithScores = playersSortedByCards.map((player, index) => ({
        name: player.name,
        avatar: player.avatar,
        score: calculateScore(player, index + 1, gameEngine.players.length),
      }));
      
      // Navigate to scoreboard
      navigation.replace('Scoreboard', { players: playersWithScores });
    }
  }, [gameEngine.isGameOver, gameEngine.winner, gameEngine.players, navigation]);

  // Handle new game - reset and go back to home
  const handleNewGame = () => {
    hasNavigatedToScoreboard.current = false;
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
    backgroundColor: colors.background, // Felt green background
  },
});

export default GameScreen;
