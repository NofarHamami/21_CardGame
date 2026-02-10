/**
 * Error types for the game
 */

export enum ErrorType {
  INVALID_MOVE = 'INVALID_MOVE',
  GAME_STATE_ERROR = 'GAME_STATE_ERROR',
  CARD_NOT_FOUND = 'CARD_NOT_FOUND',
  INVALID_PLAYER = 'INVALID_PLAYER',
  INVALID_PILE = 'INVALID_PILE',
  INVALID_STORAGE = 'INVALID_STORAGE',
  HAND_FULL = 'HAND_FULL',
  HAND_EMPTY = 'HAND_EMPTY',
  STOCK_EMPTY = 'STOCK_EMPTY',
  GAME_NOT_STARTED = 'GAME_NOT_STARTED',
  GAME_OVER = 'GAME_OVER',
}

export interface GameError {
  type: ErrorType;
  message: string;
  userMessage: string; // User-friendly message
  actionable?: string; // Actionable guidance for the user
  recoverable?: boolean;
}

/**
 * Create a user-friendly error message
 */
export function createGameError(
  type: ErrorType,
  message: string,
  userMessage?: string,
  actionable?: string,
  recoverable: boolean = true
): GameError {
  return {
    type,
    message,
    userMessage: userMessage || message,
    actionable,
    recoverable,
  };
}

/**
 * Error messages map for common scenarios
 */
export const ErrorMessages = {
  INVALID_MOVE: {
    NO_CARD: {
      userMessage: 'No card selected',
      actionable: 'Please select a card first',
    },
    INVALID_PLACEMENT: {
      userMessage: 'Cannot place this card here',
      actionable: 'Check the card sequence rules',
    },
    WRONG_TURN: {
      userMessage: "It's not your turn",
      actionable: 'Wait for your turn to play',
    },
  },
  GAME_STATE: {
    NOT_STARTED: {
      userMessage: 'Game has not started',
      actionable: 'Start a new game to begin playing',
    },
    ALREADY_OVER: {
      userMessage: 'Game is already over',
      actionable: 'Start a new game to play again',
    },
  },
  HAND: {
    FULL: {
      userMessage: 'Your hand is full',
      actionable: 'Play or store a card before drawing more',
    },
    EMPTY: {
      userMessage: 'Your hand is empty',
      actionable: 'Cards will be drawn automatically at the start of your turn',
    },
  },
  STORAGE: {
    INVALID_INDEX: {
      userMessage: 'Invalid storage location',
      actionable: 'Select a valid storage slot (1-5)',
    },
    CANNOT_MOVE_BETWEEN: {
      userMessage: 'Cannot move cards between storage stacks',
      actionable: 'Play cards from storage to center piles instead',
    },
    AFTER_CENTER_PLAY: {
      userMessage: 'Cannot play to storage after playing to center',
      actionable: 'End your turn or continue playing to center piles',
    },
  },
  PILE: {
    INVALID_INDEX: {
      userMessage: 'Invalid center pile',
      actionable: 'Select a valid center pile (1-4)',
    },
    COMPLETE: {
      userMessage: 'This pile is complete',
      actionable: 'Select a different pile or start a new one',
    },
    NEEDS_ACE: {
      userMessage: 'Pile needs an Ace to start',
      actionable: 'Play an Ace card to start this pile',
    },
  },
};

/**
 * Format error for display to user
 */
export function formatErrorForUser(error: GameError): string {
  if (error.actionable) {
    return `${error.userMessage}. ${error.actionable}`;
  }
  return error.userMessage;
}
