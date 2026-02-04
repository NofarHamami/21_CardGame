# 21 Card Game - Implementation Plan

## Current Status: Core Gameplay Complete with Visual Improvements

---

## Implemented Features

### Game Setup
- [x] 2-4 player support
- [x] Uses 3 decks (156 cards) to ensure sufficient stock pile for hand refills
- [x] Each player starts with:
  - 5 cards in hand
  - 21 cards in personal pile (goal: empty this pile to win)
  - 5 empty storage stacks

### Card Mechanics
- [x] **Card Values**: Ace (1) through Queen (12), King is wild
- [x] **Suits**: Hearts, Diamonds, Clubs, Spades with proper symbols and colors

### Center Piles (4 piles)
- [x] Must start with Ace (or King as wild)
- [x] Cards placed in ascending order (A, 2, 3... Q)
- [x] King can be played as wild card at any position
- [x] **Pile Completion**: When a pile reaches Queen, all cards are returned to stock pile and shuffled back in
- [x] Completed pile becomes empty and ready for new Ace

### Player Actions
- [x] Play cards from hand to center piles
- [x] Play cards from personal 21-pile to center piles (21-pile cards can ONLY go to center, not storage)
- [x] Play cards from storage to center piles
- [x] Play cards from hand to storage (ends turn immediately)
- [x] Must play at least 1 card per turn

### Game Rules (Turn Management)
- [x] Turn indicator shows current player
- [x] Hand refill at start of each turn (draw cards to fill hand back to 5)
- [x] Hand refill when hand becomes empty during turn (mid-turn refill)
- [x] Turn ends when playing to storage
- [x] **Cannot end turn with 5 cards in hand** - must play or store at least one hand card
- [x] **21-pile restriction**: Cards from 21-pile can ONLY go to center piles, not to storage
- [x] **Center-to-storage restriction**: Once you play to a center pile, you cannot play to storage (must continue playing to center or end turn)
  - **Exception**: If you have 5 cards in hand, you CAN play to storage (to avoid deadlock)

### Win Condition
- [x] First player to empty their 21-pile wins
- [x] Win dialog displayed

### GUI Components
- [x] Main game window with menu bar
- [x] **Player avatars** with unique appearances for each player
- [x] **Player names** displayed ("You" for human player, "Player 2/3/4" for others)
- [x] Player panels showing:
  - Personal 21-pile (large card, top card face-up)
  - Hand cards (fan display, overlapping)
  - Storage stacks (5 stacks, top card visible)
- [x] **Side player layout** (left/right positions):
  - 21-pile at top
  - Storage cards vertical on left
  - Hand cards stacked on right
  - Avatar and name at bottom
- [x] Center panel showing:
  - **Scattered deck visual** (cards appear thrown on table)
  - Stock pile count
  - 4 center piles with expected next card indicator
  - **Message area** (yellow box) for game events
- [x] Card selection with visual highlight
- [x] Status messages for game events

### Testing Mode
- [x] `SHOW_ALL_HANDS` flag in PlayerPanel.java (set to `true` to see all players' cards for testing)

---

## Recent Fixes (Session Log)

### Visual/Layout Fixes
1. Added player avatars with unique faces for each player
2. Added player name labels ("You" for human, names for opponents)
3. Improved side player layout (left/right) with vertical storage and stacked hand
4. Added scattered deck visual in center (cards at random angles)
5. Added message area (yellow box) for game status/events
6. Testing mode to show all hands face-up

### Game Rule Fixes
1. **21-pile to storage blocked**: Cards from 21-pile can only go to center piles
2. **Hand refill at turn start**: Hand is refilled to 5 cards at the beginning of each turn
3. **Cannot end turn with 5 cards**: Must reduce hand size before ending turn
4. **Center-to-storage restriction**: After playing to center, cannot play to storage (except when hand is full to avoid deadlock)
5. Increased deck count from 2 to 3 decks (156 cards) to ensure sufficient stock

---

## Known Issues / TODO

### Potential Enhancements
- [ ] AI opponent option
- [ ] Sound effects
- [ ] Animation for card movements
- [ ] Save/load game state
- [ ] Undo last move
- [ ] Game statistics tracking

---

## File Structure

```
src/
├── Main.java                 # Entry point
├── model/
│   ├── Card.java            # Card with suit and rank
│   ├── CenterPile.java      # Center pile logic (A-Q sequence)
│   ├── Deck.java            # Deck creation and shuffling
│   ├── Player.java          # Player state (hand, pile, storage)
│   ├── Rank.java            # Card ranks (A-K)
│   └── Suit.java            # Card suits
├── engine/
│   └── GameEngine.java      # Core game logic and rules
└── gui/
    ├── CardPanel.java       # Visual card component
    ├── CenterPanel.java     # Center area display (scattered deck, message box)
    ├── GameController.java  # Connects GUI to engine
    ├── GameWindow.java      # Main window
    └── PlayerPanel.java     # Player area display (avatars, compact mode)
```

---

## How to Run

```bash
# Compile
javac -encoding UTF-8 -d out src/model/*.java src/engine/*.java src/gui/*.java src/Main.java

# Run
java -cp out Main
```

Or use the provided batch files:
- `compile.bat` - Compiles the project
- `run.bat` - Runs the game

---

## Testing Mode

To show all players' cards (for debugging/testing):
1. Open `src/gui/PlayerPanel.java`
2. Find the line: `public static boolean SHOW_ALL_HANDS = true;`
3. Set to `false` to hide opponents' hands in normal gameplay
