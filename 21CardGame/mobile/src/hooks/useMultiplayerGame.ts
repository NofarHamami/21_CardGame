import { useState, useEffect, useCallback, useRef } from 'react';
import { useGameEngine, UseGameEngineReturn } from './useGameEngine';
import {
  getMultiplayerService,
  MultiplayerEvent,
  MultiplayerService,
  PlayerInfo,
} from '../services/MultiplayerService';
import { GameState } from '../engine/GameEngine';
import { CardSource } from '../models';
import { logger } from '../utils/logger';

export interface UseMultiplayerGameReturn extends UseGameEngineReturn {
  isMultiplayer: true;
  localPlayerIndex: number;
  isMyTurn: boolean;
  roomCode: string | null;
  connectionStatus: 'connected' | 'disconnected' | 'reconnecting';
  remoteError: string | null;
}

interface MultiplayerGameOptions {
  roomCode?: string;
  playerId?: string;
  numPlayers: number;
  playerName: string;
  playerAvatar: string;
  gameMode: 'private' | 'random';
  enabled?: boolean;
}

/**
 * Wraps useGameEngine with multiplayer synchronization.
 * The host (playerIndex 0) runs the game engine locally and syncs state to others.
 * Non-host players apply moves locally (optimistic) and send move descriptions;
 * the host's synced state is authoritative.
 */
