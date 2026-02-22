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
import { findBestMove, executeAIMove } from '../engine/AIPlayer';
import { NUM_CENTER_PILES } from '../constants';
import { CardSource, Card, Player, CenterPile } from '../models';
import { logger } from '../utils/logger';
import { saveGame, clearSavedGame } from '../utils/gameSave';
import { playCardTapSound, playCardPlaySound, playInvalidMoveSound, playPileCompleteSound } from '../utils/sounds';

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
  gameState: GameState;
  currentPlayer: Player | null;
  isGameStarted: boolean;
  isGameOver: boolean;
  winner: Player | null;
  players: Player[];
  currentPlayerIndex: number;
  centerPiles: CenterPile[];
  stockPileSize: number;
  cardsPlayedThisTurn: number;
  canEndCurrentTurn: boolean;
  playedToCenterThisTurn: boolean;
  lastEvent: GameEvent | null;
  selectedCard: SelectedCard | null;
  turnCount: number;

  startGame: (numPlayers: number, playerConfigs?: Array<{ name: string; avatar?: string; isAI?: boolean }>) => void;
  selectCard: (card: Card, source: CardSource, sourceIndex: number) => void;
  clearSelection: () => void;
  playSelectedToCenter: (centerPileIndex: number) => boolean;
  playSelectedToStorage: (storageIndex: number) => boolean;
  endCurrentTurn: () => boolean;
  resetGame: () => void;
  updatePlayerNameAndAvatar: (playerIndex: number, name: string, avatar?: string) => void;
  loadState: (state: GameState) => void;
}

/**
 * React hook for managing the game engine state
 */
