import {
  Card,
  Player,
  CenterPile,
  Deck,
  CardSource,
  createPlayer,
  setupPlayerCards,
  createCenterPile,
  createMultipleDecks,
  shuffleDeck,
  drawCards,
  addCardsToDeck,
  deckSize,
  isDeckEmpty,
  getHandCard,
  removeFromHand,
  getPersonalPileTop,
  removeFromPersonalPile,
  getStorageTop,
  removeFromStorage,
  addToStorage,
  addCardsToHand,
  isHandEmpty,
  isHandFull,
  cardsNeededToFillHand,
  hasWon,
  canPlaceOnPile,
  placeOnPile,
  isPileComplete,
  collectAndClearPile,
  getExpectedNextRank,
  MAX_HAND_SIZE,
  PERSONAL_PILE_SIZE,
  STORAGE_STACKS,
  getCardValue,
  isCardKing,
} from '../models';
import {
  NUM_CENTER_PILES,
  MIN_PLAYERS,
  MAX_PLAYERS,
  DECKS_NEEDED,
} from '../constants';
import { logger } from '../utils/logger';

/**
 * Game event types
 * 
 * Events track game actions and can trigger UI updates.
 * Each event type has specific data associated with it.
 */
export type GameEvent =
  | { type: 'GAME_STARTED' }
  | { type: 'TURN_CHANGED'; player: Player }
  | { type: 'CARD_PLAYED'; player: Player; card: Card; destination: string; source: CardSource; sourceIndex: number }
  | { type: 'HAND_REFILLED'; player: Player; cardsDrawn: number; cards: Card[]; skipStockAnimation?: boolean }
  | { type: 'PILE_COMPLETED'; pileIndex: number; cardsReturned: number }
  | { type: 'GAME_OVER'; winner: Player }
  | { type: 'INVALID_MOVE'; message: string };

/**
 * Game state
 * 
 * Represents the complete state of the game at any point in time.
 * All state updates are immutable - functions return new state objects.
 */
export interface GameState {
  /** Array of all players in the game */
  players: Player[];
  /** Array of 4 center piles where cards are played */
  centerPiles: CenterPile[];
  /** Stock pile for drawing cards during the game */
  stockPile: Deck;
  /** Index of the current player (0-based) */
  currentPlayerIndex: number;
  /** Whether the game has been started */
  gameStarted: boolean;
  /** Whether the game has ended */
  gameOver: boolean;
  /** The winning player, if the game is over */
  winner: Player | null;
  /** Number of cards played by current player this turn */
  cardsPlayedThisTurn: number;
  /** Whether current player has played to center this turn */
  playedToCenterThisTurn: boolean;
  /** The last game event that occurred */
  lastEvent: GameEvent | null;
  /** AI difficulty level */
  aiDifficulty?: 'easy' | 'medium' | 'hard';
}

/**
 * Create initial game state
 */
export function createInitialState(): GameState {
  const centerPiles: CenterPile[] = [];
  for (let i = 0; i < NUM_CENTER_PILES; i++) {
    centerPiles.push(createCenterPile());
  }

  return {
    players: [],
    centerPiles,
    stockPile: { cards: [] },
    currentPlayerIndex: 0,
    gameStarted: false,
    gameOver: false,
    winner: null,
    cardsPlayedThisTurn: 0,
    playedToCenterThisTurn: false,
    lastEvent: null,
    aiDifficulty: 'medium',
  };
}

/**
 * Player configuration for game setup
 */
export interface PlayerConfig {
  name: string;
  avatar?: string;
  isAI?: boolean;
}

/**
 * Set up a new game with the specified number of players.
 * @param numPlayers Number of players
 * @param playerConfigs Optional array of player configurations (name and avatar). 
 *                     If not provided, default names will be used.
 */
