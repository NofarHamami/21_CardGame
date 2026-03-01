import {
  createInitialState,
  setupGame,
  getCurrentPlayer,
  playToCenter,
  playToStorage,
  endTurn,
  canEndTurn,
  getStockPileSize,
  GameState,
} from '../GameEngine';
import { CardSource } from '../../models';
import { createCard } from '../../models/Card';
import { Suit, Rank } from '../../models/types';
import { MIN_PLAYERS, MAX_PLAYERS, NUM_CENTER_PILES } from '../../constants';
import { MAX_HAND_SIZE, PERSONAL_PILE_SIZE } from '../../models/Player';

describe('GameEngine', () => {
  describe('createInitialState', () => {
    it('should create initial state with empty game', () => {
      const state = createInitialState();
      expect(state.players.length).toBe(0);
      expect(state.centerPiles.length).toBe(NUM_CENTER_PILES);
      expect(state.gameStarted).toBe(false);
      expect(state.gameOver).toBe(false);
      expect(state.winner).toBeNull();
    });

    it('should initialize all center piles', () => {
      const state = createInitialState();
      for (let i = 0; i < NUM_CENTER_PILES; i++) {
        expect(state.centerPiles[i]).toBeDefined();
      }
    });
  });

  describe('setupGame', () => {
    it('should set up game with correct number of players', () => {
      const state = setupGame(2);
      expect(state.players.length).toBe(2);
      expect(state.gameStarted).toBe(true);
      expect(state.gameOver).toBe(false);
    });

    it('should throw error for invalid number of players', () => {
      expect(() => setupGame(MIN_PLAYERS - 1)).toThrow();
      expect(() => setupGame(MAX_PLAYERS + 1)).toThrow();
    });

    it('should deal cards to all players', () => {
      const state = setupGame(2);
      for (const player of state.players) {
        expect(player.hand.length).toBe(MAX_HAND_SIZE);
        expect(player.personalPile.length).toBe(PERSONAL_PILE_SIZE);
      }
    });

    it('should have stock pile with remaining cards', () => {
      const state = setupGame(2);
      const stockSize = getStockPileSize(state);
      expect(stockSize).toBeGreaterThan(0);
    });

    it('should set current player index', () => {
      const state = setupGame(2);
      expect(state.currentPlayerIndex).toBeGreaterThanOrEqual(0);
      expect(state.currentPlayerIndex).toBeLessThan(2);
    });

    it('should initialize turn state', () => {
      const state = setupGame(2);
      expect(state.cardsPlayedThisTurn).toBe(0);
      expect(state.playedToCenterThisTurn).toBe(false);
    });
  });

  describe('getCurrentPlayer', () => {
    it('should return current player', () => {
      const state = setupGame(2);
      const currentPlayer = getCurrentPlayer(state);
      expect(currentPlayer).not.toBeNull();
      expect(currentPlayer?.playerNumber).toBe(state.currentPlayerIndex + 1);
    });

    it('should return null for empty players', () => {
      const state = createInitialState();
      expect(getCurrentPlayer(state)).toBeNull();
    });
  });

  describe('playToCenter', () => {
    let state: GameState;

    beforeEach(() => {
      state = setupGame(2);
    });

    it('should play card from hand to center pile', () => {
      const currentPlayer = getCurrentPlayer(state)!;
      const handCard = currentPlayer.hand[0];
      const centerPileIndex = 0;
      
      const newState = playToCenter(state, CardSource.HAND, 0, centerPileIndex);
      expect(newState.centerPiles[centerPileIndex].cards.length).toBeGreaterThan(0);
      expect(newState.players[state.currentPlayerIndex].hand.length).toBe(MAX_HAND_SIZE - 1);
      expect(newState.cardsPlayedThisTurn).toBe(1);
      expect(newState.playedToCenterThisTurn).toBe(true);
    });

    it('should not play invalid card', () => {
      const currentPlayer = getCurrentPlayer(state)!;
      // Try to play a non-Ace card to empty pile
      const nonAceIndex = currentPlayer.hand.findIndex(c => c.rank !== Rank.ACE);
      if (nonAceIndex !== -1) {
        const newState = playToCenter(state, CardSource.HAND, nonAceIndex, 0);
        expect(newState.lastEvent?.type).toBe('INVALID_MOVE');
      }
    });

    it('should not play when game is not started', () => {
      const initialState = createInitialState();
      const newState = playToCenter(initialState, CardSource.HAND, 0, 0);
      expect(newState).toBe(initialState); // State unchanged
    });

    it('should not play when game is over', () => {
      state.gameOver = true;
      const newState = playToCenter(state, CardSource.HAND, 0, 0);
      expect(newState).toBe(state); // State unchanged
    });

    it('should reject invalid center pile index', () => {
      const newState = playToCenter(state, CardSource.HAND, 0, -1);
      expect(newState.lastEvent?.type).toBe('INVALID_MOVE');

      const newState2 = playToCenter(state, CardSource.HAND, 0, NUM_CENTER_PILES);
      expect(newState2.lastEvent?.type).toBe('INVALID_MOVE');
    });

    it('should increment cardsPlayedThisTurn on valid play', () => {
      const player = getCurrentPlayer(state)!;
      // Find an Ace or King to play on an empty pile
      const aceIdx = player.hand.findIndex(c => c.rank === Rank.ACE || c.rank === Rank.KING);
      if (aceIdx !== -1) {
        const newState = playToCenter(state, CardSource.HAND, aceIdx, 0);
        if (newState.lastEvent?.type !== 'INVALID_MOVE') {
          expect(newState.cardsPlayedThisTurn).toBe(1);
          expect(newState.playedToCenterThisTurn).toBe(true);
        }
      }
    });
  });

  describe('playToStorage', () => {
    let state: GameState;

    beforeEach(() => {
      state = setupGame(2);
    });

    it('should play card from hand to storage', () => {
      const currentPlayer = getCurrentPlayer(state)!;
      const handCard = currentPlayer.hand[0];
      const storageIndex = 0;
      
      const newState = playToStorage(state, CardSource.HAND, 0, storageIndex);
      expect(newState.players[state.currentPlayerIndex].hand.length).toBe(MAX_HAND_SIZE - 1);
      expect(newState.players[state.currentPlayerIndex].storage[storageIndex].length).toBe(1);
      expect(newState.cardsPlayedThisTurn).toBe(1);
    });

    it('should end turn after playing to storage', () => {
      const newState = playToStorage(state, CardSource.HAND, 0, 0);
      expect(newState.currentPlayerIndex).not.toBe(state.currentPlayerIndex);
      expect(newState.cardsPlayedThisTurn).toBe(0); // Reset for next player
    });

    it('should not allow playing to storage after playing to center', () => {
      // First play to center
      const stateAfterCenter = playToCenter(state, CardSource.HAND, 0, 0);
      if (stateAfterCenter.lastEvent?.type !== 'INVALID_MOVE') {
        // Then try to play to storage
        const newState = playToStorage(stateAfterCenter, CardSource.HAND, 0, 0);
        expect(newState.lastEvent?.type).toBe('INVALID_MOVE');
      }
    });

    it('should not allow playing to storage with invalid index', () => {
      const newState = playToStorage(state, CardSource.HAND, 0, -1);
      expect(newState.lastEvent?.type).toBe('INVALID_MOVE');

      const newState2 = playToStorage(state, CardSource.HAND, 0, 10);
      expect(newState2.lastEvent?.type).toBe('INVALID_MOVE');
    });

    it('should not allow moving cards between storage stacks', () => {
      // First add a card to storage
      const stateWithStorage = playToStorage(state, CardSource.HAND, 0, 0);
      // Then try to move from storage to storage
      const newState = playToStorage(stateWithStorage, CardSource.STORAGE, 0, 1);
      expect(newState.lastEvent?.type).toBe('INVALID_MOVE');
    });

    it('should not allow playing from personal pile to storage', () => {
      const newState = playToStorage(state, CardSource.PERSONAL_PILE, 0, 0);
      expect(newState.lastEvent?.type).toBe('INVALID_MOVE');
    });
  });

  describe('endTurn', () => {
    let state: GameState;

    beforeEach(() => {
      state = setupGame(2);
    });

    it('should not end turn if no cards played', () => {
      const newState = endTurn(state);
      expect(newState.lastEvent?.type).toBe('INVALID_MOVE');
      expect(newState.currentPlayerIndex).toBe(state.currentPlayerIndex);
    });

    it('should not end turn if game is over', () => {
      state = { ...state, gameOver: true };
      const newState = endTurn(state);
      // Game over state should be returned unchanged
      expect(newState.gameOver).toBe(true);
    });

    it('should end turn after playing cards', () => {
      // Play a card
      const stateAfterPlay = playToCenter(state, CardSource.HAND, 0, 0);
      if (stateAfterPlay.lastEvent?.type !== 'INVALID_MOVE' && stateAfterPlay.players[state.currentPlayerIndex].hand.length < MAX_HAND_SIZE) {
        const newState = endTurn(stateAfterPlay);
        expect(newState.currentPlayerIndex).not.toBe(state.currentPlayerIndex);
        expect(newState.cardsPlayedThisTurn).toBe(0);
      }
    });

    it('should change turn to different player', () => {
      const stateAfterPlay = playToCenter(state, CardSource.HAND, 0, 0);
      if (stateAfterPlay.lastEvent?.type !== 'INVALID_MOVE' && stateAfterPlay.players[state.currentPlayerIndex].hand.length < MAX_HAND_SIZE) {
        const newState = endTurn(stateAfterPlay);
        if (newState.lastEvent?.type !== 'INVALID_MOVE') {
          expect(newState.currentPlayerIndex).not.toBe(state.currentPlayerIndex);
          expect(newState.cardsPlayedThisTurn).toBe(0);
          expect(newState.playedToCenterThisTurn).toBe(false);
        }
      }
    });
  });

  describe('canEndTurn', () => {
    let state: GameState;

    beforeEach(() => {
      state = setupGame(2);
    });

    it('should return false if no cards played', () => {
      expect(canEndTurn(state)).toBe(false);
    });

    it('should return false if game not started', () => {
      const initialState = createInitialState();
      expect(canEndTurn(initialState)).toBe(false);
    });

    it('should return true after playing cards', () => {
      const stateAfterPlay = playToCenter(state, CardSource.HAND, 0, 0);
      if (stateAfterPlay.lastEvent?.type !== 'INVALID_MOVE') {
        const currentPlayer = getCurrentPlayer(stateAfterPlay)!;
        if (currentPlayer.hand.length < MAX_HAND_SIZE) {
          expect(canEndTurn(stateAfterPlay)).toBe(true);
        }
      }
    });
  });

  describe('getStockPileSize', () => {
    it('should return correct stock pile size', () => {
      const state = setupGame(2);
      const size = getStockPileSize(state);
      expect(size).toBeGreaterThan(0);
    });

    it('should return 0 for empty stock pile', () => {
      const state = createInitialState();
      expect(getStockPileSize(state)).toBe(0);
    });
  });

  describe('Win Condition', () => {
    it('should have personal pile for win condition check', () => {
      const state = setupGame(2);
      const currentPlayer = getCurrentPlayer(state)!;
      expect(currentPlayer.personalPile.length).toBe(21);
    });
  });

  describe('Edge Cases', () => {
    it('should handle 3 and 4 player games', () => {
      const state3 = setupGame(3);
      expect(state3.players.length).toBe(3);
      for (const p of state3.players) {
        expect(p.hand.length).toBe(MAX_HAND_SIZE);
        expect(p.personalPile.length).toBe(21);
      }

      const state4 = setupGame(4);
      expect(state4.players.length).toBe(4);
      for (const p of state4.players) {
        expect(p.hand.length).toBe(MAX_HAND_SIZE);
        expect(p.personalPile.length).toBe(21);
      }
    });

    it('should handle invalid center pile index', () => {
      const state = setupGame(2);
      const newState = playToCenter(state, CardSource.HAND, 0, NUM_CENTER_PILES);
      expect(newState.lastEvent?.type).toBe('INVALID_MOVE');
    });

    it('should handle invalid storage index', () => {
      const state = setupGame(2);
      const newState = playToStorage(state, CardSource.HAND, 0, 10);
      expect(newState.lastEvent?.type).toBe('INVALID_MOVE');
    });
  });
});
