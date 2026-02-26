import {
  GameState,
  playToCenter,
  playToStorage,
  endTurn,
  canEndTurn,
} from './GameEngine';
import {
  CardSource,
  canPlaceOnPile,
  getPersonalPileTop,
  getStorageTop,
  getHandCard,
  isHandFull,
  isHandEmpty,
  STORAGE_STACKS,
} from '../models';
import { NUM_CENTER_PILES } from '../constants';
import { logger } from '../utils/logger';

export type AIDifficulty = 'easy' | 'medium' | 'hard';

export interface AIMove {
  type: 'center' | 'storage' | 'endTurn';
  source?: CardSource;
  sourceIndex?: number;
  targetIndex?: number;
}

/**
 * Find the best move for the AI player based on difficulty.
 */
export function findBestMove(state: GameState, difficulty: AIDifficulty = 'medium'): AIMove | null {
  switch (difficulty) {
    case 'easy':
      return findMoveEasy(state);
    case 'hard':
      return findMoveHard(state);
    case 'medium':
    default:
      return findMoveMedium(state);
  }
}

function collectAllCenterMoves(state: GameState): AIMove[] {
  const player = state.players[state.currentPlayerIndex];
  if (!player) return [];
  const moves: AIMove[] = [];

  const pileTop = getPersonalPileTop(player);
  if (pileTop) {
    for (let i = 0; i < NUM_CENTER_PILES; i++) {
      if (canPlaceOnPile(state.centerPiles[i], pileTop)) {
        moves.push({ type: 'center', source: CardSource.PERSONAL_PILE, sourceIndex: 0, targetIndex: i });
      }
    }
  }

  for (let s = 0; s < STORAGE_STACKS; s++) {
    const storageCard = getStorageTop(player, s);
    if (storageCard) {
      for (let i = 0; i < NUM_CENTER_PILES; i++) {
        if (canPlaceOnPile(state.centerPiles[i], storageCard)) {
          moves.push({ type: 'center', source: CardSource.STORAGE, sourceIndex: s, targetIndex: i });
        }
      }
    }
  }

  for (let h = 0; h < player.hand.length; h++) {
    const handCard = getHandCard(player, h);
    if (handCard) {
      for (let i = 0; i < NUM_CENTER_PILES; i++) {
        if (canPlaceOnPile(state.centerPiles[i], handCard)) {
          moves.push({ type: 'center', source: CardSource.HAND, sourceIndex: h, targetIndex: i });
        }
      }
    }
  }

  return moves;
}

function findStorageMove(state: GameState): AIMove | null {
  const player = state.players[state.currentPlayerIndex];
  if (!player || isHandEmpty(player)) return null;
  if (state.playedToCenterThisTurn && !isHandFull(player)) return null;

  let targetSlot = 0;
  let minSize = Infinity;
  for (let s = 0; s < STORAGE_STACKS; s++) {
    const size = player.storage[s].length;
    if (size < minSize) {
      minSize = size;
      targetSlot = s;
    }
  }
  return { type: 'storage', source: CardSource.HAND, sourceIndex: 0, targetIndex: targetSlot };
}

/**
 * Easy: Randomly picks from available valid moves. Sometimes misses optimal plays.
 */
function findMoveEasy(state: GameState): AIMove | null {
  const player = state.players[state.currentPlayerIndex];
  if (!player) return null;

  const centerMoves = collectAllCenterMoves(state);

  // 60% chance to play a center move if available; otherwise end turn or storage
  if (centerMoves.length > 0 && Math.random() < 0.6) {
    const pick = centerMoves[Math.floor(Math.random() * centerMoves.length)];
    logger.debug('AI (easy): Random center move');
    return pick;
  }

  if (canEndTurn(state)) {
    logger.debug('AI (easy): Ending turn');
    return { type: 'endTurn' };
  }

  const storageMove = findStorageMove(state);
  if (storageMove) {
    logger.debug('AI (easy): Playing to storage');
    return storageMove;
  }

  // Fallback to any center move
  if (centerMoves.length > 0) {
    return centerMoves[Math.floor(Math.random() * centerMoves.length)];
  }

  return null;
}

/**
 * Medium: Greedy strategy — always plays the first valid move found (original behavior).
 */