export function setupGame(numPlayers: number, playerConfigs?: PlayerConfig[], aiDifficulty?: 'easy' | 'medium' | 'hard'): GameState {
  if (numPlayers < MIN_PLAYERS || numPlayers > MAX_PLAYERS) {
    throw new Error(`Number of players must be between ${MIN_PLAYERS} and ${MAX_PLAYERS}`);
  }

  // Create center piles
  const centerPiles: CenterPile[] = [];
  for (let i = 0; i < NUM_CENTER_PILES; i++) {
    centerPiles.push(createCenterPile());
  }

  // Create players with custom names/avatars if provided
  const players: Player[] = [];
  for (let i = 0; i < numPlayers; i++) {
    if (playerConfigs && playerConfigs[i]) {
      players.push(createPlayer(playerConfigs[i].name, i + 1, playerConfigs[i].avatar, playerConfigs[i].isAI));
    } else {
      players.push(createPlayer(`Player ${i + 1}`, i + 1));
    }
  }

  // Create and shuffle deck(s)
  // We need: 5 hand + 21 pile = 26 cards per player
  // Plus cards for the stock pile for drawing during the game
  // Use enough decks to ensure sufficient stock pile (3 decks = 156 cards)
  let stockPile = createMultipleDecks(DECKS_NEEDED);
  stockPile = shuffleDeck(stockPile);

  // Deal cards to players
  const updatedPlayers: Player[] = [];
  for (const player of players) {
    const [handCards, deckAfterHand] = drawCards(stockPile, MAX_HAND_SIZE);
    stockPile = deckAfterHand;
    const [pileCards, deckAfterPile] = drawCards(stockPile, PERSONAL_PILE_SIZE);
    stockPile = deckAfterPile;
    updatedPlayers.push(setupPlayerCards(player, handCards, pileCards));
  }

  // Determine starting player: the one with the highest first card in their 21-pile
  // King is a wild card (Joker) so players with King as first card are ignored for starting player determination
  // The first card dealt is at the top of the pile (last index after reversing in setupPlayerCards)
  // Example: If players have top cards 9, 3, 5, 6, the player with 9 starts
  let startingPlayerIndex = 0;
  let highestValue = -1;
  
  logger.debug('Determining starting player...');
  for (let i = 0; i < updatedPlayers.length; i++) {
    const player = updatedPlayers[i];
    // Get the top card (first card that was dealt, which is at the last index after reversing)
    if (player.personalPile.length > 0) {
      const topCard = getPersonalPileTop(player);
      if (topCard === null) continue;
      
      const cardValue = getCardValue(topCard);
      const isKing = isCardKing(topCard);
      logger.debug(`  Player ${i + 1} (${player.name}): top card rank = ${cardValue}, isKing = ${isKing}`);
      
      // Ignore players whose first card is a King (wild/joker) - they don't participate in starting player determination
      if (!isKing) {
        if (cardValue > highestValue) {
          logger.debug(`    -> New highest value: ${cardValue} (was ${highestValue}), setting starting player to ${i + 1}`);
          highestValue = cardValue;
          startingPlayerIndex = i;
        } else {
          logger.debug(`    -> Value ${cardValue} is not higher than current highest ${highestValue}`);
        }
      } else {
        logger.debug(`    -> Skipping (King is wild)`);
      }
    }
  }
  
  // If all players have King as first card (shouldn't happen, but fallback)
  // or if no valid starting player was found, default to first player
  if (highestValue === -1) {
    logger.debug('No valid starting player found (all Kings?), defaulting to player 1');
    startingPlayerIndex = 0;
  } else {
    logger.debug(`Starting player determined: Player ${startingPlayerIndex + 1} (${updatedPlayers[startingPlayerIndex].name}) with card value ${highestValue}`);
  }

  return {
    players: updatedPlayers,
    centerPiles,
    stockPile,
    currentPlayerIndex: startingPlayerIndex,
    gameStarted: true,
    gameOver: false,
    winner: null,
    cardsPlayedThisTurn: 0,
    playedToCenterThisTurn: false,
    lastEvent: { type: 'GAME_STARTED' },
    aiDifficulty: aiDifficulty || 'medium',
  };
}

/**
 * Get current player
 */
export function getCurrentPlayer(state: GameState): Player | null {
  if (state.players.length === 0) return null;
  return state.players[state.currentPlayerIndex];
}

/**
 * Get card from source
 */
function getCardFromSource(
  player: Player,
  source: CardSource,
  index: number
): Card | null {
  switch (source) {
    case CardSource.HAND:
      return getHandCard(player, index);
    case CardSource.PERSONAL_PILE:
      return getPersonalPileTop(player);
    case CardSource.STORAGE:
      return getStorageTop(player, index);
    default:
      return null;
  }
}

/**
 * Remove card from source
 */
