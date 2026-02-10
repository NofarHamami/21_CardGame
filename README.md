# 21 Card Game (משחק קלפים 21)

A React Native mobile implementation of the 21 card game.

## Overview

This is a mobile card game built with React Native, TypeScript, and Expo. The game supports 2-4 players and features a responsive UI that adapts to different screen sizes.

## Requirements

- Node.js 18.x or higher
- npm or yarn
- Expo CLI (installed globally or via npx)

## Getting Started

### Installation

1. Navigate to the mobile directory:
```bash
cd mobile
```

2. Install dependencies:
```bash
npm install
```

### Running the App

#### Development

Start the Expo development server:
```bash
npm start
```

Then:
- Press `a` for Android emulator
- Press `i` for iOS simulator
- Press `w` for web browser
- Scan QR code with Expo Go app on your device

#### Platform-Specific

```bash
npm run android    # Android
npm run ios        # iOS
npm run web        # Web
```

### Testing

Run tests:
```bash
npm test
```

Run tests in watch mode:
```bash
npm run test:watch
```

Run tests with coverage:
```bash
npm run test:coverage
```

### Code Quality

Lint code:
```bash
npm run lint
```

Fix linting issues:
```bash
npm run lint:fix
```

Format code:
```bash
npm run format
```

Check formatting:
```bash
npm run format:check
```

## Game Rules

### Setup
- Each player gets 5 cards in hand and 21 cards in their personal pile
- Only the top card of the 21-pile is visible
- There is a shared stock pile for refilling hands

### Goal
- Be the first player to empty your 21-card pile
- Cards in hand or storage do NOT prevent winning

### Center Piles
- 4 piles in the center
- Each pile must start with an Ace (A)
- Cards are played in sequence: A, 2, 3, 4, 5, 6, 7, 8, 9, 10, J, Q
- King is WILD and can replace any card in the sequence

### Your Turn
1. At the start of your turn, refill your hand to 5 cards from the stock pile
2. You MUST play at least 1 card before ending your turn
3. You can play cards from: Hand, 21-pile top, or Storage tops
4. Play to Center piles (continue your turn) or Storage (ends your turn)
5. If your hand becomes empty during your turn, draw 5 more cards and continue

### Storage
- Each player has 5 storage stacks
- Cards are stacked (LIFO) - can only use the top card of each stack
- Playing a card to storage immediately ends your turn

### How to Play (Controls)
1. Tap a card to select it (hand, 21-pile top, or storage top)
2. Tap a center pile to play the selected card there
3. Tap a storage stack to place the selected card there (ends turn)
4. Tap "End Turn" button when done (only available after playing at least 1 card)

## Project Structure

```
mobile/
├── src/
│   ├── components/          # React components
│   ├── engine/              # Game logic engine
│   ├── models/              # Data models
│   ├── hooks/               # React hooks
│   ├── screens/             # Screen components
│   ├── theme/               # Theming
│   ├── utils/               # Utilities
│   └── constants.ts         # Game constants
├── .github/workflows/       # CI/CD workflows
├── jest.config.js          # Jest configuration
├── .eslintrc.js            # ESLint configuration
├── .prettierrc             # Prettier configuration
└── package.json            # Dependencies and scripts
```

For detailed architecture documentation, see [ARCHITECTURE.md](mobile/ARCHITECTURE.md).

## Features

- ✅ Responsive design for phones and tablets
- ✅ Support for 2-4 players
- ✅ Touch-friendly interface
- ✅ Accessibility features (screen reader support)
- ✅ Error handling with user-friendly messages
- ✅ Comprehensive test coverage
- ✅ TypeScript for type safety
- ✅ ESLint and Prettier for code quality

## Development

### Adding New Features

1. Create feature branch from `main`
2. Make changes following the code style guidelines
3. Write tests for new functionality
4. Ensure all tests pass and linting is clean
5. Submit pull request

### Code Style

- Use TypeScript for all new code
- Follow ESLint rules (run `npm run lint`)
- Format code with Prettier (run `npm run format`)
- Write tests for game logic
- Add JSDoc comments for public APIs

## CI/CD

The project uses GitHub Actions for continuous integration:

- **CI Workflow**: Runs on every push/PR
  - Linting and formatting checks
  - Type checking
  - Test execution
  - Security audit

- **Release Workflow**: Builds and releases mobile apps

## License

[Add your license here]

## Contributing

[Add contributing guidelines here]