function findMoveMedium(state: GameState): AIMove | null {
  const player = state.players[state.currentPlayerIndex];
  if (!player) return null;

  const pileTop = getPersonalPileTop(player);
  if (pileTop) {
    for (let i = 0; i < NUM_CENTER_PILES; i++) {
      if (canPlaceOnPile(state.centerPiles[i], pileTop)) {
        logger.debug('AI: Playing personal pile card to center pile', i);
        return { type: 'center', source: CardSource.PERSONAL_PILE, sourceIndex: 0, targetIndex: i };
      }
    }
  }

  for (let s = 0; s < STORAGE_STACKS; s++) {
    const storageCard = getStorageTop(player, s);
    if (storageCard) {
      for (let i = 0; i < NUM_CENTER_PILES; i++) {
        if (canPlaceOnPile(state.centerPiles[i], storageCard)) {
          logger.debug('AI: Playing storage card', s, 'to center pile', i);
          return { type: 'center', source: CardSource.STORAGE, sourceIndex: s, targetIndex: i };
        }
      }
    }
  }

  for (let h = 0; h < player.hand.length; h++) {
    const handCard = getHandCard(player, h);
    if (handCard) {
      for (let i = 0; i < NUM_CENTER_PILES; i++) {
        if (canPlaceOnPile(state.centerPiles[i], handCard)) {
          logger.debug('AI: Playing hand card', h, 'to center pile', i);
          return { type: 'center', source: CardSource.HAND, sourceIndex: h, targetIndex: i };
        }
      }
    }
  }

  if (canEndTurn(state)) {
    logger.debug('AI: Ending turn');
    return { type: 'endTurn' };
  }

  const storageMove = findStorageMove(state);
  if (storageMove) {
    logger.debug('AI: Playing hand card to storage');
    return storageMove;
  }

  logger.debug('AI: No valid move found');
  return null;
}

/**
 * Hard: One-step lookahead — scores each possible move by counting
 * how many follow-up center plays it unlocks. Prefers personal pile moves,
 * then picks the center play that maximises future opportunities.
 */
function findMoveHard(state: GameState): AIMove | null {
  const player = state.players[state.currentPlayerIndex];
  if (!player) return null;

  // Always play personal pile first (always optimal)
  const pileTop = getPersonalPileTop(player);
  if (pileTop) {
    for (let i = 0; i < NUM_CENTER_PILES; i++) {
      if (canPlaceOnPile(state.centerPiles[i], pileTop)) {
        logger.debug('AI (hard): Playing personal pile to center pile', i);
        return { type: 'center', source: CardSource.PERSONAL_PILE, sourceIndex: 0, targetIndex: i };
      }
    }
  }

  // Score all center moves by one-step lookahead
  const centerMoves = collectAllCenterMoves(state);
  if (centerMoves.length > 0) {
    let bestMove = centerMoves[0];
    let bestScore = -1;
    for (const move of centerMoves) {
      const simulated = executeAIMove(state, move);
      const followUps = collectAllCenterMoves(simulated);
      const score = followUps.length;
      if (score > bestScore) {
        bestScore = score;
        bestMove = move;
      }
    }
    logger.debug('AI (hard): Best center move with score', bestScore);
    return bestMove;
  }

  if (canEndTurn(state)) {
    logger.debug('AI (hard): Ending turn');
    return { type: 'endTurn' };
  }

  // Storage: pick the slot that minimises future blocking
  const storageMove = findStorageMove(state);
  if (storageMove) {
    logger.debug('AI (hard): Playing to storage');
    return storageMove;
  }

  return null;
}

/**
 * Execute an AI move on the game state.
 */
export function executeAIMove(state: GameState, move: AIMove): GameState {
  switch (move.type) {
    case 'center':
      return playToCenter(state, move.source!, move.sourceIndex!, move.targetIndex!);
    case 'storage':
      return playToStorage(state, move.source!, move.sourceIndex!, move.targetIndex!);
    case 'endTurn':
      return endTurn(state);
    default:
      return state;
  }
}

/**
 * Execute a full AI turn — keeps playing moves until the turn ends.
 * Returns an array of intermediate states for animation purposes.
 */
export function planAITurn(state: GameState): AIMove[] {
  const moves: AIMove[] = [];
  let currentState = state;
  const maxIterations = 30; // safety valve

  for (let i = 0; i < maxIterations; i++) {
    const move = findBestMove(currentState);
    if (!move) break;

    moves.push(move);
    currentState = executeAIMove(currentState, move);

    // Turn ended (storage play or endTurn or game over)
    if (
      move.type === 'endTurn' ||
      move.type === 'storage' ||
      currentState.gameOver ||
      currentState.currentPlayerIndex !== state.currentPlayerIndex
    ) {
      break;
    }
  }

  return moves;
}
