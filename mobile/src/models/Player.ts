import { Card } from './Card';

/**
 * Player constants
 */
export const MAX_HAND_SIZE = 5;
export const PERSONAL_PILE_SIZE = 21;
export const STORAGE_STACKS = 5;

/**
 * Represents a player in the 21 card game.
 * Each player has:
 * - A hand of up to 5 cards
 * - A personal 21-card pile (goal is to empty this)
 * - 5 storage stacks (LIFO - only top card accessible)
 */
export interface Player {
  readonly name: string;
  readonly playerNumber: number;
  readonly avatar?: string; // Emoji avatar for the player
  hand: Card[];
  personalPile: Card[]; // Array used as stack (end = top)
  storage: Card[][]; // 5 storage stacks
}

/**
 * Create a new player
 */
export function createPlayer(name: string, playerNumber: number, avatar?: string): Player {
  const storage: Card[][] = [];
  for (let i = 0; i < STORAGE_STACKS; i++) {
    storage.push([]);
  }
  return {
    name,
    playerNumber,
    avatar,
    hand: [],
    personalPile: [],
    storage,
  };
}

/**
 * Set up the player's initial cards.
 * @param player The player to set up
 * @param handCards 5 cards for the hand
 * @param pileCards 21 cards for the personal pile
 */
export function setupPlayerCards(
  player: Player,
  handCards: Card[],
  pileCards: Card[]
): Player {
  // Add cards in reverse so the first card in the list is on top
  const reversedPile = [...pileCards].reverse();
  return {
    ...player,
    hand: [...handCards],
    personalPile: reversedPile,
  };
}

// ============ Hand Methods ============

export function getHand(player: Player): Card[] {
  return [...player.hand];
}

export function getHandSize(player: Player): number {
  return player.hand.length;
}

export function getHandCard(player: Player, index: number): Card | null {
  if (index >= 0 && index < player.hand.length) {
    return player.hand[index];
  }
  return null;
}

export function removeFromHand(player: Player, index: number): [Card | null, Player] {
  if (index >= 0 && index < player.hand.length) {
    const newHand = [...player.hand];
    const card = newHand.splice(index, 1)[0];
    return [card, { ...player, hand: newHand }];
  }
  return [null, player];
}

export function removeCardFromHand(player: Player, card: Card): [Card | null, Player] {
  const index = player.hand.findIndex(c => c.id === card.id);
  if (index !== -1) {
    return removeFromHand(player, index);
  }
  return [null, player];
}

export function addToHand(player: Player, card: Card): Player {
  return { ...player, hand: [...player.hand, card] };
}

export function addCardsToHand(player: Player, cards: Card[]): Player {
  return { ...player, hand: [...player.hand, ...cards] };
}

export function isHandEmpty(player: Player): boolean {
  return player.hand.length === 0;
}

export function isHandFull(player: Player): boolean {
  return player.hand.length >= MAX_HAND_SIZE;
}

export function cardsNeededToFillHand(player: Player): number {
  return Math.max(0, MAX_HAND_SIZE - player.hand.length);
}

// ============ Personal 21-Pile Methods ============

export function getPersonalPileTop(player: Player): Card | null {
  if (player.personalPile.length === 0) {
    return null;
  }
  return player.personalPile[player.personalPile.length - 1];
}

export function removeFromPersonalPile(player: Player): [Card | null, Player] {
  if (player.personalPile.length === 0) {
    return [null, player];
  }
  const newPile = [...player.personalPile];
  const card = newPile.pop()!;
  return [card, { ...player, personalPile: newPile }];
}

export function getPersonalPileSize(player: Player): number {
  return player.personalPile.length;
}

export function isPersonalPileEmpty(player: Player): boolean {
  return player.personalPile.length === 0;
}

/**
 * Returns true if this player has won (personal 21-pile is empty)
 */
export function hasWon(player: Player): boolean {
  return player.personalPile.length === 0;
}

// ============ Storage Methods ============

export function getStorageStack(player: Player, index: number): Card[] {
  if (index >= 0 && index < STORAGE_STACKS) {
    return [...player.storage[index]];
  }
  return [];
}

export function getStorageTop(player: Player, stackIndex: number): Card | null {
  if (stackIndex >= 0 && stackIndex < STORAGE_STACKS) {
    const stack = player.storage[stackIndex];
    if (stack.length > 0) {
      return stack[stack.length - 1];
    }
  }
  return null;
}

export function removeFromStorage(player: Player, stackIndex: number): [Card | null, Player] {
  if (stackIndex >= 0 && stackIndex < STORAGE_STACKS) {
    const stack = player.storage[stackIndex];
    if (stack.length > 0) {
      const newStorage = player.storage.map((s, i) => 
        i === stackIndex ? s.slice(0, -1) : [...s]
      );
      const card = stack[stack.length - 1];
      return [card, { ...player, storage: newStorage }];
    }
  }
  return [null, player];
}

export function addToStorage(player: Player, stackIndex: number, card: Card): Player {
  if (stackIndex >= 0 && stackIndex < STORAGE_STACKS) {
    const newStorage = player.storage.map((s, i) => 
      i === stackIndex ? [...s, card] : [...s]
    );
    return { ...player, storage: newStorage };
  }
  return player;
}

export function isStorageStackEmpty(player: Player, stackIndex: number): boolean {
  if (stackIndex >= 0 && stackIndex < STORAGE_STACKS) {
    return player.storage[stackIndex].length === 0;
  }
  return true;
}

export function getStorageStackSize(player: Player, stackIndex: number): number {
  if (stackIndex >= 0 && stackIndex < STORAGE_STACKS) {
    return player.storage[stackIndex].length;
  }
  return 0;
}

/**
 * Returns the total number of cards in all storage stacks
 */
export function getTotalStorageCards(player: Player): number {
  return player.storage.reduce((total, stack) => total + stack.length, 0);
}

/**
 * Reset player for a new game
 */
export function resetPlayer(player: Player): Player {
  const storage: Card[][] = [];
  for (let i = 0; i < STORAGE_STACKS; i++) {
    storage.push([]);
  }
  return {
    ...player,
    hand: [],
    personalPile: [],
    storage,
  };
}

/**
 * Get a string representation of the player
 */
export function playerToString(player: Player): string {
  return `${player.name} (Hand: ${player.hand.length}, Pile: ${player.personalPile.length}, Storage: ${getTotalStorageCards(player)})`;
}
