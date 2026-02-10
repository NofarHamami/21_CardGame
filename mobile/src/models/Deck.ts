import { Card, createCard } from './Card';
import { Suit, Rank, getAllSuits, getAllRanks } from './types';

/**
 * Represents a deck of cards that can be shuffled and drawn from.
 * Uses an array as a stack (end of array = top of deck)
 */
export interface Deck {
  cards: Card[];
}

/**
 * Create an empty deck
 */
export function createEmptyDeck(): Deck {
  return { cards: [] };
}

/**
 * Creates a standard 52-card deck
 */
export function createStandardDeck(): Deck {
  const cards: Card[] = [];
  for (const suit of getAllSuits()) {
    for (const rank of getAllRanks()) {
      cards.push(createCard(suit, rank));
    }
  }
  return { cards };
}

/**
 * Creates multiple standard decks combined.
 * @param numDecks Number of 52-card decks to combine
 */
export function createMultipleDecks(numDecks: number): Deck {
  const cards: Card[] = [];
  for (let i = 0; i < numDecks; i++) {
    for (const suit of getAllSuits()) {
      for (const rank of getAllRanks()) {
        cards.push(createCard(suit, rank));
      }
    }
  }
  return { cards };
}

/**
 * Fisher-Yates shuffle algorithm
 */
export function shuffleDeck(deck: Deck): Deck {
  const cards = [...deck.cards];
  for (let i = cards.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [cards[i], cards[j]] = [cards[j], cards[i]];
  }
  return { cards };
}

/**
 * Draw a card from the top of the deck
 * @returns [drawnCard, remainingDeck] or [null, deck] if empty
 */
export function drawCard(deck: Deck): [Card | null, Deck] {
  if (deck.cards.length === 0) {
    return [null, deck];
  }
  const cards = [...deck.cards];
  const card = cards.pop()!;
  return [card, { cards }];
}

/**
 * Draw multiple cards from the deck
 * @param count Number of cards to draw
 * @returns [drawnCards, remainingDeck]
 */
export function drawCards(deck: Deck, count: number): [Card[], Deck] {
  const drawn: Card[] = [];
  const cards = [...deck.cards];
  for (let i = 0; i < count && cards.length > 0; i++) {
    drawn.push(cards.pop()!);
  }
  return [drawn, { cards }];
}

/**
 * Peek at the top card without removing it
 */
export function peekDeck(deck: Deck): Card | null {
  if (deck.cards.length === 0) {
    return null;
  }
  return deck.cards[deck.cards.length - 1];
}

/**
 * Add a card to the top of the deck
 */
export function addCardToDeck(deck: Deck, card: Card): Deck {
  return { cards: [...deck.cards, card] };
}

/**
 * Add multiple cards to the deck
 */
export function addCardsToDeck(deck: Deck, cardsToAdd: Card[]): Deck {
  return { cards: [...deck.cards, ...cardsToAdd] };
}

/**
 * Get the number of cards in the deck
 */
export function deckSize(deck: Deck): number {
  return deck.cards.length;
}

/**
 * Check if the deck is empty
 */
export function isDeckEmpty(deck: Deck): boolean {
  return deck.cards.length === 0;
}

/**
 * Clear all cards from the deck
 */
export function clearDeck(): Deck {
  return { cards: [] };
}
