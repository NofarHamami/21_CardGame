import { createCenterPile, canPlaceOnPile, placeOnPile, peekPile, isPileComplete, isPileEmpty, pileSize, getExpectedNextRank, collectAndClearPile } from '../CenterPile';
import { createCard } from '../Card';
import { Suit, Rank } from '../types';

describe('CenterPile', () => {
  describe('createCenterPile', () => {
    it('should create an empty pile expecting Ace', () => {
      const pile = createCenterPile();
      expect(pile.cards.length).toBe(0);
      expect(pile.expectedNextValue).toBe(1); // Ace
      expect(isPileEmpty(pile)).toBe(true);
    });
  });

  describe('canPlaceOnPile', () => {
    it('should allow Ace on empty pile', () => {
      const pile = createCenterPile();
      const ace = createCard(Suit.HEARTS, Rank.ACE);
      expect(canPlaceOnPile(pile, ace)).toBe(true);
    });

    it('should not allow non-Ace on empty pile', () => {
      const pile = createCenterPile();
      const two = createCard(Suit.HEARTS, Rank.TWO);
      expect(canPlaceOnPile(pile, two)).toBe(false);
    });

    it('should allow King on empty pile', () => {
      const pile = createCenterPile();
      const king = createCard(Suit.HEARTS, Rank.KING);
      expect(canPlaceOnPile(pile, king)).toBe(true);
    });

    it('should allow sequential cards', () => {
      const pile = createCenterPile();
      const ace = createCard(Suit.HEARTS, Rank.ACE);
      const [success, updatedPile] = placeOnPile(pile, ace);
      expect(success).toBe(true);
      
      const two = createCard(Suit.SPADES, Rank.TWO);
      expect(canPlaceOnPile(updatedPile, two)).toBe(true);
    });

    it('should not allow non-sequential cards', () => {
      const pile = createCenterPile();
      const ace = createCard(Suit.HEARTS, Rank.ACE);
      const [success, updatedPile] = placeOnPile(pile, ace);
      expect(success).toBe(true);
      
      const three = createCard(Suit.SPADES, Rank.THREE);
      expect(canPlaceOnPile(updatedPile, three)).toBe(false);
    });

    it('should allow King at any time', () => {
      const pile = createCenterPile();
      const ace = createCard(Suit.HEARTS, Rank.ACE);
      const [success, updatedPile] = placeOnPile(pile, ace);
      expect(success).toBe(true);
      
      const king = createCard(Suit.SPADES, Rank.KING);
      expect(canPlaceOnPile(updatedPile, king)).toBe(true);
    });

    it('should not allow cards on complete pile', () => {
      const pile = createCenterPile();
      // Build a complete pile (Ace through Queen)
      const ranks = [Rank.ACE, Rank.TWO, Rank.THREE, Rank.FOUR, Rank.FIVE, Rank.SIX, Rank.SEVEN, Rank.EIGHT, Rank.NINE, Rank.TEN, Rank.JACK, Rank.QUEEN];
      let currentPile = pile;
      for (const rank of ranks) {
        const card = createCard(Suit.HEARTS, rank);
        const [success, updatedPile] = placeOnPile(currentPile, card);
        expect(success).toBe(true);
        currentPile = updatedPile;
      }
      
      expect(isPileComplete(currentPile)).toBe(true);
      const extraCard = createCard(Suit.HEARTS, Rank.KING);
      expect(canPlaceOnPile(currentPile, extraCard)).toBe(false);
    });
  });

  describe('placeOnPile', () => {
    it('should place Ace on empty pile', () => {
      const pile = createCenterPile();
      const ace = createCard(Suit.HEARTS, Rank.ACE);
      const [success, updatedPile] = placeOnPile(pile, ace);
      
      expect(success).toBe(true);
      expect(updatedPile.cards.length).toBe(1);
      expect(updatedPile.expectedNextValue).toBe(2); // Expecting Two next
    });

    it('should not place invalid card', () => {
      const pile = createCenterPile();
      const two = createCard(Suit.HEARTS, Rank.TWO);
      const [success, updatedPile] = placeOnPile(pile, two);
      
      expect(success).toBe(false);
      expect(updatedPile.cards.length).toBe(0);
    });

    it('should place King and increment expected value', () => {
      const pile = createCenterPile();
      const king = createCard(Suit.HEARTS, Rank.KING);
      const [success, updatedPile] = placeOnPile(pile, king);
      
      expect(success).toBe(true);
      expect(updatedPile.expectedNextValue).toBe(2); // King acts as Ace, next is Two
    });

    it('should allow placing 2 after King was placed as Ace', () => {
      const pile = createCenterPile();
      const king = createCard(Suit.HEARTS, Rank.KING);
      const [success1, pile1] = placeOnPile(pile, king);
      expect(success1).toBe(true);
      expect(pile1.expectedNextValue).toBe(2);
      
      const two = createCard(Suit.SPADES, Rank.TWO);
      expect(canPlaceOnPile(pile1, two)).toBe(true);
      
      const [success2, pile2] = placeOnPile(pile1, two);
      expect(success2).toBe(true);
      expect(pile2.expectedNextValue).toBe(3); // Next should be Three
      expect(pile2.cards.length).toBe(2);
    });

    it('should build a complete sequence', () => {
      const pile = createCenterPile();
      const ranks = [Rank.ACE, Rank.TWO, Rank.THREE];
      let currentPile = pile;
      
      for (const rank of ranks) {
        const card = createCard(Suit.HEARTS, rank);
        const [success, updatedPile] = placeOnPile(currentPile, card);
        expect(success).toBe(true);
        currentPile = updatedPile;
      }
      
      expect(currentPile.cards.length).toBe(3);
      expect(currentPile.expectedNextValue).toBe(4); // Expecting Four next
    });
  });

  describe('peekPile', () => {
    it('should return null for empty pile', () => {
      const pile = createCenterPile();
      expect(peekPile(pile)).toBeNull();
    });

    it('should return top card', () => {
      const pile = createCenterPile();
      const ace = createCard(Suit.HEARTS, Rank.ACE);
      const [success, updatedPile] = placeOnPile(pile, ace);
      expect(success).toBe(true);
      
      const topCard = peekPile(updatedPile);
      expect(topCard).not.toBeNull();
      expect(topCard?.rank).toBe(Rank.ACE);
    });
  });

  describe('isPileComplete', () => {
    it('should return false for empty pile', () => {
      const pile = createCenterPile();
      expect(isPileComplete(pile)).toBe(false);
    });

    it('should return false for incomplete pile', () => {
      const pile = createCenterPile();
      const ace = createCard(Suit.HEARTS, Rank.ACE);
      const [success, updatedPile] = placeOnPile(pile, ace);
      expect(success).toBe(true);
      expect(isPileComplete(updatedPile)).toBe(false);
    });

    it('should return true after Queen is placed', () => {
      const pile = createCenterPile();
      const ranks = [Rank.ACE, Rank.TWO, Rank.THREE, Rank.FOUR, Rank.FIVE, Rank.SIX, Rank.SEVEN, Rank.EIGHT, Rank.NINE, Rank.TEN, Rank.JACK, Rank.QUEEN];
      let currentPile = pile;
      for (const rank of ranks) {
        const card = createCard(Suit.HEARTS, rank);
        const [success, updatedPile] = placeOnPile(currentPile, card);
        expect(success).toBe(true);
        currentPile = updatedPile;
      }
      
      expect(isPileComplete(currentPile)).toBe(true);
    });
  });

  describe('isPileEmpty', () => {
    it('should return true for empty pile', () => {
      const pile = createCenterPile();
      expect(isPileEmpty(pile)).toBe(true);
    });

    it('should return false for non-empty pile', () => {
      const pile = createCenterPile();
      const ace = createCard(Suit.HEARTS, Rank.ACE);
      const [success, updatedPile] = placeOnPile(pile, ace);
      expect(success).toBe(true);
      expect(isPileEmpty(updatedPile)).toBe(false);
    });
  });

  describe('pileSize', () => {
    it('should return 0 for empty pile', () => {
      const pile = createCenterPile();
      expect(pileSize(pile)).toBe(0);
    });

    it('should return correct size', () => {
      const pile = createCenterPile();
      const ace = createCard(Suit.HEARTS, Rank.ACE);
      const [success, updatedPile] = placeOnPile(pile, ace);
      expect(success).toBe(true);
      expect(pileSize(updatedPile)).toBe(1);
    });
  });

  describe('getExpectedNextRank', () => {
    it('should return Ace for empty pile', () => {
      const pile = createCenterPile();
      expect(getExpectedNextRank(pile)).toBe('A');
    });

    it('should return correct next rank', () => {
      const pile = createCenterPile();
      const ace = createCard(Suit.HEARTS, Rank.ACE);
      const [success, updatedPile] = placeOnPile(pile, ace);
      expect(success).toBe(true);
      expect(getExpectedNextRank(updatedPile)).toBe('2');
    });

    it('should return Complete for complete pile', () => {
      const pile = createCenterPile();
      const ranks = [Rank.ACE, Rank.TWO, Rank.THREE, Rank.FOUR, Rank.FIVE, Rank.SIX, Rank.SEVEN, Rank.EIGHT, Rank.NINE, Rank.TEN, Rank.JACK, Rank.QUEEN];
      let currentPile = pile;
      for (const rank of ranks) {
        const card = createCard(Suit.HEARTS, rank);
        const [success, updatedPile] = placeOnPile(currentPile, card);
        expect(success).toBe(true);
        currentPile = updatedPile;
      }
      
      expect(getExpectedNextRank(currentPile)).toBe('Complete');
    });
  });

  describe('collectAndClearPile', () => {
    it('should collect all cards and clear pile', () => {
      const pile = createCenterPile();
      const ace = createCard(Suit.HEARTS, Rank.ACE);
      const two = createCard(Suit.SPADES, Rank.TWO);
      const [success1, pile1] = placeOnPile(pile, ace);
      const [success2, pile2] = placeOnPile(pile1, two);
      expect(success1).toBe(true);
      expect(success2).toBe(true);
      
      const [collectedCards, clearedPile] = collectAndClearPile(pile2);
      expect(collectedCards.length).toBe(2);
      expect(isPileEmpty(clearedPile)).toBe(true);
      expect(clearedPile.expectedNextValue).toBe(1); // Reset to Ace
    });
  });
});
