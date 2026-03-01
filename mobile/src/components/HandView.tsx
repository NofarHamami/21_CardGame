import React, { useEffect, useRef, useLayoutEffect } from 'react';
import { View, StyleSheet, Animated, useWindowDimensions } from 'react-native';
import { Card, CardSource } from '../models';
import CardView from './CardView';
import { SelectedCard } from '../hooks/useGameEngine';
import {
  SCREEN_BREAKPOINTS,
  CARD_DIMENSIONS,
  CARD_LAYOUT,
  HAND_RESERVED_SPACE,
  ARCH_HEIGHT_MULTIPLIERS,
  MAX_ROTATION_DEGREES,
  Z_INDEX,
  DEFAULTS,
} from '../constants';
import { MAX_HAND_SIZE } from '../models/Player';
import { logger } from '../utils/logger';
import { isReduceMotionEnabled } from '../utils/sounds';

interface HandViewProps {
  cards: Card[];
  selectedCard: SelectedCard | null;
  onSelectCard: (card: Card, source: CardSource, sourceIndex: number) => void;
  isCurrentPlayer: boolean;
  showHandCards: boolean;
  isCardSelected: (source: CardSource, index: number) => boolean;
  playerName?: string;
  newlyDrawnCards?: Card[];
  onCardDragEnd?: (card: Card, source: CardSource, sourceIndex: number, dx: number, dy: number, moveX: number, moveY: number) => void;
  onCardDragStart?: (card: Card) => void;
}

/**
 * Hand view component that displays cards in an arch layout
 */
