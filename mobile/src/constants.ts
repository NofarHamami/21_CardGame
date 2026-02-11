/**
 * Game Constants
 * 
 * Centralized constants for the 21 Card Game to avoid magic numbers throughout the codebase.
 */

// ========== Game Rules ==========
/**
 * Number of decks needed for game setup
 * Calculated as: 5 hand + 21 pile = 26 cards per player
 * Plus cards for stock pile (3 decks = 156 cards total)
 */
export const DECKS_NEEDED = 3;

/**
 * Number of center piles in the game
 */
export const NUM_CENTER_PILES = 4;

/**
 * Minimum number of players
 */
export const MIN_PLAYERS = 2;

/**
 * Maximum number of players
 */
export const MAX_PLAYERS = 4;

// ========== UI Dimensions ==========
/**
 * Screen size breakpoints (in pixels)
 */
export const SCREEN_BREAKPOINTS = {
  SMALL: 375,
  LARGE: 768,
  DESKTOP: 992,
} as const;

/**
 * Card dimensions (in pixels)
 */
export const CARD_DIMENSIONS = {
  WIDTH: 80,
  HEIGHT: 112,
  COMPACT_WIDTH: 56,
  COMPACT_HEIGHT: 80,
} as const;

/**
 * Card spacing and layout constants
 */
export const CARD_LAYOUT = {
  VISIBLE_WIDTH: 50, // Approximate visible width after overlap
  DEFAULT_OVERLAP: -30,
  MIN_OVERLAP: -50,
  MAX_OVERLAP: -15,
  SMALL_SCREEN_OVERLAP: -20,
  LARGE_SCREEN_OVERLAP: -35,
} as const;

/**
 * Reserved space calculations for hand layout
 */
export const HAND_RESERVED_SPACE = {
  SMALL_SCREEN: 180,
  LARGE_SCREEN: 320,
  DEFAULT: 260,
  MIN_WIDTH: 200,
} as const;

/**
 * Arch height multipliers for card hand display
 */
export const ARCH_HEIGHT_MULTIPLIERS = {
  SMALL_SCREEN: 15,
  LARGE_SCREEN: 30,
  DEFAULT: 25,
} as const;

/**
 * Maximum rotation degrees for card hand display
 */
export const MAX_ROTATION_DEGREES = {
  SMALL_SCREEN: 10,
  LARGE_SCREEN: 18,
  DEFAULT: 15,
} as const;

/**
 * Avatar sizes (in pixels)
 */
export const AVATAR_SIZES = {
  DEFAULT: 35,
  CURRENT_PLAYER: 40,
} as const;

/**
 * Font sizes
 */
export const FONT_SIZES = {
  CARD_COMPACT: 12,
  CARD_DEFAULT: 14,
  LABEL_SMALL: 9,
  LABEL_DEFAULT: 10,
  LABEL_MEDIUM: 11,
  PLAYER_NAME_SMALL: 12,
  PLAYER_NAME_DEFAULT: 14,
  PLAYER_NAME_CURRENT: 16,
} as const;

/**
 * Spacing and padding values
 */
export const SPACING = {
  CONTAINER_PADDING_SMALL: 8,
  CONTAINER_PADDING_DEFAULT: 12,
  GAP_SMALL: 3,
  GAP_DEFAULT: 5,
  GAP_MEDIUM: 8,
  GAP_LARGE: 12,
  SECTION_MARGIN_SMALL: 8,
  SECTION_MARGIN_DEFAULT: 12,
  SECTION_MARGIN_LARGE: 20,
  MAIN_ROW_GAP_SMALL: 32,
  MAIN_ROW_GAP_DEFAULT: 48,
  MAIN_ROW_GAP_LARGE: 64,
  MAIN_ROW_MARGIN_SMALL: 20,
  MAIN_ROW_MARGIN_DEFAULT: 24,
  MAIN_ROW_MARGIN_LARGE: 32,
} as const;

/**
 * Z-index values for layering
 */
export const Z_INDEX = {
  BASE: 1,
  MIDDLE: 2,
  FRONT: 3,
  HAND_CARD: 1,
  HAND_CARD_SELECTED: 10,
  CARD_ELEVATION: 50,
} as const;

/**
 * Default fallback values
 */
export const DEFAULTS = {
  SCREEN_WIDTH: 800,
  MIN_HAND_HEIGHT: 140,
} as const;
