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

## Badge Styling Implementation

### Count Badge Circular Styling

The count badge on cards must render as a perfect circle, matching the styling from `C:\temp\mainproject\card-arch-designer`.

#### Requirements
- **Size**: 28x28px (w-7 h-7 in Tailwind)
- **Shape**: Perfect circle (not oval or rounded rectangle)
- **Position**: Top-right corner of card (-8px top, -8px right)
- **Styling**: Matches card-arch-designer project exactly

#### Implementation Details

**File**: `mobile/src/components/CardView.tsx`

**Badge Styling** (`countBadge`):
```typescript
countBadge: {
  position: 'absolute',
  top: -8,        // -top-2 = -8px (matching card-arch-designer)
  right: -8,      // -right-2 = -8px (matching card-arch-designer)
  width: 28,      // w-7 = 28px (matching card-arch-designer)
  height: 28,     // h-7 = 28px (matching card-arch-designer)
  minWidth: 28,    // Prevent shrinking
  minHeight: 28,  // Prevent shrinking
  maxWidth: 28,   // Prevent expansion
  maxHeight: 28,  // Prevent expansion
  borderRadius: 9999,  // Use very large value to ensure perfect circle in React Native
  backgroundColor: colors.primary,  // bg-primary (matching card-arch-designer)
  justifyContent: 'center',
  alignItems: 'center',
  overflow: 'hidden',  // Ensure content stays within circular bounds
  // Gold glow effect (matching card-arch-designer gold-glow)
  shadowColor: colors.gold,
  shadowOffset: { width: 0, height: 0 },
  shadowOpacity: 0.4,
  shadowRadius: 20,
  elevation: 8,
}
```

**Text Styling** (`countText`):
```typescript
countText: {
  color: colors.primaryForeground,  // text-primary-foreground
  fontSize: 12,                      // text-xs = 12px
  fontWeight: 'bold',                // font-bold
  textAlign: 'center',
  includeFontPadding: false,
  textAlignVertical: 'center',
}
```

**Card Container**:
- Changed `overflow: 'hidden'` to `overflow: 'visible'` on the card container to allow badge to extend beyond card bounds without clipping

#### Key Points
1. **borderRadius: 9999** - React Native trick to ensure perfect circle (works better than borderRadius: height/2)
2. **Fixed dimensions** - Width and height must be exactly equal (28x28px)
3. **Min/Max constraints** - Prevents any expansion or shrinking
4. **Card overflow** - Must be 'visible' to prevent badge clipping
5. **Reference**: Styling matches `C:\temp\mainproject\card-arch-designer\src\components\game\CardPile.tsx` line 34

#### Testing
- Verify badge appears as perfect circle (not oval)
- Check badge positioning (top-right corner, extends beyond card edge)
- Ensure badge works with single and double-digit numbers
- Verify gold glow effect is visible

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
