# Project Improvement Recommendations

## Already Implemented

The following features are fully implemented:

- AI opponents (easy / medium / hard) with lookahead and heuristics
- Sound effects (Web Audio API on web, expo-haptics on native)
- Card play animations (fly-to-center, stock-to-hand, confetti)
- Save/load game state (AsyncStorage + localStorage)
- Game statistics tracking (wins, streaks, averages)
- Achievements system (8 achievements, bilingual)
- Game replay recording
- Bilingual support (Hebrew / English)
- Theme presets (Classic, Blue, Purple, Red)
- Drag-and-drop card play
- Timed mode (30 seconds per turn)
- Tutorial with step-by-step illustrations
- Player avatars (emoji)
- Hint system (💡 button with pulsing glow)
- Rematch from Game Over modal

---

## Remaining Improvements

### Performance

#### 1. Add React.memo to Expensive Components
**Priority: Medium** | **Effort: Low**

Wrap components that render frequently but don't change often (e.g. `PlayerAvatar`, `StorageView`).

#### 2. Optimize useGameEngine Hook Dependencies
**Priority: Medium** | **Effort: Medium**

The `playSelectedToCenter` and `playSelectedToStorage` callbacks depend on entire `gameState`, causing unnecessary re-renders. Consider depending on specific values instead.

#### 3. Use useReducer for Complex State
**Priority: Low** | **Effort: Medium**

For `useGameEngine`, consider `useReducer` to batch state updates and reduce re-renders.

#### 4. Split GameBoard Component
**Priority: Medium** | **Effort: Medium**

`GameBoard.tsx` is ~1000 lines. Extract drag handling, layout calculation, and pile hit-detection into separate modules (e.g. `DragController`, `PlayerLayoutManager`).

#### 5. Theme via React Context
**Priority: Medium** | **Effort: Medium**

`setActiveTheme` mutates a shared object without triggering React re-renders. Wrap theme in a React context provider for proper reactivity.

---

### Code Quality

#### 6. Stricter TypeScript Configuration
**Priority: Medium** | **Effort: Low**

Enable `strict`, `noUnusedLocals`, `noUnusedParameters`, and `noImplicitReturns` in `tsconfig.json`.

#### 7. Add Pre-commit Hooks
**Priority: Medium** | **Effort: Low**

Use Husky + lint-staged for automated linting and formatting on commit.

---

### Testing

#### 8. Add useGameEngine Hook Tests
**Priority: Medium** | **Effort: Medium**

Test hook behavior with mocked timers, AI flow, and state transitions using `renderHook`.

#### 9. Add Utility Tests
**Priority: Low** | **Effort: Low**

Add tests for `gameStats`, `achievements`, `sounds`, `gameSave`, and `gameReplay`.

#### 10. Add E2E Tests
**Priority: Low** | **Effort: High**

Use Detox or Maestro for end-to-end testing of complete game flows.

---

### Features

#### 11. Multiplayer Backend
**Priority: Low** | **Effort: High**

The WebSocket client (`MultiplayerService.ts`) is scaffolded but the server is minimal. Needs protocol design, state sync, and conflict resolution. "Random" mode is currently disabled.

#### 12. Game Replay Viewer
**Priority: Low** | **Effort: Medium**

`gameReplay.ts` records moves but there is no UI to play them back. Add a replay screen with step-through controls.

#### 13. More Achievements
**Priority: Low** | **Effort: Low**

Currently 8 achievements. Consider adding: fastest win by turn count, most cards played in one turn, comeback victory, winning with all storage slots used.

#### 14. Custom Avatars
**Priority: Low** | **Effort: Medium**

Players can only choose from 12 preset emojis. Consider allowing custom image avatars or a wider selection.

---

### Accessibility

#### 15. Font Scaling Option
**Priority: Low** | **Effort: Medium**

Add a text scaling option in settings for users who need larger text.

#### 16. High-Contrast Theme
**Priority: Low** | **Effort: Medium**

Add a high-contrast theme preset for better visibility.

---

### Mobile-Specific

#### 17. App Icon and Splash Screen
**Priority: Low** | **Effort: Low**

Configure proper app icon and splash screen in `app.json`.

#### 18. Deep Linking
**Priority: Low** | **Effort: Medium**

Support deep links for sharing game invites (useful when multiplayer is implemented).

---

### Monitoring

#### 19. Error Tracking
**Priority: Medium** | **Effort: Low**

Integrate Sentry or similar for crash reporting and error tracking in production.

#### 20. Bundle Size Analysis
**Priority: Low** | **Effort: Low**

Add `@expo/bundle-analyzer` to monitor and optimize bundle size.

---

## Priority Matrix

### High Priority, Low Effort
- Stricter TypeScript config
- Pre-commit hooks

### High Priority, Medium Effort
- Split GameBoard component
- Theme via React context
- useGameEngine tests

### Low Priority, Low Effort
- More achievements
- Bundle analysis
- App icon/splash

### Low Priority, High Effort
- Multiplayer backend
- E2E tests
- Custom avatars
