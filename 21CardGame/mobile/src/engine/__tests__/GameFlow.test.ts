import {
  setupGame,
  getCurrentPlayer,
  playToCenter,
  playToStorage,
  endTurn,
  canEndTurn,
  GameState,
} from '../GameEngine';
import { findBestMove, executeAIMove, planAITurn } from '../AIPlayer';
import { CardSource, canPlaceOnPile, getHandCard, getPersonalPileTop, getStorageTop } from '../../models';
import { NUM_CENTER_PILES } from '../../constants';

describe('Full Game Flow Integration', () => {
  let state: GameState;

  beforeEach(() => {
    state = setupGame(2);
  });

  it('should set up a valid initial game state', () => {
    expect(state.gameStarted).toBe(true);
    expect(state.gameOver).toBe(false);
    expect(state.players.length).toBe(2);

    for (const player of state.players) {
      expect(player.hand.length).toBe(5);
      expect(player.personalPile.length).toBe(21);
      expect(player.storage.length).toBe(5);
    }
  });

  it('should allow playing a valid card to center', () => {
    const player = getCurrentPlayer(state)!;
    let played = false;

    for (let h = 0; h < player.hand.length; h++) {
      const card = getHandCard(player, h);
      if (!card) continue;
      for (let p = 0; p < NUM_CENTER_PILES; p++) {
        if (canPlaceOnPile(state.centerPiles[p], card)) {
          const newState = playToCenter(state, CardSource.HAND, h, p);
          expect(newState.lastEvent?.type).not.toBe('INVALID_MOVE');
          expect(newState.cardsPlayedThisTurn).toBe(1);
          played = true;
          state = newState;
          break;
        }
      }
      if (played) break;
    }

    // If no card was playable to center, play to storage instead
    if (!played) {
      const newState = playToStorage(state, CardSource.HAND, 0, 0);
      expect(newState.lastEvent?.type).not.toBe('INVALID_MOVE');
    }
  });

  it('should reject playing to center when card does not match', () => {
    const player = getCurrentPlayer(state)!;
    // Try to play each hand card; find one that doesn't fit pile 0
    for (let h = 0; h < player.hand.length; h++) {
      const card = getHandCard(player, h);
      if (!card) continue;
      if (!canPlaceOnPile(state.centerPiles[0], card)) {
        const newState = playToCenter(state, CardSource.HAND, h, 0);
        expect(newState.lastEvent?.type).toBe('INVALID_MOVE');
        break;
      }
    }
  });

  it('should end turn after playing to storage', () => {
    const playerIndexBefore = state.currentPlayerIndex;
    const newState = playToStorage(state, CardSource.HAND, 0, 0);

    if (newState.lastEvent?.type !== 'INVALID_MOVE') {
      // Playing to storage ends the turn
      expect(newState.currentPlayerIndex).not.toBe(playerIndexBefore);
    }
  });

  it('should not allow ending turn with no cards played', () => {
    expect(canEndTurn(state)).toBe(false);
    const newState = endTurn(state);
    expect(newState.lastEvent?.type).toBe('INVALID_MOVE');
  });

  it('should run AI turns to completion without errors', () => {
    const aiState = setupGame(2, [
      { name: 'Human', isAI: false },
      { name: 'Bot', isAI: true },
    ], 'medium');

    let current = aiState;
    let iterations = 0;
    const maxIterations = 200;

    while (!current.gameOver && iterations < maxIterations) {
      const player = getCurrentPlayer(current)!;

      if (player.isAI) {
        const moves = planAITurn(current, 'medium');
        expect(moves.length).toBeGreaterThan(0);

        for (const move of moves) {
          current = executeAIMove(current, move);
          if (current.gameOver) break;
        }
      } else {
        // Human plays: use medium AI strategy as proxy
        const move = findBestMove(current, 'medium');
        if (move) {
          current = executeAIMove(current, move);
        } else {
          break;
        }
      }
      iterations++;
    }

    // Game should either be over or we hit the iteration limit
    expect(iterations).toBeLessThan(maxIterations);
  });

  it('should simulate a full game with hard AI', () => {
    const aiState = setupGame(2, [
      { name: 'P1', isAI: true },
      { name: 'P2', isAI: true },
    ], 'hard');

    let current = aiState;
    let turns = 0;
    const maxTurns = 300;

    while (!current.gameOver && turns < maxTurns) {
      const moves = planAITurn(current, 'hard');
      if (moves.length === 0) break;

      for (const move of moves) {
        current = executeAIMove(current, move);
        if (current.gameOver) break;
      }
      turns++;
    }

    if (current.gameOver) {
      expect(current.winner).not.toBeNull();
    }
  });
});

describe('Hint System', () => {
  it('should return a valid hint move for the current player', () => {
    const state = setupGame(2);
    const hint = findBestMove(state, 'medium');

    expect(hint).not.toBeNull();
    if (hint) {
      expect(['center', 'storage', 'endTurn']).toContain(hint.type);
    }
  });

  it('should return playable hint moves', () => {
    const state = setupGame(2);
    const hint = findBestMove(state, 'medium');

    if (hint && hint.type === 'center') {
      const result = executeAIMove(state, hint);
      expect(result.lastEvent?.type).not.toBe('INVALID_MOVE');
    }
  });

  it('hard AI hint should prefer personal pile moves', () => {
    const state = setupGame(2);
    const player = getCurrentPlayer(state)!;
    const pileTop = getPersonalPileTop(player);

    if (pileTop) {
      let canPlayPile = false;
      for (let p = 0; p < NUM_CENTER_PILES; p++) {
        if (canPlaceOnPile(state.centerPiles[p], pileTop)) {
          canPlayPile = true;
          break;
        }
      }

      if (canPlayPile) {
        const hint = findBestMove(state, 'hard');
        expect(hint?.source).toBe(CardSource.PERSONAL_PILE);
      }
    }
  });
});
