import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import {
  GameState,
  GameEvent,
  setupGame,
  playToCenter,
  playToStorage,
  endTurn,
  canEndTurn,
  getCurrentPlayer,
  getStockPileSize,
  createInitialState,
  drawCardFromStockDelayed,
  updatePlayerNameAndAvatar,
} from '../engine/GameEngine';
import { NUM_CENTER_PILES } from '../constants';
import { CardSource, Card, Player, CenterPile } from '../models';

/**
 * Selected card state
 */
export interface SelectedCard {
  card: Card;
  source: CardSource;
  sourceIndex: number;
}

/**
 * Hook return type
 */
export interface UseGameEngineReturn {
  // Game state
  gameState: GameState;
  currentPlayer: Player | null;
  isGameStarted: boolean;
  isGameOver: boolean;
  winner: Player | null;
  
  // Players
  players: Player[];
  currentPlayerIndex: number;
  
  // Center piles
  centerPiles: CenterPile[];
  stockPileSize: number;
  
  // Turn info
  cardsPlayedThisTurn: number;
  canEndCurrentTurn: boolean;
  playedToCenterThisTurn: boolean;
  
  // Last event
  lastEvent: GameEvent | null;
  
  // Selected card
  selectedCard: SelectedCard | null;
  
  // Actions
  startGame: (numPlayers: number, playerConfigs?: Array<{ name: string; avatar?: string }>) => void;
  selectCard: (card: Card, source: CardSource, sourceIndex: number) => void;
  clearSelection: () => void;
  playSelectedToCenter: (centerPileIndex: number) => boolean;
  playSelectedToStorage: (storageIndex: number) => boolean;
  endCurrentTurn: () => boolean;
  resetGame: () => void;
  updatePlayerNameAndAvatar: (playerIndex: number, name: string, avatar?: string) => void;
}

/**
 * React hook for managing the game engine state
 */
