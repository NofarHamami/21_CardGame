# Architecture Documentation

## Overview

This document describes the architecture of the 21 Card Game mobile application built with React Native and TypeScript.

## Project Structure

```
mobile/
├── src/
│   ├── components/          # React components
│   │   ├── CardView.tsx     # Card rendering component
│   │   ├── PlayerArea.tsx   # Main player area wrapper
│   │   ├── PlayerAreaHorizontal.tsx  # Horizontal layout (top/bottom)
│   │   ├── PlayerAreaVertical.tsx    # Vertical layout (left/right)
│   │   ├── HandView.tsx     # Hand card display with arch layout
│   │   ├── StorageView.tsx   # Storage stacks display
│   │   ├── CenterArea.tsx   # Center piles and stock
│   │   ├── GameBoard.tsx    # Main game board layout
│   │   ├── ErrorBoundary.tsx # Error boundary component
│   │   └── ErrorToast.tsx   # Error notification component
│   ├── engine/              # Game logic engine
│   │   ├── GameEngine.ts    # Core game state management
│   │   └── __tests__/       # Engine tests
│   ├── models/              # Data models
│   │   ├── Card.ts          # Card model and utilities
│   │   ├── CenterPile.ts    # Center pile model
│   │   ├── Deck.ts          # Deck model
│   │   ├── Player.ts        # Player model
│   │   ├── types.ts         # Type definitions
│   │   └── __tests__/       # Model tests
│   ├── hooks/               # React hooks
│   │   └── useGameEngine.ts # Game engine hook
│   ├── screens/             # Screen components
│   │   ├── HomeScreen.tsx   # Home/start screen
│   │   └── GameScreen.tsx   # Game screen
│   ├── theme/               # Theming
│   │   └── colors.ts        # Color definitions
│   ├── utils/               # Utilities
│   │   └── errors.ts        # Error types and utilities
│   └── constants.ts         # Game constants
├── .github/workflows/       # CI/CD workflows
├── jest.config.js          # Jest configuration
├── .eslintrc.js            # ESLint configuration
├── .prettierrc             # Prettier configuration
└── package.json            # Dependencies and scripts
```

## Architecture Patterns

### 1. State Management

The application uses a **functional state management** approach:

- **GameEngine**: Pure functions that take state and return new state (immutable updates)
- **useGameEngine Hook**: React hook that wraps the engine and provides reactive state
- **Event-driven**: Game events are tracked in state and can trigger UI updates

#### State Flow

```
User Action → Hook Method → Engine Function → New State → UI Update
```

### 2. Component Architecture

#### Component Hierarchy

```
App
└── Navigation
    ├── HomeScreen
    └── GameScreen
        └── GameBoard
            ├── CenterArea
            │   └── CardView (multiple)
            ├── PlayerArea (multiple)
            │   ├── PlayerAreaHorizontal / PlayerAreaVertical
            │   │   ├── HandView
            │   │   │   └── CardView (multiple)
            │   │   ├── StorageView
            │   │   │   └── CardView (multiple)
            │   │   └── CardView (21-pile)
            └── ErrorToast
```

#### Component Responsibilities

- **GameBoard**: Orchestrates layout, manages player positions, handles game over modal
- **PlayerArea**: Delegates to horizontal/vertical layouts based on position
- **PlayerAreaHorizontal/Vertical**: Render player-specific layouts
- **HandView**: Displays cards in arch layout with responsive spacing
- **StorageView**: Displays storage stacks
- **CenterArea**: Displays center piles and stock deck
- **CardView**: Renders individual cards (face up/down, selected states)

### 3. Game State Management

#### GameState Structure

```typescript
interface GameState {
  players: Player[];
  centerPiles: CenterPile[];
  stockPile: Deck;
  currentPlayerIndex: number;
  gameStarted: boolean;
  gameOver: boolean;
  winner: Player | null;
  cardsPlayedThisTurn: number;
  playedToCenterThisTurn: boolean;
  lastEvent: GameEvent | null;
}
```

#### Game Events

Events track game actions and can trigger UI updates:

- `GAME_STARTED`
- `TURN_CHANGED`
- `CARD_PLAYED`
- `HAND_REFILLED`
- `PILE_COMPLETED`
- `GAME_OVER`
- `INVALID_MOVE`

### 4. Data Models

#### Card Model

- Immutable card representation with unique ID
- Utilities for card comparison, value calculation
- King acts as wild card

#### Player Model

- Hand: Array of up to 5 cards
- Personal Pile: Stack of 21 cards (goal: empty it)
- Storage: 5 LIFO stacks

#### CenterPile Model

- Tracks cards and expected next value
- Handles King wild card logic
- Completes when Queen is reached

### 5. Responsive Design

#### Breakpoints

- Small: < 375px (iPhone SE, small phones)
- Default: 375px - 767px
- Large: >= 768px (Tablets)

#### Responsive Strategies

