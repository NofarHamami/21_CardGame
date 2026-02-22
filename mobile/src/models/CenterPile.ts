import { Card, isCardKing, isCardAce, getCardValue } from './Card';
import { Rank, getRankSymbol } from './types';
import { logger } from '../utils/logger';

/**
 * Represents one of the 4 center piles where cards are played.
 * Piles start with Ace and end with Queen.
 * King acts as a wild card and can be placed at any time (including to start a pile).
 */
export interface CenterPile {
  cards: Card[]; // Array used as stack (end = top)
  expectedNextValue: number; // Tracks expected value (handles King wild cards)
}

/**
 * Create an empty center pile
 */
export function createCenterPile(): CenterPile {
  return {
    cards: [],
    expectedNextValue: 1, // Expecting Ace to start
  };
}

/**
 * Check if a card can be placed on this pile.
 * @param pile The center pile
 * @param card The card to check
 * @returns true if the card can be placed
 */
export function canPlaceOnPile(pile: CenterPile, card: Card): boolean {
  // If pile is complete (has Queen or reached end), can't add more
  if (isPileComplete(pile)) {
    logger.debug('canPlaceOnPile: pile is complete, returning false');
    return false;
  }

  // King is wild - can be placed on ANY pile at ANY time (including to start)
  const isKing = isCardKing(card);
  const cardRank = card.rank;
  logger.debug('canPlaceOnPile: card rank =', cardRank, 'isKing =', isKing);
  if (isKing) {
    logger.debug('canPlaceOnPile: King detected, returning true');
    return true;
  }

  // If pile is empty, only Ace can start
  if (pile.cards.length === 0) {
    const isAce = isCardAce(card);
    logger.debug('canPlaceOnPile: pile empty, isAce =', isAce);
    return isAce;
  }

  // Card value must match expected next value
  const cardValue = getCardValue(card);
  const topCard = pile.cards.length > 0 ? pile.cards[pile.cards.length - 1] : null;
  const topCardIsKing = topCard ? isCardKing(topCard) : false;
  const matches = cardValue === pile.expectedNextValue;
  logger.debug('canPlaceOnPile: cardValue =', cardValue, 'expected =', pile.expectedNextValue, 'pile cards =', pile.cards.length, 'topCardIsKing =', topCardIsKing, 'matches =', matches);
  if (!matches) {
    logger.debug('canPlaceOnPile: MISMATCH - trying to place', cardValue, 'but pile expects', pile.expectedNextValue);
  }
  return matches;
}

/**
 * Place a card on the pile.
 * @param pile The center pile
 * @param card The card to place
 * @returns [success, updatedPile]
 */
export function placeOnPile(pile: CenterPile, card: Card): [boolean, CenterPile] {
  if (!canPlaceOnPile(pile, card)) {
    return [false, pile];
  }

  const newCards = [...pile.cards, card];
  let newExpectedValue: number;

  if (isCardKing(card)) {
    // King acts as the expected value, so next value increments
    // If pile was empty (expectedNextValue = 1 for Ace), King acts as Ace (1), so next is 2
    newExpectedValue = pile.expectedNextValue + 1;
    logger.debug('placeOnPile: King placed - old expected:', pile.expectedNextValue, 'new expected:', newExpectedValue);
  } else {
    newExpectedValue = getCardValue(card) + 1;
    logger.debug('placeOnPile: Non-King placed - card value:', getCardValue(card), 'new expected:', newExpectedValue);
  }

  return [true, { cards: newCards, expectedNextValue: newExpectedValue }];
}

/**
 * Returns the top card of the pile without removing it.
 */
export function peekPile(pile: CenterPile): Card | null {
  if (pile.cards.length === 0) {
    return null;
  }
  return pile.cards[pile.cards.length - 1];
}

/**
 * Returns true if the pile is complete (ends with Queen or value 12)
 */
export function isPileComplete(pile: CenterPile): boolean {
  return pile.expectedNextValue > 12; // Queen is 12, so next would be 13+
}

/**
 * Returns true if the pile is empty
 */
export function isPileEmpty(pile: CenterPile): boolean {
  return pile.cards.length === 0;
}

/**
 * Returns the number of cards in the pile
 */
export function pileSize(pile: CenterPile): number {
  return pile.cards.length;
}

/**
 * Returns the expected next card value for this pile
 */
export function getExpectedNextValue(pile: CenterPile): number {
  return pile.expectedNextValue;
}

/**
 * Returns a string representation of the expected next card
 */
export function getExpectedNextRank(pile: CenterPile): string {
  if (isPileComplete(pile)) {
    return 'Complete';
  }
  
  const rankValues: Record<number, Rank> = {
    1: Rank.ACE,
    2: Rank.TWO,
    3: Rank.THREE,
    4: Rank.FOUR,
    5: Rank.FIVE,
    6: Rank.SIX,
    7: Rank.SEVEN,
    8: Rank.EIGHT,
    9: Rank.NINE,
    10: Rank.TEN,
    11: Rank.JACK,
    12: Rank.QUEEN,
    13: Rank.KING,
  };
  
  const rank = rankValues[pile.expectedNextValue];
  if (rank !== undefined) {
    return getRankSymbol(rank);
  }
  return '?';
}

/**
 * Clear the pile (for starting a new game)
 */
export function clearPile(): CenterPile {
  return createCenterPile();
}

/**
 * Collect all cards from the pile and clear it.
 * Used when a pile is complete to return cards to stock.
 * @returns [collectedCards, clearedPile]
 */
export function collectAndClearPile(pile: CenterPile): [Card[], CenterPile] {
  const collected = [...pile.cards];
  return [collected, createCenterPile()];
}

/**
 * Get string representation of pile
 */
export function pileToString(pile: CenterPile): string {
  if (pile.cards.length === 0) {
    return '[Empty - needs A]';
  }
  const topCard = pile.cards[pile.cards.length - 1];
  return `[${topCard} -> needs ${getExpectedNextRank(pile)}]`;
}