export function useMultiplayerGame(options: MultiplayerGameOptions): UseMultiplayerGameReturn {
  const enabled = options.enabled !== false;
  const [isNonHost, setIsNonHost] = useState(false);
  const engine = useGameEngine({ skipDelayedDraw: enabled && isNonHost });
  const [localPlayerIndex, setLocalPlayerIndex] = useState(0);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'reconnecting'>('connected');
  const [remoteError, setRemoteError] = useState<string | null>(null);
  const serviceRef = useRef<MultiplayerService | null>(null);
  const isHostRef = useRef(false);
  const localPlayerIndexRef = useRef(0);
  const gameInitializedRef = useRef(false);
  const pendingMoveRef = useRef<{ description: { type: string; [key: string]: any } } | null>(null);
  const isRemoteUpdateRef = useRef(false);

  const initGameFromPlayers = useCallback((players: PlayerInfo[], myIdx: number) => {
    if (gameInitializedRef.current) return;

    setLocalPlayerIndex(myIdx);
    localPlayerIndexRef.current = myIdx;
    isHostRef.current = myIdx === 0;
    setIsNonHost(myIdx !== 0);

    if (myIdx === 0) {
      gameInitializedRef.current = true;
      const playerConfigs = players
        .sort((a, b) => (a.playerIndex ?? 0) - (b.playerIndex ?? 0))
        .map((p) => ({
          name: p.name,
          avatar: p.avatar,
          isAI: false,
        }));
      logger.debug('useMultiplayerGame: Host starting game with', playerConfigs.length, 'players');
      engine.startGame(playerConfigs.length, playerConfigs);
    } else {
      logger.debug('useMultiplayerGame: Non-host waiting for state sync');
    }
  }, [engine]);

  useEffect(() => {
    if (!enabled) return;

    const service = getMultiplayerService();
    serviceRef.current = service;

    const idx = service.localPlayerIndex;
    setLocalPlayerIndex(idx);
    localPlayerIndexRef.current = idx;
    isHostRef.current = idx === 0;

    if (service.gameStarted && service.gamePlayers) {
      logger.debug('useMultiplayerGame: game already started, initializing from stored data');
      initGameFromPlayers(service.gamePlayers, service.localPlayerIndex);
    }

    const unsubscribe = service.addEventListener((event: MultiplayerEvent) => {
      switch (event.type) {
        case 'game_started':
          initGameFromPlayers(event.players, event.localPlayerIndex);
          break;
        case 'state_updated':
          if (event.state) {
            pendingMoveRef.current = null;
            isRemoteUpdateRef.current = true;
            logger.debug(`useMultiplayerGame: state_updated received - isHost=${isHostRef.current}, currentPlayerIndex=${event.state.currentPlayerIndex}`);
            if (isHostRef.current) {
              engine.loadState(event.state, { skipPrevPlayerUpdate: true });
            } else {
              engine.loadState(event.state);
            }
          }
          break;
        case 'move_rejected':
          setRemoteError(event.message);
          setTimeout(() => setRemoteError(null), 3000);
          break;
        case 'game_over':
          if (event.state) {
            isRemoteUpdateRef.current = true;
            engine.loadState(event.state, { skipPrevPlayerUpdate: isHostRef.current });
          }
          break;
        case 'disconnected':
          setConnectionStatus('disconnected');
          break;
        case 'error':
          setRemoteError(event.message);
          break;
      }
    });

    return () => {
      unsubscribe();
    };
  }, [enabled]);

  // Host syncs state to other players, but only for LOCAL changes (not re-syncing received state)
  useEffect(() => {
    if (!enabled || !isHostRef.current || !engine.isGameStarted) return;
    const service = serviceRef.current;
    if (!service?.isConnected) return;

    if (isRemoteUpdateRef.current) {
      isRemoteUpdateRef.current = false;
      logger.debug('useMultiplayerGame: Sync SKIPPED (remote update, will sync after delayed draw)');
      return;
    }

    logger.debug(`useMultiplayerGame: SYNCING state - currentPlayerIndex=${engine.gameState.currentPlayerIndex}, p0hand=${engine.gameState.players?.[0]?.hand?.length}, p1hand=${engine.gameState.players?.[1]?.hand?.length}`);
    service.syncState(engine.gameState);
  }, [enabled, engine.gameState, engine.isGameStarted]);

  // Non-host: send pending move AFTER React has processed the state update
  useEffect(() => {
    if (!enabled || isHostRef.current) return;
    if (!pendingMoveRef.current || !serviceRef.current?.isConnected) return;

    serviceRef.current.sendMove(pendingMoveRef.current.description, engine.gameState);
    pendingMoveRef.current = null;
  }, [enabled, engine.gameState]);

  const isMyTurn = engine.currentPlayerIndex === localPlayerIndex;

  const sendMoveAndApply = useCallback(
    (moveFn: () => boolean, moveDescription: { type: string; [key: string]: any }): boolean => {
      if (!isMyTurn) return false;

      const success = moveFn();
      if (success) {
        if (isHostRef.current) {
          // Host: state change triggers sync effect automatically
        } else {
          // Non-host: defer sending until after React processes the state update
          pendingMoveRef.current = { description: moveDescription };
        }
      }
      return success;
    },
    [isMyTurn],
  );

  const playSelectedToCenter = useCallback(
    (centerPileIndex: number): boolean => {
      return sendMoveAndApply(
        () => engine.playSelectedToCenter(centerPileIndex),
        { type: 'playToCenter', centerPileIndex },
      );
    },
    [sendMoveAndApply, engine.playSelectedToCenter],
  );

  const playSelectedToStorage = useCallback(
    (storageIndex: number): boolean => {
      return sendMoveAndApply(
        () => engine.playSelectedToStorage(storageIndex),
        { type: 'playToStorage', storageIndex },
      );
    },
    [sendMoveAndApply, engine.playSelectedToStorage],
  );

  const playDirectToCenter = useCallback(
    (source: CardSource, sourceIndex: number, centerPileIndex: number): boolean => {
      return sendMoveAndApply(
        () => engine.playDirectToCenter(source, sourceIndex, centerPileIndex),
        { type: 'playToCenter', source, sourceIndex, centerPileIndex },
      );
    },
    [sendMoveAndApply, engine.playDirectToCenter],
  );

  const playDirectToStorage = useCallback(
    (source: CardSource, sourceIndex: number, storageIndex: number): boolean => {
      return sendMoveAndApply(
        () => engine.playDirectToStorage(source, sourceIndex, storageIndex),
        { type: 'playToStorage', source, sourceIndex, storageIndex },
      );
    },
    [sendMoveAndApply, engine.playDirectToStorage],
  );

  const endCurrentTurn = useCallback((): boolean => {
    return sendMoveAndApply(
      () => engine.endCurrentTurn(),
      { type: 'endTurn' },
    );
  }, [sendMoveAndApply, engine.endCurrentTurn]);

  const selectCard = useCallback(
    (...args: Parameters<typeof engine.selectCard>) => {
      if (!isMyTurn) return;
      engine.selectCard(...args);
    },
    [isMyTurn, engine.selectCard],
  );

  return {
    ...engine,
    isMultiplayer: true as const,
    localPlayerIndex,
    isMyTurn,
    roomCode: serviceRef.current?.roomCode || options.roomCode || null,
    connectionStatus,
    remoteError,
    selectCard,
    playSelectedToCenter,
    playSelectedToStorage,
    playDirectToCenter,
    playDirectToStorage,
    endCurrentTurn,
  };
}
