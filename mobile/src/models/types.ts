/**
 * Card suit enumeration with display symbols
 */
export enum Suit {
  HEARTS = 'HEARTS',
  DIAMONDS = 'DIAMONDS',
  CLUBS = 'CLUBS',
  SPADES = 'SPADES',
}

/**
 * Card rank enumeration with numeric values
 */
export enum Rank {
  ACE = 1,
  TWO = 2,
  THREE = 3,
  FOUR = 4,
  FIVE = 5,
  SIX = 6,
  SEVEN = 7,
  EIGHT = 8,
  NINE = 9,
  TEN = 10,
  JACK = 11,
  QUEEN = 12,
  KING = 13,
}

/**
 * Get the display symbol for a suit
 */
export function getSuitSymbol(suit: Suit): string {
  switch (suit) {
    case Suit.HEARTS:
      return '♥';
    case Suit.DIAMONDS:
      return '♦';
    case Suit.CLUBS:
      return '♣';
    case Suit.SPADES:
      return '♠';
  }
}

/**
 * Get the display name for a suit
 */
export function getSuitName(suit: Suit): string {
  switch (suit) {
    case Suit.HEARTS:
      return 'Hearts';
    case Suit.DIAMONDS:
      return 'Diamonds';
    case Suit.CLUBS:
      return 'Clubs';
    case Suit.SPADES:
      return 'Spades';
  }
}

/**
 * Check if a suit is red (Hearts or Diamonds)
 */
export function isSuitRed(suit: Suit): boolean {
  return suit === Suit.HEARTS || suit === Suit.DIAMONDS;
}

/**
 * Get the display symbol for a rank
 */
export function getRankSymbol(rank: Rank): string {
  switch (rank) {
    case Rank.ACE:
      return 'A';
    case Rank.JACK:
      return 'J';
    case Rank.QUEEN:
      return 'Q';
    case Rank.KING:
      return 'K';
    default:
      return rank.toString();
  }
}

/**
 * Check if rank is King (wild card)
 */
export function isKing(rank: Rank): boolean {
  return rank === Rank.KING;
}

/**
 * Check if rank is Ace (starts center pile)
 */
export function isAce(rank: Rank): boolean {
  return rank === Rank.ACE;
}

/**
 * Check if rank is Queen (completes center pile)
 */
export function isQueen(rank: Rank): boolean {
  return rank === Rank.QUEEN;
}

/**
 * Get the next rank in sequence (for center pile validation)
 * Returns null if this is Queen (end of pile) or King (wild)
 */
export function getNextRank(rank: Rank): Rank | null {
  if (rank === Rank.QUEEN || rank === Rank.KING) {
    return null;
  }
  return rank + 1;
}

/**
 * Get all suits as an array
 */
export function getAllSuits(): Suit[] {
  return [Suit.HEARTS, Suit.DIAMONDS, Suit.CLUBS, Suit.SPADES];
}

/**
 * Get all ranks as an array
 */
export function getAllRanks(): Rank[] {
  return [
    Rank.ACE,
    Rank.TWO,
    Rank.THREE,
    Rank.FOUR,
    Rank.FIVE,
    Rank.SIX,
    Rank.SEVEN,
    Rank.EIGHT,
    Rank.NINE,
    Rank.TEN,
    Rank.JACK,
    Rank.QUEEN,
    Rank.KING,
  ];
}

/**
 * Card source for selected card tracking
 */
export enum CardSource {
  HAND = 'HAND',
  PERSONAL_PILE = 'PERSONAL_PILE',
  STORAGE = 'STORAGE',
}