function removeCardFromSource(
  player: Player,
  source: CardSource,
  index: number
): [Card | null, Player] {
  switch (source) {
    case CardSource.HAND:
      return removeFromHand(player, index);
    case CardSource.PERSONAL_PILE:
      return removeFromPersonalPile(player);
    case CardSource.STORAGE:
      return removeFromStorage(player, index);
    default:
      return [null, player];
  }
}

/**
 * Update player in state
 */
function updatePlayer(state: GameState, playerIndex: number, player: Player): GameState {
  const newPlayers = [...state.players];
  newPlayers[playerIndex] = player;
  return { ...state, players: newPlayers };
}

/**
 * Update center pile in state
 */
function updateCenterPile(state: GameState, pileIndex: number, pile: CenterPile): GameState {
  const newPiles = [...state.centerPiles];
  newPiles[pileIndex] = pile;
  return { ...state, centerPiles: newPiles };
}

/**
 * Check and refill hand if empty
 */
function checkAndRefillHand(state: GameState, playerIndex: number): GameState {
  let player = state.players[playerIndex];
  let stockPile = state.stockPile;

  if (isHandEmpty(player) && !isDeckEmpty(stockPile)) {
    const cardsToDraw = Math.min(MAX_HAND_SIZE, deckSize(stockPile));
    const [drawnCards, newDeck] = drawCards(stockPile, cardsToDraw);
    player = addCardsToHand(player, drawnCards);
    stockPile = newDeck;

    let newState = updatePlayer(state, playerIndex, player);
    newState = { ...newState, stockPile };
    newState = { ...newState, lastEvent: { type: 'HAND_REFILLED', player, cardsDrawn: drawnCards.length, cards: drawnCards } };
    return newState;
  }

  return state;
}

/**
 * Refill current player's hand to 5 cards
 */
function refillCurrentPlayerHand(state: GameState): GameState {
  let player = state.players[state.currentPlayerIndex];
  let stockPile = state.stockPile;

  const neededCards = cardsNeededToFillHand(player);
  if (neededCards > 0 && !isDeckEmpty(stockPile)) {
    const cardsToDraw = Math.min(neededCards, deckSize(stockPile));
    const [drawnCards, newDeck] = drawCards(stockPile, cardsToDraw);
    if (drawnCards.length > 0) {
      player = addCardsToHand(player, drawnCards);
      stockPile = newDeck;

      let newState = updatePlayer(state, state.currentPlayerIndex, player);
      newState = { ...newState, stockPile };
      newState = { ...newState, lastEvent: { type: 'HAND_REFILLED', player, cardsDrawn: drawnCards.length, cards: drawnCards } };
      return newState;
    }
  }

  return state;
}

/**
 * Draw cards from stock for a specific player to fill hand to 5 cards (for delayed drawing)
 */
export function drawCardFromStockDelayed(state: GameState, playerIndex: number): GameState {
  if (playerIndex < 0 || playerIndex >= state.players.length) {
    return state;
  }

  let player = state.players[playerIndex];
  let stockPile = state.stockPile;

  // Calculate how many cards are needed to fill hand to 5
  const neededCards = cardsNeededToFillHand(player);
  if (neededCards > 0 && !isDeckEmpty(stockPile)) {
    const cardsToDraw = Math.min(neededCards, deckSize(stockPile));
    const [drawnCards, newDeck] = drawCards(stockPile, cardsToDraw);
    if (drawnCards.length > 0) {
      player = addCardsToHand(player, drawnCards);
      stockPile = newDeck;

      let newState = updatePlayer(state, playerIndex, player);
      newState = { ...newState, stockPile };
      newState = { ...newState, lastEvent: { type: 'HAND_REFILLED', player, cardsDrawn: drawnCards.length, cards: drawnCards } };
      return newState;
    }
  }

  return state;
}

/**
 * Get the next player index in clockwise order around the board (as seen on screen).
 * 
 * 4-player positions: Index 0 = Bottom, Index 1 = Top, Index 2 = Left, Index 3 = Right
 * Clockwise: Right(3) → Bottom(0) → Left(2) → Top(1) → Right(3)
 * 
 * 3-player positions: Index 0 = Bottom, Index 1 = Top, Index 2 = Right
 * Clockwise: Top(1) → Right(2) → Bottom(0) → Top(1)
 */
