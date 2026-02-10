import {
  Suit,
  Rank,
  getSuitSymbol,
  getRankSymbol,
  isSuitRed,
  isKing,
  isAce,
  isQueen,
} from './types';

/**
 * Represents a playing card with a suit and rank.
 */
export interface Card {
  readonly suit: Suit;
  readonly rank: Rank;
  readonly id: string; // Unique identifier for React keys
}

let cardIdCounter = 0;

/**
 * Create a new card
 */
export function createCard(suit: Suit, rank: Rank): Card {
  return {
    suit,
    rank,
    id: `card-${cardIdCounter++}`,
  };
}

/**
 * Get the numeric value of a card (based on rank)
 */
export function getCardValue(card: Card): number {
  return card.rank;
}

/**
 * Check if card is a King (wild/joker)
 */
export function isCardKing(card: Card): boolean {
  return isKing(card.rank);
}

/**
 * Check if card is an Ace (can start a center pile)
 */
export function isCardAce(card: Card): boolean {
  return isAce(card.rank);
}

/**
 * Check if card is a Queen (completes a center pile)
 */
export function isCardQueen(card: Card): boolean {
  return isQueen(card.rank);
}

/**
 * Check if card is red (Hearts or Diamonds)
 */
export function isCardRed(card: Card): boolean {
  return isSuitRed(card.suit);
}

/**
 * Check if this card can be placed on top of another card in a center pile.
 * King is wild and can be placed on any pile at any time (including to start).
 *
 * @param card The card to place
 * @param topCard The current top card of the pile (null if pile is empty)
 * @returns true if the card can be placed
 */
export function canCardPlaceOn(card: Card, topCard: Card | null): boolean {
  // King is wild - can be placed on any pile at any time
  if (isCardKing(card)) {
    return true;
  }

  // If pile is empty, only Ace can start
  if (topCard === null) {
    return isCardAce(card);
  }

  // If top card is King (acting as wild), we allow the next expected card
  // This will be handled by CenterPile which tracks expected value
  if (isCardKing(topCard)) {
    return true;
  }

  // Normal case: this card's value must be exactly one more than top card
  return getCardValue(card) === getCardValue(topCard) + 1;
}

/**
 * Get string representation of a card (e.g., "A♥", "K♠")
 */
export function cardToString(card: Card): string {
  return getRankSymbol(card.rank) + getSuitSymbol(card.suit);
}

/**
 * Check if two cards are equal
 */
export function cardsEqual(a: Card, b: Card): boolean {
  return a.suit === b.suit && a.rank === b.rank;
}

/**
 * Reset the card ID counter (useful for testing)
 */
export function resetCardIdCounter(): void {
  cardIdCounter = 0;
}
