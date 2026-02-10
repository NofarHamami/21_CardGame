# 21 Card Game - React Native

A mobile card game built with React Native and TypeScript.

## Game Overview

The 21 Card Game is a multiplayer card game where players race to empty their personal 21-card pile by playing cards to shared center piles.

### Rules

1. **Objective**: Be the first player to empty your 21-card pile
2. **Center Piles**: 4 shared piles that must be built in sequence from Ace to Queen
3. **Kings are Wild**: Kings can be played on any pile at any time
4. **Hand**: Each player holds 5 cards, refilled at the start of each turn
5. **Storage**: 5 personal storage stacks where you can store cards you can't play (ends your turn)
6. **Turn Rules**: 
   - Must play at least 1 card per turn
   - Cannot end turn with 5 cards in hand
   - Playing to storage immediately ends your turn

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Expo CLI (optional, for running on device)

### Installation

```bash
cd mobile
npm install
```

### Running the App

```bash
# Start the development server
npm start

# Run on Android
npm run android

# Run on iOS (Mac only)
npm run ios

# Run in web browser
npm run web
```

## Project Structure

```
mobile/
├── src/
│   ├── models/          # Game data models (Card, Deck, Player, etc.)
│   ├── engine/          # Game logic (GameEngine)
│   ├── hooks/           # React hooks (useGameEngine)
│   ├── components/      # UI components
│   │   ├── CardView.tsx
│   │   ├── PlayerArea.tsx
│   │   ├── CenterArea.tsx
│   │   └── GameBoard.tsx
│   └── screens/         # App screens
│       ├── HomeScreen.tsx
│       └── GameScreen.tsx
├── App.tsx              # App entry with navigation
└── package.json
```

## Tech Stack

- **React Native** - Mobile framework
- **TypeScript** - Type safety
- **Expo** - Development tooling
- **React Navigation** - Screen navigation
- **React Native Gesture Handler** - Touch interactions

## How to Play

1. Select the number of players (2-4)
2. Tap "Start Game"
3. On your turn:
   - Tap a card in your hand, 21-pile, or storage to select it
   - Tap a center pile to play the selected card (if valid)
   - Tap a storage slot to store a card from your hand (ends turn)
4. Tap "End Turn" when you've played at least one card
5. First player to empty their 21-pile wins!

## Development

### Type Checking

```bash
npx tsc --noEmit
```

### Building for Production

```bash
# Build for all platforms
npx expo build
```