- Dynamic style calculation based on screen width
- Card overlap and arch height adjust for screen size
- Font sizes and spacing scale with breakpoints
- Constants centralized in `constants.ts`

### 6. Error Handling

#### Error Types

- `INVALID_MOVE`: User action validation errors
- `GAME_STATE_ERROR`: Invalid game state operations
- `CARD_NOT_FOUND`: Card access errors
- And more...

#### Error Display

- **ErrorToast**: Animated toast notifications for user feedback
- **ErrorBoundary**: Catches React component errors
- **User-friendly messages**: Clear, actionable error messages

### 7. Testing Strategy

#### Unit Tests

- **Models**: Card, CenterPile, Player, Deck
- **Engine**: Game setup, card placement, turn management, win conditions
- **Edge cases**: Empty stock, invalid moves, boundary conditions

#### Test Coverage Goals

- Game logic: 80%
- UI components: 60%

### 8. Accessibility

#### Features

- `accessibilityLabel`: Descriptive labels for all interactive elements
- `accessibilityHint`: Guidance for user actions
- `accessibilityRole`: Semantic roles (button, text, group, etc.)
- `accessibilityState`: State information (disabled, selected)
- Touch targets: Minimum 44x44 points

### 9. Performance Optimizations

#### React Optimizations

- `React.memo` for expensive components
- `useMemo` for expensive calculations
- `useCallback` for stable function references
- Memoized styles based on screen size

#### State Updates

- Immutable state updates prevent unnecessary re-renders
- Event-driven updates minimize state changes

## Data Flow

### Game Setup Flow

```
HomeScreen → startGame(numPlayers)
  → setupGame(numPlayers)
    → Create players
    → Create decks
    → Deal cards
    → Determine starting player
    → Return GameState
  → Update hook state
  → Navigate to GameScreen
```

### Card Play Flow

```
User selects card
  → selectCard(card, source, index)
    → Update selectedCard state
    
User taps destination
  → playSelectedToCenter(pileIndex) / playSelectedToStorage(index)
    → playToCenter/playToStorage(state, ...)
      → Validate move
      → Update state
      → Check win condition
      → Refill hand if needed
      → Return new state
    → Update hook state
    → Clear selection
    → UI updates
```

### Turn Management Flow

```
Player plays cards
  → cardsPlayedThisTurn increments
  → playedToCenterThisTurn set if playing to center
  
Player ends turn
  → endTurn(state)
    → Validate (must play at least 1 card, hand not full)
    → Move to next player
    → Refill hand
    → Reset turn counters
    → Return new state
```

## Constants Management

All magic numbers and configuration values are centralized in `src/constants.ts`:

- Game rules (decks needed, player limits)
- UI dimensions (card sizes, breakpoints)
- Layout constants (spacing, gaps, margins)
- Font sizes
- Z-index values

## Code Quality

### Linting & Formatting

- **ESLint**: TypeScript, React, React Native rules
- **Prettier**: Consistent code formatting
- **EditorConfig**: Editor consistency

### Type Safety

- Strict TypeScript configuration
- Type guards for runtime validation
- Discriminated unions for game events

## CI/CD Pipeline

### Continuous Integration

- Runs on push/PR to main/develop
- Tests on Node.js 18.x and 20.x
- Linting and formatting checks
- Type checking
- Test execution with coverage
- Security audit

### Release Workflow

- Triggered on version tags
- Builds Android and iOS apps
- Creates GitHub releases

## Future Enhancements

### Planned Features

- Save/load game state
- AI opponents
- Sound effects
- Game statistics tracking
- Game replay/history
- Animations for card movements
- Haptic feedback

### Technical Improvements

- State persistence (AsyncStorage)
- Performance profiling
- Bundle size optimization
- Offline support
- Push notifications for multiplayer

## Dependencies

### Core

- **React Native**: Mobile framework
- **Expo**: Development platform
- **TypeScript**: Type safety

### Testing

- **Jest**: Test framework
- **React Native Testing Library**: Component testing

### Development Tools

- **ESLint**: Linting
- **Prettier**: Formatting
- **TypeScript**: Type checking

## Design Decisions

### Why Functional State Management?

- Predictable state updates
- Easy to test
- No side effects in pure functions
- Time-travel debugging possible

### Why Component Decomposition?

- **PlayerArea** split into Horizontal/Vertical for maintainability
- **HandView** extracted for reusability
- **StorageView** extracted for consistency
- Easier to test individual components

### Why Constants File?

- Single source of truth for configuration
- Easy to adjust game rules
- Better maintainability
- No magic numbers in code

## Security Considerations

- Input validation on all user actions
- State validation in engine functions
- Error boundaries prevent crashes
- No sensitive data stored locally (yet)

## Browser/Platform Support

- **iOS**: 13.0+
- **Android**: API level 21+
- **Web**: Modern browsers (Chrome, Firefox, Safari, Edge)
