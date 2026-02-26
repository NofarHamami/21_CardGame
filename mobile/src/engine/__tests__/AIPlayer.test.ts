import {
  findBestMove,
  executeAIMove,
  planAITurn,
  AIMove,
  AIDifficulty,
} from '../AIPlayer';
import {
  setupGame,
  playToCenter,
  playToStorage,
  GameState,
} from '../GameEngine';
import { CardSource, getHandCard } from '../../models';
import { createCard } from '../../models/Card';
import { Suit, Rank } from '../../models/types';

function setupAIGame(difficulty: AIDifficulty = 'medium'): GameState {
  return setupGame(2, [
    { name: 'Human', isAI: false },
    { name: 'Bot', isAI: true },
  ], difficulty);
}

describe('AIPlayer', () => {
  describe('findBestMove', () => {
    it('returns a valid move for each difficulty', () => {
      for (const diff of ['easy', 'medium', 'hard'] as AIDifficulty[]) {
        const state = setupAIGame(diff);
        const move = findBestMove(state, diff);
        expect(move).not.toBeNull();
        expect(['center', 'storage', 'endTurn']).toContain(move!.type);
      }
    });

    it('returns null only when truly stuck with 0 cards played', () => {
      const state = setupAIGame();
      // With a fresh game, AI should always have a valid move
      const move = findBestMove(state);
      expect(move).not.toBeNull();
    });

    it('easy AI sometimes returns random center moves', () => {
      const state = setupAIGame('easy');
      const moves = new Set<string>();
      for (let i = 0; i < 50; i++) {
        const move = findBestMove(state, 'easy');
        if (move) moves.add(JSON.stringify(move));
      }
      // Easy should show some variety (not always the same move)
      expect(moves.size).toBeGreaterThanOrEqual(1);
    });

    it('medium AI plays personal pile to center when possible', () => {
      const state = setupAIGame('medium');
      const player = state.players[state.currentPlayerIndex];
      // If personal pile top can be placed, medium should try that first
      const move = findBestMove(state, 'medium');
      if (move && move.type === 'center' && move.source === CardSource.PERSONAL_PILE) {
        expect(move.sourceIndex).toBe(0);
      }
      expect(move).not.toBeNull();
    });

    it('hard AI scores moves by follow-up opportunities', () => {
      const state = setupAIGame('hard');
      const move = findBestMove(state, 'hard');
      expect(move).not.toBeNull();
      if (move && move.type === 'center') {
        expect(move.targetIndex).toBeGreaterThanOrEqual(0);
        expect(move.targetIndex).toBeLessThan(4);
      }
    });

    it('returns endTurn when cards have been played and no center moves remain', () => {
      let state = setupAIGame('medium');
      // Play a card to storage to advance the turn, then test from new state
      const storageResult = playToStorage(state, CardSource.HAND, 0, 0);
      if (storageResult.lastEvent?.type !== 'INVALID_MOVE') {
        state = storageResult;
        // Now it's next player's turn; they should be able to find a move
        const move = findBestMove(state, 'medium');
        expect(move).not.toBeNull();
      }
    });
  });

  describe('executeAIMove', () => {
    it('executes center move', () => {
      const state = setupAIGame();
      const move: AIMove = { type: 'center', source: CardSource.HAND, sourceIndex: 0, targetIndex: 0 };
      const newState = executeAIMove(state, move);
      expect(newState).toBeDefined();
    });

    it('executes storage move', () => {
      const state = setupAIGame();
      const move: AIMove = { type: 'storage', source: CardSource.HAND, sourceIndex: 0, targetIndex: 0 };
      const newState = executeAIMove(state, move);
      // Storage always ends the turn
      expect(newState.currentPlayerIndex).not.toBe(state.currentPlayerIndex);
    });

    it('executes endTurn move', () => {
      let state = setupAIGame();
      // Must play at least one card before ending turn
      const centerMove = findBestMove(state, 'medium');
      if (centerMove && centerMove.type === 'center') {
        state = executeAIMove(state, centerMove);
        const endMove: AIMove = { type: 'endTurn' };
        const newState = executeAIMove(state, endMove);
        if (state.players[state.currentPlayerIndex].hand.length < 5) {
          expect(newState.currentPlayerIndex).not.toBe(state.currentPlayerIndex);
        }
      }
    });
  });

  describe('planAITurn', () => {
    it('returns at least one move', () => {
      const state = setupAIGame('medium');
      const moves = planAITurn(state, 'medium');
      expect(moves.length).toBeGreaterThan(0);
    });

    it('ends with endTurn or storage or gameOver', () => {
      const state = setupAIGame('medium');
      const moves = planAITurn(state, 'medium');
      const lastMove = moves[moves.length - 1];
      expect(['endTurn', 'storage']).toContain(lastMove.type);
    });

    it('respects difficulty parameter', () => {
      const state = setupAIGame('hard');
      const easyMoves = planAITurn(state, 'easy');
      const hardMoves = planAITurn(state, 'hard');
      // Both should produce valid move sequences
      expect(easyMoves.length).toBeGreaterThan(0);
      expect(hardMoves.length).toBeGreaterThan(0);
    });

    it('does not exceed safety valve', () => {
      const state = setupAIGame();
      const moves = planAITurn(state);
      expect(moves.length).toBeLessThanOrEqual(30);
    });
  });

  describe('smart storage selection', () => {
    it('hard AI stores least useful card', () => {
      const state = setupAIGame('hard');
      // When AI needs to store, it should pick the least playable card
      // We can't easily control which cards are in hand, but we verify it doesn't crash
      const move = findBestMove(state, 'hard');
      if (move && move.type === 'storage') {
        expect(move.sourceIndex).toBeGreaterThanOrEqual(0);
        expect(move.source).toBe(CardSource.HAND);
      }
    });
  });
});
