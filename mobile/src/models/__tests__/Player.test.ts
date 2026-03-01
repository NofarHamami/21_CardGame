import {
  createPlayer,
  setupPlayerCards,
  getHand,
  getHandSize,
  getHandCard,
  removeFromHand,
  addToHand,
  addCardsToHand,
  isHandEmpty,
  isHandFull,
  cardsNeededToFillHand,
  getPersonalPileTop,
  removeFromPersonalPile,
  getPersonalPileSize,
  isPersonalPileEmpty,
  hasWon,
  getStorageTop,
  removeFromStorage,
  addToStorage,
  getStorageStackSize,
  MAX_HAND_SIZE,
  PERSONAL_PILE_SIZE,
  STORAGE_STACKS,
} from '../Player';
import { createCard } from '../Card';
import { Suit, Rank } from '../types';

describe('Player', () => {
  describe('createPlayer', () => {
    it('should create a player with correct name and number', () => {
      const player = createPlayer('Test Player', 1);
      expect(player.name).toBe('Test Player');
      expect(player.playerNumber).toBe(1);
      expect(player.hand.length).toBe(0);
      expect(player.personalPile.length).toBe(0);
      expect(player.storage.length).toBe(STORAGE_STACKS);
    });

    it('should initialize empty storage stacks', () => {
      const player = createPlayer('Test', 1);
      for (let i = 0; i < STORAGE_STACKS; i++) {
        expect(player.storage[i].length).toBe(0);
      }
    });
  });

  describe('setupPlayerCards', () => {
    it('should set up hand and personal pile', () => {
      const player = createPlayer('Test', 1);
      const handCards = [
        createCard(Suit.HEARTS, Rank.ACE),
        createCard(Suit.SPADES, Rank.TWO),
      ];
      const pileCards = [
        createCard(Suit.HEARTS, Rank.THREE),
        createCard(Suit.SPADES, Rank.FOUR),
      ];
      
      const updatedPlayer = setupPlayerCards(player, handCards, pileCards);
      expect(updatedPlayer.hand.length).toBe(2);
      expect(updatedPlayer.personalPile.length).toBe(2);
      expect(getPersonalPileTop(updatedPlayer)?.rank).toBe(Rank.FOUR); // Last card is on top
    });
  });

  describe('Hand Methods', () => {
    let player: ReturnType<typeof createPlayer>;

    beforeEach(() => {
      player = createPlayer('Test', 1);
    });

    describe('getHand', () => {
      it('should return a copy of the hand', () => {
        const card = createCard(Suit.HEARTS, Rank.ACE);
        player = addToHand(player, card);
        const hand = getHand(player);
        expect(hand.length).toBe(1);
        expect(hand[0].id).toBe(card.id);
        // Modifying returned array should not affect player
        hand.push(createCard(Suit.SPADES, Rank.TWO));
        expect(player.hand.length).toBe(1);
      });
    });

    describe('getHandSize', () => {
      it('should return correct hand size', () => {
        expect(getHandSize(player)).toBe(0);
        player = addToHand(player, createCard(Suit.HEARTS, Rank.ACE));
        expect(getHandSize(player)).toBe(1);
      });
    });

    describe('getHandCard', () => {
      it('should return card at index', () => {
        const card = createCard(Suit.HEARTS, Rank.ACE);
        player = addToHand(player, card);
        expect(getHandCard(player, 0)).not.toBeNull();
        expect(getHandCard(player, 0)?.id).toBe(card.id);
      });

      it('should return null for invalid index', () => {
        expect(getHandCard(player, 0)).toBeNull();
        expect(getHandCard(player, -1)).toBeNull();
        expect(getHandCard(player, 10)).toBeNull();
      });
    });

    describe('removeFromHand', () => {
      it('should remove card from hand', () => {
        const card = createCard(Suit.HEARTS, Rank.ACE);
        player = addToHand(player, card);
        const [removedCard, updatedPlayer] = removeFromHand(player, 0);
        
        expect(removedCard).not.toBeNull();
        expect(removedCard?.id).toBe(card.id);
        expect(updatedPlayer.hand.length).toBe(0);
      });

      it('should return null for invalid index', () => {
        const [card, updatedPlayer] = removeFromHand(player, 0);
        expect(card).toBeNull();
        expect(updatedPlayer).toBe(player);
      });
    });

    describe('addToHand', () => {
      it('should add card to hand', () => {
        const card = createCard(Suit.HEARTS, Rank.ACE);
        player = addToHand(player, card);
        expect(player.hand.length).toBe(1);
        expect(player.hand[0].id).toBe(card.id);
      });
    });

    describe('addCardsToHand', () => {
      it('should add multiple cards', () => {
        const cards = [
          createCard(Suit.HEARTS, Rank.ACE),
          createCard(Suit.SPADES, Rank.TWO),
        ];
        player = addCardsToHand(player, cards);
        expect(player.hand.length).toBe(2);
      });
    });

    describe('isHandEmpty', () => {
      it('should return true for empty hand', () => {
        expect(isHandEmpty(player)).toBe(true);
      });

      it('should return false for non-empty hand', () => {
        player = addToHand(player, createCard(Suit.HEARTS, Rank.ACE));
        expect(isHandEmpty(player)).toBe(false);
      });
    });

    describe('isHandFull', () => {
      it('should return false when hand is not full', () => {
        expect(isHandFull(player)).toBe(false);
        player = addToHand(player, createCard(Suit.HEARTS, Rank.ACE));
        expect(isHandFull(player)).toBe(false);
      });

      it('should return true when hand is full', () => {
        for (let i = 0; i < MAX_HAND_SIZE; i++) {
          player = addToHand(player, createCard(Suit.HEARTS, i + 1 as Rank));
        }
        expect(isHandFull(player)).toBe(true);
      });
    });

    describe('cardsNeededToFillHand', () => {
      it('should return MAX_HAND_SIZE for empty hand', () => {
        expect(cardsNeededToFillHand(player)).toBe(MAX_HAND_SIZE);
      });

      it('should return correct number needed', () => {
        player = addToHand(player, createCard(Suit.HEARTS, Rank.ACE));
        expect(cardsNeededToFillHand(player)).toBe(MAX_HAND_SIZE - 1);
      });

      it('should return 0 for full hand', () => {
        for (let i = 0; i < MAX_HAND_SIZE; i++) {
          player = addToHand(player, createCard(Suit.HEARTS, i + 1 as Rank));
        }
        expect(cardsNeededToFillHand(player)).toBe(0);
      });
    });
  });

  describe('Personal Pile Methods', () => {
    let player: ReturnType<typeof createPlayer>;

    beforeEach(() => {
      player = createPlayer('Test', 1);
      const pileCards = [
        createCard(Suit.HEARTS, Rank.ACE),
        createCard(Suit.SPADES, Rank.TWO),
      ];
      player = setupPlayerCards(player, [], pileCards);
    });

    describe('getPersonalPileTop', () => {
      it('should return top card', () => {
        const topCard = getPersonalPileTop(player);
        expect(topCard).not.toBeNull();
        expect(topCard?.rank).toBe(Rank.TWO); // Last card added is on top
      });

      it('should return null for empty pile', () => {
        const emptyPlayer = createPlayer('Test', 1);
        expect(getPersonalPileTop(emptyPlayer)).toBeNull();
      });
    });

    describe('removeFromPersonalPile', () => {
      it('should remove top card', () => {
        const [removedCard, updatedPlayer] = removeFromPersonalPile(player);
        expect(removedCard).not.toBeNull();
        expect(removedCard?.rank).toBe(Rank.TWO);
        expect(getPersonalPileSize(updatedPlayer)).toBe(1);
      });

      it('should return null for empty pile', () => {
        const emptyPlayer = createPlayer('Test', 1);
        const [card, updatedPlayer] = removeFromPersonalPile(emptyPlayer);
        expect(card).toBeNull();
        expect(updatedPlayer).toBe(emptyPlayer);
      });
    });

    describe('getPersonalPileSize', () => {
      it('should return correct size', () => {
        expect(getPersonalPileSize(player)).toBe(2);
      });
    });

    describe('isPersonalPileEmpty', () => {
      it('should return false for non-empty pile', () => {
        expect(isPersonalPileEmpty(player)).toBe(false);
      });

      it('should return true for empty pile', () => {
        const emptyPlayer = createPlayer('Test', 1);
        expect(isPersonalPileEmpty(emptyPlayer)).toBe(true);
      });
    });

    describe('hasWon', () => {
      it('should return false when pile is not empty', () => {
        expect(hasWon(player)).toBe(false);
      });

      it('should return true when pile is empty', () => {
        const emptyPlayer = createPlayer('Test', 1);
        expect(hasWon(emptyPlayer)).toBe(true);
      });
    });
  });

  describe('Storage Methods', () => {
    let player: ReturnType<typeof createPlayer>;

    beforeEach(() => {
      player = createPlayer('Test', 1);
    });

    describe('getStorageTop', () => {
      it('should return null for empty stack', () => {
        expect(getStorageTop(player, 0)).toBeNull();
      });

      it('should return top card', () => {
        const card = createCard(Suit.HEARTS, Rank.ACE);
        player = addToStorage(player, 0, card);
        const topCard = getStorageTop(player, 0);
        expect(topCard).not.toBeNull();
        expect(topCard?.id).toBe(card.id);
      });
    });

    describe('addToStorage', () => {
      it('should add card to storage stack', () => {
        const card = createCard(Suit.HEARTS, Rank.ACE);
        player = addToStorage(player, 0, card);
        expect(getStorageStackSize(player, 0)).toBe(1);
        expect(getStorageTop(player, 0)?.id).toBe(card.id);
      });

      it('should stack cards correctly', () => {
        const card1 = createCard(Suit.HEARTS, Rank.ACE);
        const card2 = createCard(Suit.SPADES, Rank.TWO);
        player = addToStorage(player, 0, card1);
        player = addToStorage(player, 0, card2);
        expect(getStorageStackSize(player, 0)).toBe(2);
        expect(getStorageTop(player, 0)?.id).toBe(card2.id); // Last added is on top
      });
    });

    describe('removeFromStorage', () => {
      it('should remove top card from stack', () => {
        const card = createCard(Suit.HEARTS, Rank.ACE);
        player = addToStorage(player, 0, card);
        const [removedCard, updatedPlayer] = removeFromStorage(player, 0);
        
        expect(removedCard).not.toBeNull();
        expect(removedCard?.id).toBe(card.id);
        expect(getStorageStackSize(updatedPlayer, 0)).toBe(0);
      });

      it('should return null for empty stack', () => {
        const [card, updatedPlayer] = removeFromStorage(player, 0);
        expect(card).toBeNull();
        expect(updatedPlayer).toBe(player);
      });
    });

    describe('getStorageStackSize', () => {
      it('should return correct size', () => {
        expect(getStorageStackSize(player, 0)).toBe(0);
        const card = createCard(Suit.HEARTS, Rank.ACE);
        player = addToStorage(player, 0, card);
        expect(getStorageStackSize(player, 0)).toBe(1);
      });
    });
  });
});