function getNextPlayerIndexClockwise(currentIndex: number, numPlayers: number): number {
  if (numPlayers === 2) {
    return currentIndex === 0 ? 1 : 0;
  } else if (numPlayers === 3) {
    // Top (1) → Right (2) → Bottom (0) → Top (1)
    const map: Record<number, number> = { 0: 1, 1: 2, 2: 0 };
    return map[currentIndex] ?? 0;
  } else {
    // Right (3) → Bottom (0) → Left (2) → Top (1) → Right (3)
    const map: Record<number, number> = { 0: 2, 2: 1, 1: 3, 3: 0 };
    return map[currentIndex] ?? 0;
  }
}

/**
 * Move to next turn (clockwise order)
 */
function nextTurn(state: GameState): GameState {
  const nextPlayerIndex = getNextPlayerIndexClockwise(state.currentPlayerIndex, state.players.length);
  logger.debug('nextTurn: moving from player', state.currentPlayerIndex, 'to', nextPlayerIndex, '(clockwise)');
  
  let newState: GameState = {
    ...state,
    currentPlayerIndex: nextPlayerIndex,
    cardsPlayedThisTurn: 0,
    playedToCenterThisTurn: false,
  };

  // Don't refill hand immediately - delay the card drawing for all players
  // Cards will be drawn after a delay to show existing cards first

  const nextPlayer = newState.players[nextPlayerIndex];
  logger.debug('nextTurn: new current player is', nextPlayer.name);
  newState = { ...newState, lastEvent: { type: 'TURN_CHANGED', player: nextPlayer } };

  return newState;
}

/**
 * End game with winner
 */
function endGame(state: GameState, winner: Player): GameState {
  return {
    ...state,
    gameOver: true,
    winner,
    lastEvent: { type: 'GAME_OVER', winner },
  };
}

/**
 * Play a card to a center pile
 */