export function HandView({
  cards,
  selectedCard,
  onSelectCard,
  isCurrentPlayer,
  showHandCards,
  isCardSelected,
  playerName,
  newlyDrawnCards = [],
  onCardDragEnd,
  onCardDragStart,
}: HandViewProps) {
  const [draggingCardId, setDraggingCardId] = React.useState<string | null>(null);

  // Track previous cards to detect newly added ones
  const prevCardsRef = useRef<Card[]>([]);
  const prevHandSizeRef = useRef<number>(0);
  const cardAnimationsRef = useRef<Map<string, Animated.Value>>(new Map());
  const newCardIdsRef = useRef<Set<string>>(new Set()); // Track which cards are new and should animate
  const hasInitializedRef = useRef<boolean>(false); // Track if we've initialized
  const prevPlayerNameRef = useRef<string | undefined>(undefined); // Track player changes
  const playerCardsRef = useRef<Map<string, Card[]>>(new Map()); // Track cards per player
  
  // Track which cards are new - use state to force re-render when needed
  const [newCardIdsState, setNewCardIdsState] = React.useState<Set<string>>(new Set());
  
  // Detect new cards BEFORE render (using useMemo)
  const newCardIds = React.useMemo(() => {
    const prevCards = prevCardsRef.current;
    const prevHandSize = prevHandSizeRef.current;
    const currentHandSize = cards.length;
    const prevPlayerName = prevPlayerNameRef.current;
    
    // Detect if player changed (turn changed)
    const playerChanged = playerName !== undefined && prevPlayerNameRef.current !== undefined && playerName !== prevPlayerNameRef.current;
    
    // CRITICAL: Check if this is first time seeing this specific player
    // If we have a playerName but no saved cards for them, this is first time seeing them
    const isFirstTimeSeeingPlayer = playerName !== undefined && !playerCardsRef.current.has(playerName);
    
    // On first render of component, initialize tracking
    if (!hasInitializedRef.current) {
      hasInitializedRef.current = true;
      prevPlayerNameRef.current = playerName;
      
      // CRITICAL: If newlyDrawnCards is provided on first render, use it
      // Otherwise, initialize with current cards so they won't be animated
      if (newlyDrawnCards.length > 0) {
        // We have newly drawn cards - let the logic below handle it
        // But initialize prevCardsRef to empty so we can detect new cards
        prevCardsRef.current = [];
        prevHandSizeRef.current = 0;
        logger.debug('HandView: First render - newlyDrawnCards provided, will detect new cards');
        // Continue to the newlyDrawnCards logic below
      } else if (isFirstTimeSeeingPlayer && cards.length > 0) {
        // First time seeing this player - set prevCardsRef to empty so all cards are detected as new
        prevCardsRef.current = [];
        prevHandSizeRef.current = 0;
        logger.debug('HandView: First render - first time seeing player', playerName, '- will detect all', cards.length, 'cards as new');
        // Don't return here - continue to detect new cards
      } else {
        // True first render of component with no player context or player already seen
        // Initialize with current cards so they won't be animated
        prevCardsRef.current = [...cards];
        prevHandSizeRef.current = currentHandSize;
        const emptySet = new Set<string>();
        newCardIdsRef.current = emptySet;
        setNewCardIdsState(emptySet);
        // Save current player's cards
        if (playerName) {
          playerCardsRef.current.set(playerName, [...cards]);
        }
        logger.debug('HandView: First render - initialized with', cards.length, 'cards, no animation');
        return emptySet;
      }
    }
    
    // If player changed, restore this player's previous cards from memory
    // This allows us to detect only NEW cards drawn from stock
    if (playerChanged && playerName) {
      const savedCards = playerCardsRef.current.get(playerName) || [];
      logger.debug('HandView: Player changed - restoring saved cards:', {
        prevPlayerName,
        currentPlayerName: playerName,
        savedCards: savedCards.length,
        currentCards: cards.length,
        savedCardIds: savedCards.map(c => c.id),
        currentCardIds: cards.map(c => c.id),
      });
      prevPlayerNameRef.current = playerName;
      
      // Find cards that exist in both saved and current (existing cards)
      const existingCards = cards.filter(card => 
        savedCards.some(savedCard => savedCard.id === card.id)
      );
      
      // CRITICAL: Always restore this player's previous cards from savedCards
      // If savedCards is empty (first time seeing this player), use empty array
      // This ensures we can detect new cards correctly
      if (savedCards.length === 0) {
        // First time seeing this player - set prevCardsRef to empty
        // This way, all current cards will be detected as new
        prevCardsRef.current = [];
        prevHandSizeRef.current = 0;
        logger.debug('HandView: First time seeing this player, setting prevCardsRef to empty to detect all cards as new');
      } else {
        // Restore this player's previous cards (existing cards)
        // Use existingCards if they exist, otherwise use savedCards
        // This ensures prevCardsRef contains the cards that were actually in the hand before
        prevCardsRef.current = existingCards.length > 0 ? [...existingCards] : [...savedCards];
        prevHandSizeRef.current = prevCardsRef.current.length;
        logger.debug('HandView: Restored this player\'s previous cards:', {
          existingCards: existingCards.length,
          savedCards: savedCards.length,
          prevCards: prevCardsRef.current.length,
          existingCardIds: existingCards.map(c => c.id),
          savedCardIds: savedCards.map(c => c.id),
          prevCardIds: prevCardsRef.current.map(c => c.id),
        });
      }
      
      logger.debug('HandView: Restored cards:', {
        existingCards: existingCards.length,
        prevCards: prevCardsRef.current.length,
        existingCardIds: existingCards.map(c => c.id),
        prevCardIds: prevCardsRef.current.map(c => c.id),
        newCardsWillBe: cards.filter(c => !prevCardsRef.current.some(pc => pc.id === c.id)).map(c => c.id),
      });
    } else if (!playerChanged && playerName && hasInitializedRef.current) {
      // Player didn't change, but we should still check if we have savedCards
      // This handles the case where cards are updated without a player change
      const savedCards = playerCardsRef.current.get(playerName) || [];
      if (savedCards.length > 0) {
        // We have saved cards for this player - update prevCardsRef to match savedCards
        // This ensures we can detect new cards correctly even without a player change
        const existingCards = cards.filter(card => 
          savedCards.some(savedCard => savedCard.id === card.id)
        );
        if (existingCards.length > 0) {
          prevCardsRef.current = [...existingCards];
          prevHandSizeRef.current = prevCardsRef.current.length;
          logger.debug('HandView: Updated prevCardsRef from savedCards (no player change):', {
            existingCards: existingCards.length,
            savedCards: savedCards.length,
            prevCards: prevCardsRef.current.length,
            existingCardIds: existingCards.map(c => c.id),
            savedCardIds: savedCards.map(c => c.id),
            prevCardIds: prevCardsRef.current.map(c => c.id),
          });
        }
      }
    }
    
    // CRITICAL: Get savedCards for this player BEFORE checking anything else
    // This is the source of truth for what cards this player had before
    // DO NOT save current cards here - we'll save them AFTER detecting new cards
    // This ensures savedCards reflects the PREVIOUS state, not the current state
    const savedCardsForPlayer = playerName ? playerCardsRef.current.get(playerName) || [] : [];
    const hasSavedCardsForPlayer = savedCardsForPlayer.length > 0;
    
    // Find newly added cards - cards that weren't in previous hand
    // Use prevCardsRef.current (updated value) instead of prevCards (old value)
    const newCardsById = cards.filter(
      card => !prevCardsRef.current.some(prevCard => prevCard.id === card.id)
    );
    
    const newIds = new Set<string>();
    
    // PRIORITY 1: If newlyDrawnCards prop has cards, use it to identify which cards to animate
    // This is the most reliable way - we know exactly which cards were just drawn from stock
    if (newlyDrawnCards.length > 0) {
      const newlyDrawnCardIds = new Set(newlyDrawnCards.map(c => c.id));
      cards.forEach(card => {
        if (newlyDrawnCardIds.has(card.id)) {
          // This card was just drawn from stock - animate it
          newIds.add(card.id);
        }
        // All other cards are existing - they will NOT be in newIds, so they'll render immediately
      });
      logger.debug('HandView: useMemo - Using newlyDrawnCards prop - only animating newly drawn cards:', {
        newlyDrawnCards: newlyDrawnCards.length,
        currentCards: cards.length,
        existingCards: cards.length - newlyDrawnCards.length,
        newCards: newIds.size,
        newCardIds: Array.from(newIds),
        newlyDrawnCardIds: Array.from(newlyDrawnCardIds),
        currentCardIds: cards.map(c => c.id),
        newlyDrawnCardStrings: newlyDrawnCards.map(c => `${c.rank}${c.suit}`),
        currentCardStrings: cards.map(c => `${c.rank}${c.suit}`),
      });
      
      // CRITICAL: Update refs and state immediately, then return early
      // This ensures only newly drawn cards animate, all others render immediately
      newCardIdsRef.current = newIds;
      setNewCardIdsState(newIds);
      
      // Save current cards for this player
      if (playerName && cards.length > 0) {
        playerCardsRef.current.set(playerName, [...cards]);
      }
      
      // Update prevCardsRef to current cards so next render won't detect them as new
      prevCardsRef.current = [...cards];
      prevHandSizeRef.current = cards.length;
      
      return newIds;
    }
    
    // PRIORITY 2: If we have savedCards for this player, use them to identify existing cards
    // This is the fallback method when newlyDrawnCards is not provided or is empty
    // CRITICAL: This MUST come before other detection logic to prevent all cards from animating
    if (hasSavedCardsForPlayer && playerName) {
      // We have saved cards - only animate cards that are NOT in savedCards
      // Cards that ARE in savedCards are existing and should be shown immediately without animation
      const existingCardIds = new Set(savedCardsForPlayer.map(c => c.id));
      cards.forEach(card => {
        if (!existingCardIds.has(card.id)) {
          // This card is not in savedCards - it's new and should animate
          newIds.add(card.id);
        }
        // Cards that ARE in existingCardIds are existing - they will NOT be in newIds
        // This means they will be rendered with static values (no animation)
      });
      logger.debug('HandView: useMemo - Has savedCards for player', playerName, '- only animating NEW cards:', {
        savedCards: savedCardsForPlayer.length,
        currentCards: cards.length,
        existingCards: cards.filter(c => existingCardIds.has(c.id)).length,
        newCards: newIds.size,
        newCardIds: Array.from(newIds),
        savedCardIds: savedCardsForPlayer.map(c => c.id),
        currentCardIds: cards.map(c => c.id),
        existingCardIds: Array.from(existingCardIds),
        playerChanged,
        isFirstTimeSeeingPlayer,
        prevCardsLength: prevCardsRef.current.length,
      });
      // IMPORTANT: We've identified new cards correctly
      // Existing cards will NOT be in newIds, so they won't animate
      // Only new cards will be in newIds and will animate
      // CRITICAL: Update both ref and state IMMEDIATELY
      newCardIdsRef.current = newIds;
      setNewCardIdsState(newIds);
      
      // Save current cards for this player at the END of useMemo
      // This ensures savedCards is available for the NEXT render cycle
      // CRITICAL: Save ALWAYS, even if cards haven't changed
      // This ensures savedCards is always up-to-date for the next render
      if (playerName && cards.length > 0) {
        // Always save, not just when changed - this ensures consistency
        playerCardsRef.current.set(playerName, [...cards]);
        const currentSavedCards = playerCardsRef.current.get(playerName) || [];
        logger.debug(`HandView: useMemo - Saved cards for player ${playerName} at end of useMemo:`, {
          previousCount: currentSavedCards.length,
          currentCount: cards.length,
          cardIds: cards.map(c => c.id),
          newCardIds: Array.from(newIds),
          hasInitialized: hasInitializedRef.current,
        });
      }
      
      return newIds;
    }
    
    // PRIORITY 2: If we have savedCards for this player, use them to identify existing cards
    // This is the fallback method when newlyDrawnCards is not provided or is empty
    // CRITICAL: This MUST come before other detection logic to prevent all cards from animating
    if (hasSavedCardsForPlayer && playerName) {
      // We have saved cards - only animate cards that are NOT in savedCards
      // Cards that ARE in savedCards are existing and should be shown immediately without animation
      const existingCardIds = new Set(savedCardsForPlayer.map(c => c.id));
      cards.forEach(card => {
        if (!existingCardIds.has(card.id)) {
          // This card is not in savedCards - it's new and should animate
          newIds.add(card.id);
        }
        // Cards that ARE in existingCardIds are existing - they will NOT be in newIds
        // This means they will be rendered with static values (no animation)
      });
      logger.debug('HandView: useMemo - Has savedCards for player', playerName, '- only animating NEW cards:', {
        savedCards: savedCardsForPlayer.length,
        currentCards: cards.length,
        existingCards: cards.filter(c => existingCardIds.has(c.id)).length,
        newCards: newIds.size,
        newCardIds: Array.from(newIds),
        savedCardIds: savedCardsForPlayer.map(c => c.id),
        currentCardIds: cards.map(c => c.id),
        existingCardIds: Array.from(existingCardIds),
        playerChanged,
        isFirstTimeSeeingPlayer,
        prevCardsLength: prevCardsRef.current.length,
      });
      // IMPORTANT: We've identified new cards correctly
      // Existing cards will NOT be in newIds, so they won't animate
      // Only new cards will be in newIds and will animate
      // CRITICAL: Update both ref and state IMMEDIATELY
      newCardIdsRef.current = newIds;
      setNewCardIdsState(newIds);
      
      // Save current cards for this player at the END of useMemo
      // This ensures savedCards is available for the NEXT render cycle
      // CRITICAL: Save ALWAYS, even if cards haven't changed
      // This ensures savedCards is always up-to-date for the next render
      if (playerName && cards.length > 0) {
        // Always save, not just when changed - this ensures consistency
        playerCardsRef.current.set(playerName, [...cards]);
        const currentSavedCards = playerCardsRef.current.get(playerName) || [];
        logger.debug(`HandView: useMemo - Saved cards for player ${playerName} at end of useMemo:`, {
          previousCount: currentSavedCards.length,
          currentCount: cards.length,
          cardIds: cards.map(c => c.id),
          newCardIds: Array.from(newIds),
          hasInitialized: hasInitializedRef.current,
        });
      }
      
      // Update prevCardsRef to current cards so next render won't detect them as new
      prevCardsRef.current = [...cards];
      prevHandSizeRef.current = cards.length;
      
      return newIds;
    }
    
    // PRIORITY 3: Fallback detection logic (only if no savedCards)
    if (isFirstTimeSeeingPlayer && prevCardsRef.current.length === 0 && cards.length > 0) {
      // First time seeing this player AND no saved cards - animate all cards as new
      cards.forEach(card => newIds.add(card.id));
      logger.debug('HandView: useMemo - First time seeing player', playerName, '- animating all', cards.length, 'cards (no saved cards):', {
        isFirstTimeSeeingPlayer,
        hasSavedCardsForPlayer,
        prevCards: prevCardsRef.current.length,
        currentCards: cards.length,
        newCardIds: Array.from(newIds),
        prevCardIds: prevCardsRef.current.map(c => c.id),
        currentCardIds: cards.map(c => c.id),
      });
    } else if (playerChanged && prevCardsRef.current.length === 0 && cards.length > 0) {
      // Player changed and first time seeing this player (no saved cards) - animate all cards
      cards.forEach(card => newIds.add(card.id));
      logger.debug('HandView: useMemo - Player changed, first time seeing this player (no saved cards) - animating all cards:', {
        playerChanged,
        hasSavedCardsForPlayer,
        prevCards: prevCardsRef.current.length,
        currentCards: cards.length,
        newCardIds: Array.from(newIds),
        prevCardIds: prevCardsRef.current.map(c => c.id),
        currentCardIds: cards.map(c => c.id),
      });
    } else if (prevCardsRef.current.length === 0 && !playerChanged && !isFirstTimeSeeingPlayer) {
      // First render (not a player change and not first time seeing player) - don't animate
      logger.debug('HandView: useMemo - First render (not player change, player already seen), prevCards is empty, no animation');
      const emptySet = new Set<string>();
      newCardIdsRef.current = emptySet;
      setNewCardIdsState(emptySet);
      return emptySet;
    } else if (newCardsById.length > 0) {
      // Found new cards by ID comparison - these are truly new
      newCardsById.forEach(card => newIds.add(card.id));
      logger.debug('HandView: useMemo - Found new cards by ID comparison:', {
        newCardsById: newCardsById.length,
        newCardIds: Array.from(newIds),
        prevCards: prevCardsRef.current.length,
        currentCards: cards.length,
        prevCardIds: prevCardsRef.current.map(c => c.id),
        currentCardIds: cards.map(c => c.id),
      });
    } else {
      // No new cards detected by ID comparison
      logger.debug('HandView: useMemo - No new cards detected:', {
        prevCards: prevCardsRef.current.length,
        currentCards: cards.length,
        handSizeIncreased: currentHandSize > prevHandSizeRef.current,
        numNewCards: currentHandSize - prevHandSizeRef.current,
        prevCardIds: prevCardsRef.current.map(c => c.id),
        currentCardIds: cards.map(c => c.id),
      });
    }
    
    // Update both ref and state
    newCardIdsRef.current = newIds;
    setNewCardIdsState(newIds);
    
    // CRITICAL: Save current cards for this player at the END of useMemo
    // This ensures savedCards is available for the NEXT render cycle
    // We save AFTER detecting new cards, so savedCards reflects the current state
    // CRITICAL: Save ALWAYS, even if cards haven't changed
    // This ensures savedCards is always up-to-date for the next render
    if (playerName && cards.length > 0) {
      // Always save, not just when changed - this ensures consistency
      playerCardsRef.current.set(playerName, [...cards]);
      const currentSavedCards = playerCardsRef.current.get(playerName) || [];
      logger.debug(`HandView: useMemo - Saved cards for player ${playerName} at end of useMemo:`, {
        previousCount: currentSavedCards.length,
        currentCount: cards.length,
        cardIds: cards.map(c => c.id),
        newCardIds: Array.from(newIds),
        hasInitialized: hasInitializedRef.current,
      });
    }
    
    // CRITICAL: Do NOT update prevCardsRef here in useMemo!
    // We need to keep the OLD value so we can detect new cards in the next render
    // prevCardsRef will be updated in useEffect AFTER animations are set up
    
    return newIds;
  }, [cards, playerName, newlyDrawnCards]);

  // Use useLayoutEffect to ensure cards start hidden BEFORE render
  useLayoutEffect(() => {
    const prevCards = prevCardsRef.current;
    const prevHandSize = prevHandSizeRef.current;
    const currentHandSize = cards.length;
    
    // Determine which cards to animate - use the IDs from useMemo
    const cardsToAnimate = cards.filter(card => newCardIds.has(card.id));
    const existingCards = cards.filter(card => !newCardIds.has(card.id));
    
    logger.debug('HandView: useLayoutEffect - Processing cards:', {
      prevSize: prevHandSize,
      currentSize: currentHandSize,
      numNewCards: currentHandSize - prevHandSize,
      newCardIds: Array.from(newCardIds),
      cardsToAnimate: cardsToAnimate.length,
      existingCards: existingCards.length,
      allCardIds: cards.map(c => c.id),
      prevCardIds: prevCards.map(c => c.id),
    });
    
    // CRITICAL: For existing cards, ensure they don't have animation values that could cause issues
    existingCards.forEach(card => {
      const animValue = cardAnimationsRef.current.get(card.id);
      if (animValue) {
        // Stop any running animation
        animValue.stopAnimation();
        // Set to 1 immediately (fully visible) - this ensures no animation
        animValue.setValue(1);
        logger.debug(`HandView: useLayoutEffect - Stopped animation and set to 1 for EXISTING card ${card.id}`);
      }
    });
    
    // CRITICAL: Set new cards to invisible IMMEDIATELY before render
    cardsToAnimate.forEach(card => {
      let animValue = cardAnimationsRef.current.get(card.id);
      if (!animValue) {
        animValue = new Animated.Value(0);
        cardAnimationsRef.current.set(card.id, animValue);
        logger.debug(`HandView: useLayoutEffect - Created animation value for NEW card ${card.id}, starting at 0`);
      } else {
        animValue.stopAnimation();
        animValue.setValue(0);
        logger.debug(`HandView: useLayoutEffect - Set animation value to 0 for NEW card ${card.id}`);
      }
    });
  }, [cards, newCardIds]);
  
  useEffect(() => {
    const prevCards = prevCardsRef.current;
    const prevHandSize = prevHandSizeRef.current;
    const currentHandSize = cards.length;
    
    // Determine which cards to animate - use the IDs from useMemo
    const cardsToAnimate = cards.filter(card => newCardIds.has(card.id));
    
    logger.debug('HandView: useEffect - Processing cards:', {
      prevSize: prevHandSize,
      currentSize: currentHandSize,
      numNewCards: currentHandSize - prevHandSize,
      newCardIds: Array.from(newCardIds),
      cardsToAnimate: cardsToAnimate.length,
      allCardIds: cards.map(c => c.id),
      prevCardIds: prevCards.map(c => c.id),
    });

    // CRITICAL: For existing cards, ensure they don't have animation values that could cause issues
    // Only NEW cards should have animation values set to 0
    // Existing cards should NOT have animation values at all, or they should be set to 1 and stopped
    cards.forEach(card => {
      const isNewCard = cardsToAnimate.some(newCard => newCard.id === card.id);
      
      if (isNewCard) {
        // NEW CARD: Create or reset animation value to 0
        if (!cardAnimationsRef.current.has(card.id)) {
          const animValue = new Animated.Value(0);
          cardAnimationsRef.current.set(card.id, animValue);
          logger.debug(`HandView: Created animation value for NEW card ${card.id}, starting at 0`);
        } else {
          const animValue = cardAnimationsRef.current.get(card.id)!;
          animValue.stopAnimation();
          animValue.setValue(0);
          logger.debug(`HandView: Reset animation value to 0 for NEW card ${card.id}`);
        }
      } else {
        // EXISTING CARD: Stop any animation and ensure value is 1, or remove from map
        const animValue = cardAnimationsRef.current.get(card.id);
        if (animValue) {
          animValue.stopAnimation();
          animValue.setValue(1);
          logger.debug(`HandView: Stopped animation and set to 1 for EXISTING card ${card.id}`);
        }
        // Note: We don't remove from map because we might need it later, but we ensure it's at 1
      }
    });

    if (cardsToAnimate.length > 0) {
      logger.debug('HandView: Starting animation for', cardsToAnimate.length, 'new cards');

      // If reduce motion is enabled, skip animations entirely
      if (isReduceMotionEnabled()) {
        cardsToAnimate.forEach(card => {
          const animValue = cardAnimationsRef.current.get(card.id);
          if (animValue) animValue.setValue(1);
        });
        newCardIdsRef.current.clear();
        setNewCardIdsState(new Set());
      } else {
        cardsToAnimate.forEach(card => {
          let animValue = cardAnimationsRef.current.get(card.id);
          if (!animValue) {
            animValue = new Animated.Value(0);
            cardAnimationsRef.current.set(card.id, animValue);
          }
          animValue.setValue(0);
        });

        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            const initialDelay = 200;
            const animationDuration = 900;

            cardsToAnimate.forEach((card, index) => {
              const animValue = cardAnimationsRef.current.get(card.id);
              if (!animValue) return;

              animValue.setValue(0);
              const staggerDelay = index * 150;
              const totalDelay = initialDelay + staggerDelay;

              Animated.sequence([
                Animated.delay(totalDelay),
                Animated.parallel([
                  Animated.timing(animValue, {
                    toValue: 1,
                    duration: animationDuration,
                    useNativeDriver: true,
                  }),
                ]),
              ]).start((finished) => {
                if (finished) {
                  newCardIdsRef.current.delete(card.id);
                  setNewCardIdsState(prev => {
                    const newSet = new Set(prev);
                    newSet.delete(card.id);
                    return newSet;
                  });
                }
              });
            });
          });
        });
      }
    } else {
      // No new cards to animate - clear the set
      logger.debug('HandView: No cards to animate');
      newCardIdsRef.current.clear();
      setNewCardIdsState(new Set());
    }

    // CRITICAL: Update prevCardsRef ONLY after animations are set up
    // This ensures that on the NEXT render, we can still detect new cards
    // Only update if we actually have cards to animate OR if cards changed
    if (cardsToAnimate.length > 0) {
      // Update prevCardsRef AFTER animations are scheduled
      // Use requestAnimationFrame to ensure this happens after render
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          prevCardsRef.current = [...cards];
          prevHandSizeRef.current = currentHandSize;
          logger.debug('HandView: Updated prevCardsRef after animation setup:', {
            newSize: currentHandSize,
            prevSize: prevHandSize,
            newCardIds: cardsToAnimate.map(c => c.id),
            cardIds: cards.map(c => c.id),
            cardsToAnimate: cardsToAnimate.length,
          });
        });
      });
    } else if (currentHandSize !== prevHandSize || cards.some((card, idx) => {
      const prevCard = prevCardsRef.current[idx];
      return !prevCard || prevCard.id !== card.id;
    })) {
      // Cards changed but no animation - update immediately
      prevCardsRef.current = [...cards];
      prevHandSizeRef.current = currentHandSize;
      logger.debug('HandView: Updated prevCardsRef (no animation):', {
        newSize: currentHandSize,
        prevSize: prevHandSize,
        cardIds: cards.map(c => c.id),
      });
    }
    
    // CRITICAL: Save current player's cards for future reference (for player change detection)
    // Save BEFORE the turn changes, so we can detect new cards when the turn comes back
    // Always save, even if no animation, to track player's hand state
    // IMPORTANT: Save at the END of useEffect, after all processing is done
    // This ensures the saved cards reflect the current state for the NEXT render
    if (playerName) {
      // Save immediately (not in requestAnimationFrame) so it's available for next render
      // But only save if cards actually changed to avoid unnecessary updates
      const currentSavedCards = playerCardsRef.current.get(playerName) || [];
      const cardsChanged = currentSavedCards.length !== cards.length || 
        cards.some((card, idx) => !currentSavedCards[idx] || currentSavedCards[idx].id !== card.id);
      
      if (cardsChanged) {
        playerCardsRef.current.set(playerName, [...cards]);
        logger.debug(`HandView: Saved cards for player ${playerName}:`, {
          cardIds: cards.map(c => c.id),
          count: cards.length,
          savedAt: 'after processing',
          previousCount: currentSavedCards.length,
        });
      }
    }
  }, [cards, newCardIds]);
  if (!isCurrentPlayer) {
    // Show face-down card with count for other players
    return (
      <View style={styles.handRow}>
        <CardView
          card={null}
          faceDown={true}
          showCount={cards.length}
          compact={true}
        />
      </View>
    );
  }

  const { width: screenWidth } = useWindowDimensions();

  const isSmallScreen = screenWidth < SCREEN_BREAKPOINTS.SMALL;
  const isLargeScreen = screenWidth >= SCREEN_BREAKPOINTS.LARGE;

  const reservedSpace = isSmallScreen
    ? HAND_RESERVED_SPACE.SMALL_SCREEN
    : isLargeScreen
    ? HAND_RESERVED_SPACE.LARGE_SCREEN
    : HAND_RESERVED_SPACE.DEFAULT;
  const availableWidth = Math.max(HAND_RESERVED_SPACE.MIN_WIDTH, screenWidth - reservedSpace);
  const cardVisibleWidth = CARD_LAYOUT.VISIBLE_WIDTH;

  const totalCards = cards.length;
  const totalNeededWidth = totalCards * cardVisibleWidth;

  let overlap: number = CARD_LAYOUT.DEFAULT_OVERLAP;
  if (totalNeededWidth > availableWidth && totalCards > 1) {
    const extraOverlapNeeded = totalNeededWidth - availableWidth;
    overlap = CARD_LAYOUT.DEFAULT_OVERLAP - (extraOverlapNeeded / Math.max(1, totalCards - 1));
    overlap = Math.max(CARD_LAYOUT.MIN_OVERLAP, Math.min(CARD_LAYOUT.MAX_OVERLAP, overlap));
  } else if (isSmallScreen) {
    overlap = CARD_LAYOUT.SMALL_SCREEN_OVERLAP;
  } else if (isLargeScreen && totalCards <= MAX_HAND_SIZE) {
    overlap = CARD_LAYOUT.LARGE_SCREEN_OVERLAP;
  }

  const archHeightMultiplier = isSmallScreen
    ? ARCH_HEIGHT_MULTIPLIERS.SMALL_SCREEN
    : isLargeScreen
    ? ARCH_HEIGHT_MULTIPLIERS.LARGE_SCREEN
    : ARCH_HEIGHT_MULTIPLIERS.DEFAULT;

  const maxRotation = isSmallScreen
    ? MAX_ROTATION_DEGREES.SMALL_SCREEN
    : isLargeScreen
    ? MAX_ROTATION_DEGREES.LARGE_SCREEN
    : MAX_ROTATION_DEGREES.DEFAULT;

  return (
    <View style={styles.handRow}>
        {cards.map((card, index) => {
          const normalizedIndex = totalCards > 1 ? (index / (totalCards - 1)) * 2 - 1 : 0;
          const archHeight = -archHeightMultiplier * (1 - normalizedIndex * normalizedIndex);
          const rotationDegrees = normalizedIndex * maxRotation;
          const finalOverlap = index === 0 ? 0 : overlap;

          // Check if this card is a new card that should be animated
          // Use newCardIds from useMemo directly - it's the source of truth
          // Don't use newCardIdsState because state updates are async and might be stale
          const isNewCard = newCardIds.has(card.id);
          
          if (!isNewCard) {
            const isDragging = draggingCardId === card.id;
            const opacity = 1;
            const translateY = isDragging ? 0 : archHeight;
            const scale = 1;
            
            return (
              <View
                key={card.id}
                style={[
                  styles.handCardWrapper,
                  {
                    marginLeft: finalOverlap,
                    opacity,
                    transform: [
                      { translateY },
                      { rotate: isDragging ? '0deg' : `${rotationDegrees}deg` },
                      { scale },
                    ],
                    zIndex: isDragging ? 100 : index + Z_INDEX.HAND_CARD,
                    elevation: isDragging ? 8 : undefined,
                  },
                  !isDragging && isCardSelected(CardSource.HAND, index) && styles.handCardSelected,
                ]}
              >
                <CardView
                  card={card}
                  faceDown={!showHandCards}
                  selected={isCardSelected(CardSource.HAND, index)}
                  onPress={() => onSelectCard(card, CardSource.HAND, index)}
                  draggable={isCurrentPlayer && showHandCards && !!onCardDragEnd}
                  onDragStart={() => { setDraggingCardId(card.id); onCardDragStart?.(card); }}
                  onDragEnd={onCardDragEnd ? (dx: number, dy: number, moveX: number, moveY: number) => {
                    setDraggingCardId(null);
                    onCardDragEnd(card, CardSource.HAND, index, dx, dy, moveX, moveY);
                  } : undefined}
                />
              </View>
            );
          }

          // New card - animation values are managed in useLayoutEffect/useEffect
          let animValue = cardAnimationsRef.current.get(card.id);
          if (!animValue) {
            animValue = new Animated.Value(0);
            cardAnimationsRef.current.set(card.id, animValue);
          }
          const opacity = animValue;
          const translateY = animValue.interpolate({
            inputRange: [0, 1],
            outputRange: [archHeight + 60, archHeight], // Start 60px below final position, slide up to archHeight
          });
          const scale = animValue.interpolate({
            inputRange: [0, 0.4, 0.7, 1],
            outputRange: [0.6, 1.2, 1.05, 1],
          });

          const isDraggingNew = draggingCardId === card.id;

          return (
            <Animated.View
              key={card.id}
              style={[
                styles.handCardWrapper,
                {
                  marginLeft: finalOverlap,
                  opacity: isDraggingNew ? 1 : opacity,
                  transform: [
                    { translateY: isDraggingNew ? 0 : translateY },
                    { rotate: isDraggingNew ? '0deg' : `${rotationDegrees}deg` },
                    { scale: isDraggingNew ? 1 : scale },
                  ],
                  zIndex: isDraggingNew ? 100 : index + Z_INDEX.HAND_CARD,
                  elevation: isDraggingNew ? 8 : undefined,
                },
                !isDraggingNew && isCardSelected(CardSource.HAND, index) && styles.handCardSelected,
              ]}
            >
              <CardView
                card={card}
                faceDown={!showHandCards}
                selected={isCardSelected(CardSource.HAND, index)}
                onPress={() => onSelectCard(card, CardSource.HAND, index)}
                draggable={isCurrentPlayer && showHandCards && !!onCardDragEnd}
                onDragStart={() => { setDraggingCardId(card.id); onCardDragStart?.(card); }}
                onDragEnd={onCardDragEnd ? (dx: number, dy: number, moveX: number, moveY: number) => {
                  setDraggingCardId(null);
                  onCardDragEnd(card, CardSource.HAND, index, dx, dy, moveX, moveY);
                } : undefined}
              />
            </Animated.View>
          );
        })}
      </View>
  );
}

const styles = StyleSheet.create({
  handRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    marginTop: 3,
    paddingLeft: 0,
    paddingRight: 0,
    minHeight: DEFAULTS.MIN_HAND_HEIGHT,
    flexWrap: 'nowrap',
    overflow: 'visible',
  },
  handCardWrapper: {
    zIndex: Z_INDEX.HAND_CARD,
  },
  handCardSelected: {
    zIndex: Z_INDEX.HAND_CARD_SELECTED,
  },
});
