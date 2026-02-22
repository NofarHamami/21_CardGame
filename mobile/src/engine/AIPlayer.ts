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

export interface AIMove {
  type: 'center' | 'storage' | 'endTurn';
  source?: CardSource;
  sourceIndex?: number;
  targetIndex?: number;
}

/**
 * Find the best move for the AI player.
 * Strategy tiers:
 *   1. Play personal pile (21-pile) cards first — emptying this wins the game
 *   2. Play storage cards to center — frees up storage slots
 *   3. Play hand cards to center
 *   4. End turn if at least one card was played
 *   5. Play to storage as a last resort (ends the turn)
 */
export function findBestMove(state: GameState): AIMove | null {
  const player = state.players[state.currentPlayerIndex];
  if (!player) return null;

  // --- Priority 1: Personal pile to center ---
  const pileTop = getPersonalPileTop(player);
  if (pileTop) {
    for (let i = 0; i < NUM_CENTER_PILES; i++) {
      if (canPlaceOnPile(state.centerPiles[i], pileTop)) {
        logger.debug('AI: Playing personal pile card to center pile', i);
        return { type: 'center', source: CardSource.PERSONAL_PILE, sourceIndex: 0, targetIndex: i };
      }
    }
  }

  // --- Priority 2: Storage to center ---
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

  // --- Priority 3: Hand to center ---
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

  // --- Priority 4: End turn if possible ---
  if (canEndTurn(state)) {
    logger.debug('AI: Ending turn');
    return { type: 'endTurn' };
  }

  // --- Priority 5: Play to storage (must play at least 1 card) ---
  if (!isHandEmpty(player)) {
    // Can only play to storage if we haven't played to center this turn, or hand is full
    if (!state.playedToCenterThisTurn || isHandFull(player)) {
      let targetSlot = 0;
      let minSize = Infinity;
      for (let s = 0; s < STORAGE_STACKS; s++) {
        const size = player.storage[s].length;
        if (size < minSize) {
          minSize = size;
          targetSlot = s;
        }
      }
      logger.debug('AI: Playing hand card to storage slot', targetSlot);
      return { type: 'storage', source: CardSource.HAND, sourceIndex: 0, targetIndex: targetSlot };
    }
  }

  logger.debug('AI: No valid move found');
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