export function playToCenter(
  state: GameState,
  source: CardSource,
  sourceIndex: number,
  centerPileIndex: number
): GameState {
  if (!state.gameStarted || state.gameOver) return state;

  const playerIndex = state.currentPlayerIndex;
  let player = state.players[playerIndex];
  logger.debug('playToCenter: Getting card from source:', source, 'index:', sourceIndex, 'player:', player.name);
  const card = getCardFromSource(player, source, sourceIndex);

  if (card === null) {
    logger.debug('playToCenter: Card is null - cannot retrieve card from source');
    return {
      ...state,
      lastEvent: {
        type: 'INVALID_MOVE',
        message: 'No card at that position. Please select a valid card.',
      },
    };
  }
  logger.debug('playToCenter: Retrieved card:', card.rank, 'suit:', card.suit);

  if (centerPileIndex < 0 || centerPileIndex >= NUM_CENTER_PILES) {
    return {
      ...state,
      lastEvent: {
        type: 'INVALID_MOVE',
        message: `Invalid center pile. Please select a pile between 1 and ${NUM_CENTER_PILES}.`,
      },
    };
  }

  let pile = state.centerPiles[centerPileIndex];
  
  // Debug: Check if card is King
  const isKing = isCardKing(card);
  const cardValue = getCardValue(card);
  const topCard = pile.cards.length > 0 ? pile.cards[pile.cards.length - 1] : null;
  logger.debug('playToCenter: card check - rank:', cardValue, 'isKing:', isKing, 'pile index:', centerPileIndex, 'pile cards:', pile.cards.length, 'pile expected:', pile.expectedNextValue, 'topCard:', topCard ? `${topCard.rank}` : 'none');
  
  if (!canPlaceOnPile(pile, card)) {
    const expectedRank = getExpectedNextRank(pile);
    const topCard = pile.cards.length > 0 ? pile.cards[pile.cards.length - 1] : null;
    const topCardInfo = topCard ? (isCardKing(topCard) ? 'King (acting as wild)' : `${getCardValue(topCard)}`) : 'empty';
    logger.debug('playToCenter: CANNOT place card - isKing:', isKing, 'cardValue:', cardValue, 'pile expected:', pile.expectedNextValue, 'topCard:', topCardInfo, 'canPlaceOnPile returned false');
    return {
      ...state,
      lastEvent: {
        type: 'INVALID_MOVE',
        message: `Cannot place ${isKing ? 'King' : cardValue} on pile ${centerPileIndex + 1}. This pile needs a ${expectedRank}${topCard ? ` (top card is ${topCardInfo})` : ''}.`,
      },
    };
  }
  
  logger.debug('playToCenter: CAN place card - proceeding');

  // Remove card from source
  const [, updatedPlayer] = removeCardFromSource(player, source, sourceIndex);
  player = updatedPlayer;

  // Place on center pile
  const [success, updatedPile] = placeOnPile(pile, card);
  if (!success) {
    logger.error('playToCenter: placeOnPile failed unexpectedly after canPlaceOnPile passed');
    return {
      ...state,
      lastEvent: {
        type: 'INVALID_MOVE',
        message: 'Failed to place card on pile. Please try again.',
      },
    };
  }
  pile = updatedPile;
  logger.debug('playToCenter: after placeOnPile - pile expectedNextValue:', pile.expectedNextValue, 'cards:', pile.cards.length);

  // Update state
  let newState = updatePlayer(state, playerIndex, player);
  newState = updateCenterPile(newState, centerPileIndex, pile);
  logger.debug('playToCenter: after updateCenterPile - newState pile expectedNextValue:', newState.centerPiles[centerPileIndex].expectedNextValue);
  const newCardsPlayed = newState.cardsPlayedThisTurn + 1;
  logger.debug('playToCenter: incrementing cardsPlayedThisTurn from', newState.cardsPlayedThisTurn, 'to', newCardsPlayed);
  newState = {
    ...newState,
    cardsPlayedThisTurn: newCardsPlayed,
    playedToCenterThisTurn: true,
    lastEvent: { type: 'CARD_PLAYED', player, card, destination: `Center Pile ${centerPileIndex + 1}`, source, sourceIndex },
  };

  // Check if pile is complete (reached Queen) - return cards to stock and shuffle
  if (isPileComplete(pile)) {
    const [completedCards, clearedPile] = collectAndClearPile(pile);
    let stockPile = addCardsToDeck(newState.stockPile, completedCards);
    stockPile = shuffleDeck(stockPile);
    newState = updateCenterPile(newState, centerPileIndex, clearedPile);
    newState = {
      ...newState,
      stockPile,
      lastEvent: { type: 'PILE_COMPLETED', pileIndex: centerPileIndex, cardsReturned: completedCards.length },
    };
  }

  // Check for win condition
  player = newState.players[playerIndex];
  if (hasWon(player)) {
    return endGame(newState, player);
  }

  // Check if hand is empty - refill and continue
  // Hand only refills when completely empty, not after each card play
  newState = checkAndRefillHand(newState, playerIndex);

  return newState;
}

/**
 * Play a card to storage (ends turn)
 */
export function playToStorage(
  state: GameState,
  source: CardSource,
  sourceIndex: number,
  storageIndex: number
): GameState {
  if (!state.gameStarted) {
    return {
      ...state,
      lastEvent: {
        type: 'INVALID_MOVE',
        message: 'Game has not started. Please start a new game.',
      },
    };
  }

  if (state.gameOver) {
    return {
      ...state,
      lastEvent: {
        type: 'INVALID_MOVE',
        message: 'Game is over. Please start a new game to continue playing.',
      },
    };
  }

  const playerIndex = state.currentPlayerIndex;
  let player = state.players[playerIndex];

  // Cannot play to storage if you've already played to a center pile this turn
  // EXCEPTION: If you have 5 cards in hand, you MUST be able to play to storage
  if (state.playedToCenterThisTurn && !isHandFull(player)) {
    return {
      ...state,
      lastEvent: {
        type: 'INVALID_MOVE',
        message: 'Cannot play to storage after playing to center piles. End your turn or continue playing to center piles.',
      },
    };
  }

  // Can only play from HAND to storage
  if (source === CardSource.STORAGE) {
    return {
      ...state,
      lastEvent: {
        type: 'INVALID_MOVE',
        message: 'Cannot move cards between storage stacks. Play cards from storage to center piles instead.',
      },
    };
  }

  if (source === CardSource.PERSONAL_PILE) {
    return {
      ...state,
      lastEvent: {
        type: 'INVALID_MOVE',
        message: 'Cards from your 21-pile can only be played to center piles, not storage.',
      },
    };
  }

  const card = getCardFromSource(player, source, sourceIndex);

  if (card === null) {
    return {
      ...state,
      lastEvent: {
        type: 'INVALID_MOVE',
        message: 'No card at that position. Please select a valid card.',
      },
    };
  }

  if (storageIndex < 0 || storageIndex >= STORAGE_STACKS) {
    return {
      ...state,
      lastEvent: {
        type: 'INVALID_MOVE',
        message: `Invalid storage stack. Please select a storage slot between 1 and ${STORAGE_STACKS}.`,
      },
    };
  }

  // Remove card from source
  const [, updatedPlayer] = removeCardFromSource(player, source, sourceIndex);
  player = updatedPlayer;

  // Place in storage
  player = addToStorage(player, storageIndex, card);

  // Update state
  let newState = updatePlayer(state, playerIndex, player);
  newState = {
    ...newState,
    cardsPlayedThisTurn: newState.cardsPlayedThisTurn + 1,
    lastEvent: { type: 'CARD_PLAYED', player, card, destination: `Storage ${storageIndex + 1}`, source, sourceIndex },
  };

  // Check for win condition (unlikely from storage, but check anyway)
  if (hasWon(player)) {
    return endGame(newState, player);
  }

  // Playing to storage ends the turn immediately
  logger.debug('playToStorage: calling nextTurn, current index:', newState.currentPlayerIndex, 'players count:', newState.players.length);
  const result = nextTurn(newState);
  logger.debug('playToStorage: nextTurn returned, new index:', result.currentPlayerIndex, 'new player:', result.players[result.currentPlayerIndex]?.name);
  return result;
}