export function useGameEngine(): UseGameEngineReturn {
  const [gameState, setGameState] = useState<GameState>(createInitialState);
  const [selectedCard, setSelectedCard] = useState<SelectedCard | null>(null);
  const delayedDrawTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const prevPlayerIndexRef = useRef<number>(-1);

  // Debug: Log state changes
  React.useEffect(() => {
    console.log('useGameEngine: gameState changed - currentPlayerIndex:', gameState.currentPlayerIndex, 'currentPlayer:', getCurrentPlayer(gameState)?.name);
  }, [gameState.currentPlayerIndex, gameState.players]);

  // Debug: Log selected card changes
  React.useEffect(() => {
    if (selectedCard) {
      console.log('useGameEngine: Card selected - rank:', selectedCard.card.rank, 'source:', selectedCard.source, 'index:', selectedCard.sourceIndex);
    } else {
      console.log('useGameEngine: Card selection cleared');
    }
  }, [selectedCard]);

  // Handle delayed card drawing for all players
  useEffect(() => {
    // Clear any existing timeout
    if (delayedDrawTimeoutRef.current) {
      clearTimeout(delayedDrawTimeoutRef.current);
      delayedDrawTimeoutRef.current = null;
    }

    // Only handle delayed drawing if game is started and not over
    if (!gameState.gameStarted || gameState.gameOver) {
      return;
    }

    const currentPlayerIndex = gameState.currentPlayerIndex;
    const playerChanged = prevPlayerIndexRef.current !== currentPlayerIndex;
    prevPlayerIndexRef.current = currentPlayerIndex;

    // Apply delayed drawing for all players when their turn starts
    if (playerChanged && currentPlayerIndex >= 0 && currentPlayerIndex < gameState.players.length) {
      const currentPlayer = gameState.players[currentPlayerIndex];
      if (currentPlayer && currentPlayer.hand.length < 5) {
        console.log(`useGameEngine: Player ${currentPlayerIndex + 1} (${currentPlayer.name}) turn started, scheduling delayed card draw in 2 seconds`);
        
        // Draw cards after 0.5 seconds
        delayedDrawTimeoutRef.current = setTimeout(() => {
          console.log(`useGameEngine: Executing delayed card draw for player ${currentPlayerIndex + 1}`);
          setGameState(prevState => {
            const newState = drawCardFromStockDelayed(prevState, currentPlayerIndex);
            return newState;
          });
          delayedDrawTimeoutRef.current = null;
        }, 500);
      }
    }

    // Cleanup timeout on unmount or when dependencies change
    return () => {
      if (delayedDrawTimeoutRef.current) {
        clearTimeout(delayedDrawTimeoutRef.current);
        delayedDrawTimeoutRef.current = null;
      }
    };
  }, [gameState.currentPlayerIndex, gameState.gameStarted, gameState.gameOver, gameState.players]);

  // Derived state
  const currentPlayer = useMemo(() => getCurrentPlayer(gameState), [gameState]);
  const stockPileSize = useMemo(() => getStockPileSize(gameState), [gameState]);
  const canEndCurrentTurn = useMemo(() => canEndTurn(gameState), [gameState]);

  // Start a new game
  const startGame = useCallback((numPlayers: number, playerConfigs?: Array<{ name: string; avatar?: string }>) => {
    try {
      console.log('Starting game with', numPlayers, 'players');
      const newState = setupGame(numPlayers, playerConfigs);
      console.log('Game setup complete, gameStarted:', newState.gameStarted, 'players:', newState.players.length);
      setGameState(newState);
      setSelectedCard(null);
    } catch (error) {
      console.error('Error in startGame:', error);
      throw error;
    }
  }, []);

  // Reset game to initial state
  const resetGame = useCallback(() => {
    // Clear any pending delayed draw timeout
    if (delayedDrawTimeoutRef.current) {
      clearTimeout(delayedDrawTimeoutRef.current);
      delayedDrawTimeoutRef.current = null;
    }
    setGameState(createInitialState());
    setSelectedCard(null);
    prevPlayerIndexRef.current = -1;
  }, []);

  // Select a card
  const selectCard = useCallback((card: Card, source: CardSource, sourceIndex: number) => {
    console.log('selectCard: Selecting card:', card.rank, 'from source:', source, 'index:', sourceIndex);
    setSelectedCard({ card, source, sourceIndex });
  }, []);

  // Clear selection
  const clearSelection = useCallback(() => {
    setSelectedCard(null);
  }, []);

  // Play selected card to center pile
  const playSelectedToCenter = useCallback((centerPileIndex: number): boolean => {
    if (!selectedCard) {
      console.log('playSelectedToCenter: No card selected');
      return false;
    }

    console.log('playSelectedToCenter: Attempting to play card:', selectedCard.card.rank, 'from source:', selectedCard.source, 'to pile:', centerPileIndex);
    console.log('playSelectedToCenter: Current pile state before play:', gameState.centerPiles[centerPileIndex]?.expectedNextValue, 'cards:', gameState.centerPiles[centerPileIndex]?.cards.length);

    const newState = playToCenter(
      gameState,
      selectedCard.source,
      selectedCard.sourceIndex,
      centerPileIndex
    );

    // Check if move was successful (no INVALID_MOVE event)
    const success = newState.lastEvent?.type !== 'INVALID_MOVE';
    console.log('playSelectedToCenter: Move success:', success, 'event type:', newState.lastEvent?.type);
    if (!success && newState.lastEvent?.type === 'INVALID_MOVE') {
      console.log('playSelectedToCenter: Error message:', newState.lastEvent.message);
    }
    
    setGameState(newState);
    if (success) {
      setSelectedCard(null);
    }
    
    return success;
  }, [gameState, selectedCard]);

  // Play selected card to storage
  const playSelectedToStorage = useCallback((storageIndex: number): boolean => {
    if (!selectedCard) return false;

    console.log('playSelectedToStorage called - currentPlayerIndex:', gameState.currentPlayerIndex, 'storageIndex:', storageIndex);
    const newState = playToStorage(
      gameState,
      selectedCard.source,
      selectedCard.sourceIndex,
      storageIndex
    );

    // Check if move was successful
    const success = newState.lastEvent?.type !== 'INVALID_MOVE';
    console.log('playSelectedToStorage result - success:', success, 'newPlayerIndex:', newState.currentPlayerIndex, 'event:', newState.lastEvent?.type);
    
    setGameState(newState);
    if (success) {
      setSelectedCard(null);
    }
    
    return success;
  }, [gameState, selectedCard]);

  // End current turn
  const endCurrentTurn = useCallback((): boolean => {
    console.log('endCurrentTurn called - currentPlayerIndex:', gameState.currentPlayerIndex, 'cardsPlayedThisTurn:', gameState.cardsPlayedThisTurn);
    const newState = endTurn(gameState);
    const success = newState.lastEvent?.type !== 'INVALID_MOVE';
    
    console.log('endTurn result - success:', success, 'newPlayerIndex:', newState.currentPlayerIndex, 'event:', newState.lastEvent?.type);
    
    setGameState(newState);
    if (success) {
      setSelectedCard(null);
    }
    
    return success;
  }, [gameState]);

  // Update player name and avatar
  const updatePlayerNameAndAvatarCallback = useCallback((playerIndex: number, name: string, avatar?: string) => {
    console.log('updatePlayerNameAndAvatarCallback called:', { playerIndex, name, avatar });
    setGameState(prevState => {
      const newState = updatePlayerNameAndAvatar(prevState, playerIndex, name, avatar);
      console.log('Updated state - player name:', newState.players[playerIndex]?.name);
      return newState;
    });
  }, []);

  return {
    // Game state
    gameState,
    currentPlayer,
    isGameStarted: gameState.gameStarted,
    isGameOver: gameState.gameOver,
    winner: gameState.winner,
    
    // Players
    players: gameState.players,
    currentPlayerIndex: gameState.currentPlayerIndex,
    
    // Center piles
    centerPiles: gameState.centerPiles,
    stockPileSize,
    
    // Turn info
    cardsPlayedThisTurn: gameState.cardsPlayedThisTurn,
    canEndCurrentTurn,
    playedToCenterThisTurn: gameState.playedToCenterThisTurn,
    
    // Last event
    lastEvent: gameState.lastEvent,
    
    // Selected card
    selectedCard,
    
    // Actions
    startGame,
    selectCard,
    clearSelection,
    playSelectedToCenter,
    playSelectedToStorage,
    endCurrentTurn,
    resetGame,
    updatePlayerNameAndAvatar: updatePlayerNameAndAvatarCallback,
  };
}

export default useGameEngine;
