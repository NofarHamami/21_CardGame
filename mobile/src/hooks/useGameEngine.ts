import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import {
  GameState,
  GameEvent,
  setupGame,
  playToCenter,
  playToStorage,
  endTurn,
  canEndTurn,
  forceEndTurnOnTimeout,
  getCurrentPlayer,
  getStockPileSize,
  createInitialState,
  drawCardFromStockDelayed,
  updatePlayerNameAndAvatar,
} from '../engine/GameEngine';
import { findBestMove, executeAIMove, AIDifficulty } from '../engine/AIPlayer';
import { NUM_CENTER_PILES } from '../constants';
import { CardSource, Card, Player, CenterPile } from '../models';
import { logger } from '../utils/logger';
import { saveGame, clearSavedGame } from '../utils/gameSave';
import { playCardTapSound, playCardPlaySound, playInvalidMoveSound, playPileCompleteSound } from '../utils/sounds';
import { startRecording, recordMove, getCurrentMoves, saveReplay, GameReplay, ReplayMove } from '../utils/gameReplay';

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
  turnTimeRemaining: number | null;

  startGame: (numPlayers: number, playerConfigs?: Array<{ name: string; avatar?: string; isAI?: boolean }>, aiDifficulty?: AIDifficulty) => void;
  setTimedMode: (enabled: boolean) => void;
  selectCard: (card: Card, source: CardSource, sourceIndex: number) => void;
  clearSelection: () => void;
  playSelectedToCenter: (centerPileIndex: number) => boolean;
  playSelectedToStorage: (storageIndex: number) => boolean;
  playDirectToCenter: (source: CardSource, sourceIndex: number, centerPileIndex: number) => boolean;
  playDirectToStorage: (source: CardSource, sourceIndex: number, storageIndex: number) => boolean;
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
  const [timedModeEnabled, setTimedModeEnabled] = useState(false);
  const [turnTimeRemaining, setTurnTimeRemaining] = useState<number | null>(null);
  const turnTimerRef = useRef<NodeJS.Timeout | null>(null);
  const delayedDrawTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const prevPlayerIndexRef = useRef<number>(-1);
  const aiTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const gameModeRef = useRef<string>('practice');
  const TURN_TIME_SECONDS = 30;

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

        const move = findBestMove(prevState, prevState.aiDifficulty as AIDifficulty || 'medium');
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

  // Sound effects on events (only for human player moves)
  useEffect(() => {
    if (!gameState.lastEvent) return;
    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    if (currentPlayer?.isAI) return;
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

  // Turn timer
  useEffect(() => {
    if (turnTimerRef.current) {
      clearInterval(turnTimerRef.current);
      turnTimerRef.current = null;
    }
    if (!timedModeEnabled || !gameState.gameStarted || gameState.gameOver) {
      setTurnTimeRemaining(null);
      return;
    }
    const current = gameState.players[gameState.currentPlayerIndex];
    if (current?.isAI) {
      setTurnTimeRemaining(null);
      return;
    }
    setTurnTimeRemaining(TURN_TIME_SECONDS);
    turnTimerRef.current = setInterval(() => {
      setTurnTimeRemaining(prev => {
        if (prev === null) return null;
        if (prev <= 1) {
          clearInterval(turnTimerRef.current!);
          turnTimerRef.current = null;
          setGameState(prevState => forceEndTurnOnTimeout(prevState));
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (turnTimerRef.current) {
        clearInterval(turnTimerRef.current);
        turnTimerRef.current = null;
      }
    };
  }, [gameState.currentPlayerIndex, gameState.gameStarted, gameState.gameOver, timedModeEnabled]);

  const currentPlayer = useMemo(() => getCurrentPlayer(gameState), [gameState]);
  const stockPileSize = useMemo(() => getStockPileSize(gameState), [gameState]);
  const canEndCurrentTurn = useMemo(() => canEndTurn(gameState), [gameState]);

  const startGame = useCallback((numPlayers: number, playerConfigs?: Array<{ name: string; avatar?: string; isAI?: boolean }>, aiDifficulty?: AIDifficulty) => {
    try {
      logger.debug('Starting game with', numPlayers, 'players, AI difficulty:', aiDifficulty || 'medium');
      startRecording();
      const newState = setupGame(numPlayers, playerConfigs, aiDifficulty);
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
    if (success) {
      const player = gameState.players[gameState.currentPlayerIndex];
      recordMove({
        turn: turnCount,
        playerIndex: gameState.currentPlayerIndex,
        playerName: player?.name || '',
        type: 'playToCenter',
        source: selectedCard.source,
        sourceIndex: selectedCard.sourceIndex,
        destination: 'center',
        destinationIndex: centerPileIndex,
        cardRank: selectedCard.card.rank,
        cardSuit: selectedCard.card.suit as string,
        timestamp: Date.now(),
      });
    }
    setGameState(newState);
    if (success) setSelectedCard(null);
    return success;
  }, [gameState, selectedCard, turnCount]);

  const playSelectedToStorage = useCallback((storageIndex: number): boolean => {
    if (!selectedCard) return false;

    const newState = playToStorage(
      gameState,
      selectedCard.source,
      selectedCard.sourceIndex,
      storageIndex
    );

    const success = newState.lastEvent?.type !== 'INVALID_MOVE';
    if (success) {
      const player = gameState.players[gameState.currentPlayerIndex];
      recordMove({
        turn: turnCount,
        playerIndex: gameState.currentPlayerIndex,
        playerName: player?.name || '',
        type: 'playToStorage',
        source: selectedCard.source,
        sourceIndex: selectedCard.sourceIndex,
        destination: 'storage',
        destinationIndex: storageIndex,
        cardRank: selectedCard.card.rank,
        cardSuit: selectedCard.card.suit as string,
        timestamp: Date.now(),
      });
    }
    setGameState(newState);
    if (success) setSelectedCard(null);
    return success;
  }, [gameState, selectedCard, turnCount]);

  const playDirectToCenter = useCallback((source: CardSource, sourceIndex: number, centerPileIndex: number): boolean => {
    const newState = playToCenter(gameState, source, sourceIndex, centerPileIndex);
    const success = newState.lastEvent?.type !== 'INVALID_MOVE';
    if (success) {
      const player = gameState.players[gameState.currentPlayerIndex];
      recordMove({
        turn: turnCount,
        playerIndex: gameState.currentPlayerIndex,
        playerName: player?.name || '',
        type: 'playToCenter',
        source,
        sourceIndex,
        destination: 'center',
        destinationIndex: centerPileIndex,
        timestamp: Date.now(),
      });
    }
    setGameState(newState);
    if (success) setSelectedCard(null);
    return success;
  }, [gameState, turnCount]);

  const playDirectToStorage = useCallback((source: CardSource, sourceIndex: number, storageIndex: number): boolean => {
    const newState = playToStorage(gameState, source, sourceIndex, storageIndex);
    const success = newState.lastEvent?.type !== 'INVALID_MOVE';
    if (success) {
      const player = gameState.players[gameState.currentPlayerIndex];
      recordMove({
        turn: turnCount,
        playerIndex: gameState.currentPlayerIndex,
        playerName: player?.name || '',
        type: 'playToStorage',
        source,
        sourceIndex,
        destination: 'storage',
        destinationIndex: storageIndex,
        timestamp: Date.now(),
      });
    }
    setGameState(newState);
    if (success) setSelectedCard(null);
    return success;
  }, [gameState, turnCount]);

  const endCurrentTurn = useCallback((): boolean => {
    const player = gameState.players[gameState.currentPlayerIndex];
    const newState = endTurn(gameState);
    const success = newState.lastEvent?.type !== 'INVALID_MOVE';
    if (success) {
      recordMove({
        turn: turnCount,
        playerIndex: gameState.currentPlayerIndex,
        playerName: player?.name || '',
        type: 'endTurn',
        timestamp: Date.now(),
      });
    }
    setGameState(newState);
    if (success) setSelectedCard(null);
    return success;
  }, [gameState, turnCount]);

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
    turnTimeRemaining,
    startGame,
    setTimedMode: setTimedModeEnabled,
    selectCard,
    clearSelection,
    playSelectedToCenter,
    playSelectedToStorage,
    playDirectToCenter,
    playDirectToStorage,
    endCurrentTurn,
    resetGame,
    updatePlayerNameAndAvatar: updatePlayerNameAndAvatarCallback,
    loadState,
  };
}

export default useGameEngine;