/**
 * End the current player's turn
 */
export function endTurn(state: GameState): GameState {
  if (!state.gameStarted || state.gameOver) {
    logger.debug('endTurn: game not started or game over');
    return state;
  }

  const player = state.players[state.currentPlayerIndex];
  logger.debug('endTurn: player', player.name, 'cardsPlayedThisTurn:', state.cardsPlayedThisTurn, 'handFull:', isHandFull(player));

  if (state.cardsPlayedThisTurn === 0) {
    return {
      ...state,
      lastEvent: {
        type: 'INVALID_MOVE',
        message: 'You must play at least 1 card before ending your turn.',
      },
    };
  }

  if (isHandFull(player)) {
    return {
      ...state,
      lastEvent: {
        type: 'INVALID_MOVE',
        message: 'You cannot end your turn with 5 cards in hand. Play or store a card first.',
      },
    };
  }

  logger.debug('endTurn: calling nextTurn, current index:', state.currentPlayerIndex);
  return nextTurn(state);
}

/**
 * Check if the current player can end their turn
 */
export function canEndTurn(state: GameState): boolean {
  if (!state.gameStarted || state.gameOver) return false;
  const player = state.players[state.currentPlayerIndex];
  return state.cardsPlayedThisTurn > 0 && !isHandFull(player);
}

/**
 * Force end the turn when the timer expires and the player hasn't made a valid move.
 * Automatically moves the first hand card to the best available storage slot,
 * which ends the turn via nextTurn. Falls back to a plain turn advance if the
 * player has no hand cards.
 */
export function forceEndTurnOnTimeout(state: GameState): GameState {
  if (!state.gameStarted || state.gameOver) return state;

  if (canEndTurn(state)) {
    return endTurn(state);
  }

  const player = state.players[state.currentPlayerIndex];

  if (player.hand.length > 0) {
    let storageIndex = 0;
    for (let i = 0; i < STORAGE_STACKS; i++) {
      if (player.storage[i].length === 0) {
        storageIndex = i;
        break;
      }
    }

    const result = playToStorage(state, CardSource.HAND, 0, storageIndex);
    if (result.lastEvent?.type !== 'INVALID_MOVE') {
      return result;
    }
  }

  return nextTurn(state);
}

/**
 * Get the stock pile size
 */
export function getStockPileSize(state: GameState): number {
  return deckSize(state.stockPile);
}

/**
 * Update player name and avatar
 */
export function updatePlayerNameAndAvatar(
  state: GameState,
  playerIndex: number,
  name: string,
  avatar?: string
): GameState {
  if (playerIndex < 0 || playerIndex >= state.players.length) {
    return state;
  }
  
  const player = state.players[playerIndex];
  const updatedPlayer: Player = {
    ...player,
    name,
    avatar,
  };
  
  return updatePlayer(state, playerIndex, updatedPlayer);
}
