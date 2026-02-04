# 21 Card Game (משחק קלפים 21)

A Java Swing implementation of the 21 card game.

## Requirements

- Java 11 or higher

## How to Compile

Run the compile script:
```
compile.bat
```

Or manually:
```
javac -d out -sourcepath src src/Main.java src/model/*.java src/engine/*.java src/gui/*.java
```

## How to Run

Run the run script:
```
run.bat
```

Or manually:
```
java -cp out Main
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
1. Click a card to select it (hand, 21-pile top, or storage top)
2. Click a center pile to play the selected card there
3. Click a storage stack to place the selected card there (ends turn)
4. Click "End Turn" button when done (only available after playing at least 1 card)

## Project Structure

```
src/
├── Main.java                 # Entry point
├── model/
│   ├── Card.java            # Playing card
│   ├── Suit.java            # Card suits enum
│   ├── Rank.java            # Card ranks enum
│   ├── Deck.java            # Deck of cards
│   ├── Player.java          # Player state
│   └── CenterPile.java      # Center pile logic
├── engine/
│   └── GameEngine.java      # Game logic
└── gui/
    ├── CardPanel.java       # Card rendering
    ├── PlayerPanel.java     # Player area UI
    ├── CenterPanel.java     # Center piles UI
    ├── GameController.java  # UI-Engine connection
    └── GameWindow.java      # Main window
```