export function useGameEngine(): UseGameEngineReturn {
  const [gameState, setGameState] = useState<GameState>(createInitialState);
  const [selectedCard, setSelectedCard] = useState<SelectedCard | null>(null);
  const [turnCount, setTurnCount] = useState(0);
  const delayedDrawTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const prevPlayerIndexRef = useRef<number>(-1);
  const aiTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const gameModeRef = useRef<string>('practice');

  useEffect(() => {
    logger.debug('useGameEngine: currentPlayerIndex:', gameState.currentPlayerIndex, 'player:', getCurrentPlayer(gameState)?.name);
  }, [gameState.currentPlayerIndex, gameState.players]);

  useEffect(() => {
    if (selectedCard) {
      logger.debug('useGameEngine: Card selected -', selectedCard.card.rank, selectedCard.source, selectedCard.sourceIndex);
    }
  }, [selectedCard]);

  // Delayed card drawing
  useEffect(() => {
    if (delayedDrawTimeoutRef.current) {
      clearTimeout(delayedDrawTimeoutRef.current);
      delayedDrawTimeoutRef.current = null;
    }

    if (!gameState.gameStarted || gameState.gameOver) return;

    const currentPlayerIndex = gameState.currentPlayerIndex;
    const playerChanged = prevPlayerIndexRef.current !== currentPlayerIndex;
    prevPlayerIndexRef.current = currentPlayerIndex;

    if (playerChanged && currentPlayerIndex >= 0 && currentPlayerIndex < gameState.players.length) {
      const currentPlayer = gameState.players[currentPlayerIndex];
      if (currentPlayer && currentPlayer.hand.length < 5) {
        logger.debug(`useGameEngine: Scheduling delayed draw for ${currentPlayer.name}`);
        delayedDrawTimeoutRef.current = setTimeout(() => {
          setGameState(prevState => drawCardFromStockDelayed(prevState, currentPlayerIndex));
          delayedDrawTimeoutRef.current = null;
        }, 500);
      }

      if (playerChanged) {
        setTurnCount(c => c + 1);
      }
    }

    return () => {
      if (delayedDrawTimeoutRef.current) {
        clearTimeout(delayedDrawTimeoutRef.current);
        delayedDrawTimeoutRef.current = null;
      }
    };
  }, [gameState.currentPlayerIndex, gameState.gameStarted, gameState.gameOver, gameState.players]);

  // AI turn logic
  useEffect(() => {
    if (!gameState.gameStarted || gameState.gameOver) return;

    const current = gameState.players[gameState.currentPlayerIndex];
    if (!current?.isAI) return;

    // Clear any existing AI timeout
    if (aiTimeoutRef.current) {
      clearTimeout(aiTimeoutRef.current);
    }

    const executeNextAIMove = () => {
      setGameState(prevState => {
        const player = prevState.players[prevState.currentPlayerIndex];
        if (!player?.isAI || prevState.gameOver) return prevState;

        const move = findBestMove(prevState);
        if (!move) {
          logger.debug('AI: No move found, stuck');
          return prevState;
        }

        logger.debug('AI: Executing move', move.type);
        const newState = executeAIMove(prevState, move);

        // If still AI's turn, schedule next move
        const stillAITurn =
          !newState.gameOver &&
          newState.currentPlayerIndex === prevState.currentPlayerIndex &&
          move.type !== 'endTurn' &&
          move.type !== 'storage';

        if (stillAITurn) {
          aiTimeoutRef.current = setTimeout(executeNextAIMove, 600);
        }

        return newState;
      });
    };

    // Initial delay before AI starts playing
    aiTimeoutRef.current = setTimeout(executeNextAIMove, 1200);

    return () => {
      if (aiTimeoutRef.current) {
        clearTimeout(aiTimeoutRef.current);
        aiTimeoutRef.current = null;
      }
    };
  }, [gameState.currentPlayerIndex, gameState.gameStarted, gameState.gameOver]);

  // Auto-save game state on turn changes
  useEffect(() => {
    if (gameState.gameStarted && !gameState.gameOver) {
      saveGame(gameState, gameModeRef.current);
    }
    if (gameState.gameOver) {
      clearSavedGame();
    }
  }, [gameState.currentPlayerIndex, gameState.gameOver]);

  // Sound effects on events
  useEffect(() => {
    if (!gameState.lastEvent) return;
    switch (gameState.lastEvent.type) {
      case 'CARD_PLAYED':
        playCardPlaySound();
        break;
      case 'PILE_COMPLETED':
        playPileCompleteSound();
        break;
      case 'INVALID_MOVE':
        playInvalidMoveSound();
        break;
    }
  }, [gameState.lastEvent]);

  const currentPlayer = useMemo(() => getCurrentPlayer(gameState), [gameState]);
  const stockPileSize = useMemo(() => getStockPileSize(gameState), [gameState]);
  const canEndCurrentTurn = useMemo(() => canEndTurn(gameState), [gameState]);

  const startGame = useCallback((numPlayers: number, playerConfigs?: Array<{ name: string; avatar?: string; isAI?: boolean }>) => {
    try {
      logger.debug('Starting game with', numPlayers, 'players');
      const newState = setupGame(numPlayers, playerConfigs);
      setGameState(newState);
      setSelectedCard(null);
      setTurnCount(0);
    } catch (error) {
      logger.error('Error in startGame:', error);
      throw error;
    }
  }, []);

  const resetGame = useCallback(() => {
    if (delayedDrawTimeoutRef.current) {
      clearTimeout(delayedDrawTimeoutRef.current);
      delayedDrawTimeoutRef.current = null;
    }
    if (aiTimeoutRef.current) {
      clearTimeout(aiTimeoutRef.current);
      aiTimeoutRef.current = null;
    }
    clearSavedGame();
    setGameState(createInitialState());
    setSelectedCard(null);
    setTurnCount(0);
    prevPlayerIndexRef.current = -1;
  }, []);

  const selectCard = useCallback((card: Card, source: CardSource, sourceIndex: number) => {
    playCardTapSound();
    setSelectedCard({ card, source, sourceIndex });
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedCard(null);
  }, []);

  const playSelectedToCenter = useCallback((centerPileIndex: number): boolean => {
    if (!selectedCard) return false;

    const newState = playToCenter(
      gameState,
      selectedCard.source,
      selectedCard.sourceIndex,
      centerPileIndex
    );

    const success = newState.lastEvent?.type !== 'INVALID_MOVE';
    setGameState(newState);
    if (success) setSelectedCard(null);
    return success;
  }, [gameState, selectedCard]);

  const playSelectedToStorage = useCallback((storageIndex: number): boolean => {
    if (!selectedCard) return false;

    const newState = playToStorage(
      gameState,
      selectedCard.source,
      selectedCard.sourceIndex,
      storageIndex
    );

    const success = newState.lastEvent?.type !== 'INVALID_MOVE';
    setGameState(newState);
    if (success) setSelectedCard(null);
    return success;
  }, [gameState, selectedCard]);

  const endCurrentTurn = useCallback((): boolean => {
    const newState = endTurn(gameState);
    const success = newState.lastEvent?.type !== 'INVALID_MOVE';
    setGameState(newState);
    if (success) setSelectedCard(null);
    return success;
  }, [gameState]);

  const updatePlayerNameAndAvatarCallback = useCallback((playerIndex: number, name: string, avatar?: string) => {
    setGameState(prevState => updatePlayerNameAndAvatar(prevState, playerIndex, name, avatar));
  }, []);

  const loadState = useCallback((state: GameState) => {
    setGameState(state);
    setSelectedCard(null);
    prevPlayerIndexRef.current = state.currentPlayerIndex;
  }, []);

  return {
    gameState,
    currentPlayer,
    isGameStarted: gameState.gameStarted,
    isGameOver: gameState.gameOver,
    winner: gameState.winner,
    players: gameState.players,
    currentPlayerIndex: gameState.currentPlayerIndex,
    centerPiles: gameState.centerPiles,
    stockPileSize,
    cardsPlayedThisTurn: gameState.cardsPlayedThisTurn,
    canEndCurrentTurn,
    playedToCenterThisTurn: gameState.playedToCenterThisTurn,
    lastEvent: gameState.lastEvent,
    selectedCard,
    turnCount,
    startGame,
    selectCard,
    clearSelection,
    playSelectedToCenter,
    playSelectedToStorage,
    endCurrentTurn,
    resetGame,
    updatePlayerNameAndAvatar: updatePlayerNameAndAvatarCallback,
    loadState,
  };
}

export default useGameEngine;
