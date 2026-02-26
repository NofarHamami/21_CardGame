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
  getPersonalPileSize,
  getStorageTop,
  getStorageStackSize,
  getHandCard,
  isHandFull,
  isHandEmpty,
  isCardKing,
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

function findStorageMove(state: GameState, difficulty: AIDifficulty = 'medium'): AIMove | null {
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

  // Hard/medium AI: pick the least useful hand card to store
  let bestHandIndex = 0;
  if (difficulty !== 'easy' && player.hand.length > 1) {
    let worstScore = Infinity;
    for (let h = 0; h < player.hand.length; h++) {
      const card = getHandCard(player, h);
      if (!card) continue;
      let playableCount = 0;
      for (let p = 0; p < NUM_CENTER_PILES; p++) {
        if (canPlaceOnPile(state.centerPiles[p], card)) {
          playableCount++;
        }
      }
      // Prefer storing cards that can't be played anywhere;
      // among equally unplayable cards, prefer higher rank (less likely needed soon)
      const score = playableCount * 100 - card.rank;
      if (score < worstScore) {
        worstScore = score;
        bestHandIndex = h;
      }
    }
  }

  return { type: 'storage', source: CardSource.HAND, sourceIndex: bestHandIndex, targetIndex: targetSlot };
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

  const storageMove = findStorageMove(state, 'easy');
  if (storageMove) {
    logger.debug('AI (easy): Playing to storage');
    return storageMove;
  }

  // Fallback to any center move
  if (centerMoves.length > 0) {
    return centerMoves[Math.floor(Math.random() * centerMoves.length)];
  }

  // No moves possible at all - force end turn if allowed, otherwise stuck
  if (state.cardsPlayedThisTurn > 0) {
    logger.debug('AI (easy): No moves, forcing end turn');
    return { type: 'endTurn' };
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

  const storageMove = findStorageMove(state, 'medium');
  if (storageMove) {
    logger.debug('AI: Playing hand card to storage');
    return storageMove;
  }

  if (state.cardsPlayedThisTurn > 0) {
    logger.debug('AI: No moves, forcing end turn');
    return { type: 'endTurn' };
  }

  logger.debug('AI: No valid move found');
  return null;
}

/**
 * Evaluate board position for the AI player (higher = better).
 * Used as a heuristic for multi-step lookahead.
 */
function evaluatePosition(state: GameState, playerIndex: number): number {
  const player = state.players[playerIndex];
  if (!player) return 0;

  let score = 0;
  const pileSize = getPersonalPileSize(player);

  // Primary objective: fewer cards in personal pile = better
  score -= pileSize * 15;

  // Reward available center moves (more options = more flexibility)
  const availableMoves = collectAllCenterMoves(state);
  score += availableMoves.length * 3;

  // Penalize clogged storage (many cards buried = bad)
  let totalStorageCards = 0;
  for (let s = 0; s < STORAGE_STACKS; s++) {
    const stackSize = getStorageStackSize(player, s);
    totalStorageCards += stackSize;
    // Quadratic penalty for deep stacks
    score -= stackSize * stackSize;
  }

  // Reward piles close to completion
  for (let i = 0; i < NUM_CENTER_PILES; i++) {
    const pile = state.centerPiles[i];
    if (pile) score += pile.expectedNextValue * 0.3;
  }

  // Bonus for holding Kings (wild cards provide future flexibility)
  for (let h = 0; h < player.hand.length; h++) {
    const card = getHandCard(player, h);
    if (card && isCardKing(card)) score += 4;
  }

  // Check if personal pile top can be played (unlocking progress)
  const pileTop = getPersonalPileTop(player);
  if (pileTop) {
    for (let i = 0; i < NUM_CENTER_PILES; i++) {
      if (canPlaceOnPile(state.centerPiles[i], pileTop)) {
        score += 8;
        break;
      }
    }
  }

  return score;
}

/**
 * Multi-step lookahead: simulate a sequence of moves and return the
 * cumulative score, using alpha-beta-inspired pruning.
 */
function lookaheadScore(
  state: GameState,
  playerIndex: number,
  depth: number,
  bestKnown: number,
): number {
  if (depth <= 0 || state.gameOver) {
    return evaluatePosition(state, playerIndex);
  }

  // Win state bonus
  if (state.gameOver && state.winner?.playerNumber === state.players[playerIndex]?.playerNumber) {
    return 10000;
  }

  const centerMoves = collectAllCenterMoves(state);
  if (centerMoves.length === 0) {
    return evaluatePosition(state, playerIndex);
  }

  let best = -Infinity;
  for (const move of centerMoves) {
    const simulated = executeAIMove(state, move);
    const turnEnded = simulated.currentPlayerIndex !== state.currentPlayerIndex;

    let moveScore: number;
    if (turnEnded || simulated.gameOver) {
      moveScore = evaluatePosition(simulated, playerIndex);
    } else {
      moveScore = lookaheadScore(simulated, playerIndex, depth - 1, best);
    }

    // Source bonuses applied at each level
    if (move.source === CardSource.PERSONAL_PILE) moveScore += 12;
    if (move.source === CardSource.STORAGE) moveScore += 4;

    if (moveScore > best) best = moveScore;
    // Pruning: if we already found something very good, skip remaining
    if (best > bestKnown + 30) break;
  }

  return best;
}

/**
 * Hard: Multi-step lookahead (depth 3) with position evaluation.
 * Considers personal pile priority, storage management, King conservation,
 * and pile completion progress.
 */
function findMoveHard(state: GameState): AIMove | null {
  const player = state.players[state.currentPlayerIndex];
  if (!player) return null;
  const playerIndex = state.currentPlayerIndex;

  // Always play personal pile first when possible (always beneficial)
  const pileTop = getPersonalPileTop(player);
  if (pileTop) {
    for (let i = 0; i < NUM_CENTER_PILES; i++) {
      if (canPlaceOnPile(state.centerPiles[i], pileTop)) {
        logger.debug('AI (hard): Playing personal pile to center pile', i);
        return { type: 'center', source: CardSource.PERSONAL_PILE, sourceIndex: 0, targetIndex: i };
      }
    }
  }

  // Score all center moves with multi-step lookahead (depth 3)
  const centerMoves = collectAllCenterMoves(state);
  if (centerMoves.length > 0) {
    let bestMove = centerMoves[0];
    let bestScore = -Infinity;

    for (const move of centerMoves) {
      const simulated = executeAIMove(state, move);
      const turnEnded = simulated.currentPlayerIndex !== state.currentPlayerIndex;

      let score: number;
      if (turnEnded || simulated.gameOver) {
        score = evaluatePosition(simulated, playerIndex);
      } else {
        score = lookaheadScore(simulated, playerIndex, 2, bestScore);
      }

      // Immediate source bonuses
      if (move.source === CardSource.PERSONAL_PILE) score += 12;
      if (move.source === CardSource.STORAGE) score += 4;

      // Avoid wasting Kings when a non-King card would work
      const card = move.source === CardSource.HAND
        ? getHandCard(player, move.sourceIndex!)
        : move.source === CardSource.STORAGE
        ? getStorageTop(player, move.sourceIndex!)
        : pileTop;
      if (card && isCardKing(card)) {
        const pile = state.centerPiles[move.targetIndex!];
        if (pile && pile.expectedNextValue < 10) {
          score -= 6;
        }
      }

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

  const storageMove = findStorageMove(state, 'hard');
  if (storageMove) {
    logger.debug('AI (hard): Playing to storage');
    return storageMove;
  }

  if (state.cardsPlayedThisTurn > 0) {
    logger.debug('AI (hard): No moves, forcing end turn');
    return { type: 'endTurn' };
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
export function planAITurn(state: GameState, difficulty?: AIDifficulty): AIMove[] {
  const moves: AIMove[] = [];
  let currentState = state;
  const maxIterations = 30;
  const diff = difficulty || (state.aiDifficulty as AIDifficulty) || 'medium';

  for (let i = 0; i < maxIterations; i++) {
    const move = findBestMove(currentState, diff);
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
