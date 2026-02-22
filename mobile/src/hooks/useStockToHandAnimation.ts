import { useState, useEffect, useCallback } from 'react';
import { Card } from '../models';
import { GameEvent } from '../engine/GameEngine';
import { logger } from '../utils/logger';

/**
 * Hook to manage stock-to-hand card animation
 * Tracks HAND_REFILLED events and manages animation state
 */
export function useStockToHandAnimation(lastEvent: GameEvent | null) {
  const [cardsToAnimate, setCardsToAnimate] = useState<Card[]>([]);
  const [isAnimating, setIsAnimating] = useState(false);

  // Track HAND_REFILLED events
  useEffect(() => {
    if (lastEvent?.type === 'HAND_REFILLED' && lastEvent.cards && lastEvent.cards.length > 0) {
      logger.debug('useStockToHandAnimation: HAND_REFILLED detected, cards:', lastEvent.cards.length);
      setCardsToAnimate(lastEvent.cards);
      setIsAnimating(true);
    }
  }, [lastEvent]);

  const onAnimationComplete = useCallback(() => {
    logger.debug('useStockToHandAnimation: Animation complete');
    setIsAnimating(false);
    setCardsToAnimate([]);
  }, []);

  return {
    cardsToAnimate,
    isAnimating,
    onAnimationComplete,
  };
}
