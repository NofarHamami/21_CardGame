import { createCard, getCardValue, isCardKing, isCardAce, isCardQueen, isCardRed, canCardPlaceOn, cardToString, cardsEqual, resetCardIdCounter } from '../Card';
import { Suit, Rank } from '../types';

describe('Card', () => {
  beforeEach(() => {
    resetCardIdCounter();
  });

  describe('createCard', () => {
    it('should create a card with correct suit and rank', () => {
      const card = createCard(Suit.HEARTS, Rank.ACE);
      expect(card.suit).toBe(Suit.HEARTS);
      expect(card.rank).toBe(Rank.ACE);
      expect(card.id).toBeDefined();
    });

    it('should generate unique IDs for cards', () => {
      const card1 = createCard(Suit.HEARTS, Rank.ACE);
      const card2 = createCard(Suit.SPADES, Rank.KING);
      expect(card1.id).not.toBe(card2.id);
    });
  });

  describe('getCardValue', () => {
    it('should return the rank as the card value', () => {
      const card = createCard(Suit.HEARTS, Rank.FIVE);
      expect(getCardValue(card)).toBe(Rank.FIVE);
    });
  });

  describe('isCardKing', () => {
    it('should return true for King cards', () => {
      const king = createCard(Suit.HEARTS, Rank.KING);
      expect(isCardKing(king)).toBe(true);
    });

    it('should return false for non-King cards', () => {
      const ace = createCard(Suit.HEARTS, Rank.ACE);
      expect(isCardKing(ace)).toBe(false);
    });
  });

  describe('isCardAce', () => {
    it('should return true for Ace cards', () => {
      const ace = createCard(Suit.HEARTS, Rank.ACE);
      expect(isCardAce(ace)).toBe(true);
    });

    it('should return false for non-Ace cards', () => {
      const king = createCard(Suit.HEARTS, Rank.KING);
      expect(isCardAce(king)).toBe(false);
    });
  });

  describe('isCardQueen', () => {
    it('should return true for Queen cards', () => {
      const queen = createCard(Suit.HEARTS, Rank.QUEEN);
      expect(isCardQueen(queen)).toBe(true);
    });

    it('should return false for non-Queen cards', () => {
      const king = createCard(Suit.HEARTS, Rank.KING);
      expect(isCardQueen(king)).toBe(false);
    });
  });

  describe('isCardRed', () => {
    it('should return true for Hearts', () => {
      const card = createCard(Suit.HEARTS, Rank.ACE);
      expect(isCardRed(card)).toBe(true);
    });

    it('should return true for Diamonds', () => {
      const card = createCard(Suit.DIAMONDS, Rank.ACE);
      expect(isCardRed(card)).toBe(true);
    });

    it('should return false for Spades', () => {
      const card = createCard(Suit.SPADES, Rank.ACE);
      expect(isCardRed(card)).toBe(false);
    });

    it('should return false for Clubs', () => {
      const card = createCard(Suit.CLUBS, Rank.ACE);
      expect(isCardRed(card)).toBe(false);
    });
  });

  describe('canCardPlaceOn', () => {
    it('should allow King on empty pile', () => {
      const king = createCard(Suit.HEARTS, Rank.KING);
      expect(canCardPlaceOn(king, null)).toBe(true);
    });

    it('should allow King on any card', () => {
      const king = createCard(Suit.HEARTS, Rank.KING);
      const five = createCard(Suit.SPADES, Rank.FIVE);
      expect(canCardPlaceOn(king, five)).toBe(true);
    });

    it('should allow Ace on empty pile', () => {
      const ace = createCard(Suit.HEARTS, Rank.ACE);
      expect(canCardPlaceOn(ace, null)).toBe(true);
    });

    it('should not allow non-Ace on empty pile', () => {
      const two = createCard(Suit.HEARTS, Rank.TWO);
      expect(canCardPlaceOn(two, null)).toBe(false);
    });

    it('should allow sequential cards', () => {
      const ace = createCard(Suit.HEARTS, Rank.ACE);
      const two = createCard(Suit.SPADES, Rank.TWO);
      expect(canCardPlaceOn(two, ace)).toBe(true);
    });

    it('should not allow non-sequential cards', () => {
      const ace = createCard(Suit.HEARTS, Rank.ACE);
      const three = createCard(Suit.SPADES, Rank.THREE);
      expect(canCardPlaceOn(three, ace)).toBe(false);
    });

    it('should allow any card on King', () => {
      const king = createCard(Suit.HEARTS, Rank.KING);
      const two = createCard(Suit.SPADES, Rank.TWO);
      expect(canCardPlaceOn(two, king)).toBe(true);
    });
  });

  describe('cardToString', () => {
    it('should return string representation', () => {
      const card = createCard(Suit.HEARTS, Rank.ACE);
      const str = cardToString(card);
      expect(str).toBeDefined();
      expect(typeof str).toBe('string');
    });
  });

  describe('cardsEqual', () => {
    it('should return true for identical cards', () => {
      const card1 = createCard(Suit.HEARTS, Rank.ACE);
      const card2 = createCard(Suit.HEARTS, Rank.ACE);
      expect(cardsEqual(card1, card2)).toBe(true);
    });

    it('should return false for different suits', () => {
      const card1 = createCard(Suit.HEARTS, Rank.ACE);
      const card2 = createCard(Suit.SPADES, Rank.ACE);
      expect(cardsEqual(card1, card2)).toBe(false);
    });

    it('should return false for different ranks', () => {
      const card1 = createCard(Suit.HEARTS, Rank.ACE);
      const card2 = createCard(Suit.HEARTS, Rank.TWO);
      expect(cardsEqual(card1, card2)).toBe(false);
    });
  });
});
