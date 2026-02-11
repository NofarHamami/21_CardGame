import React from 'react';
import { Dimensions } from 'react-native';
import { Player, Card, CardSource } from '../models';
import { SelectedCard } from '../hooks/useGameEngine';
import { PlayerAreaHorizontal } from './PlayerAreaHorizontal';
import { SCREEN_BREAKPOINTS, DEFAULTS } from '../constants';

interface PlayerAreaProps {
  player: Player;
  isCurrentPlayer: boolean;
  selectedCard: SelectedCard | null;
  onSelectCard: (card: Card, source: CardSource, sourceIndex: number) => void;
  onPlayToStorage: (storageIndex: number) => void;
  showHandCards?: boolean;
  showStorageCards?: boolean;
  compact?: boolean;
  position?: 'top' | 'bottom' | 'left' | 'right';
  newlyDrawnCards?: Card[];
  containerWidth?: number;
  containerHeight?: number;
}

/**
 * Player area component - uses the same horizontal layout for ALL positions.
 * All player boards share the same fixed width, height, and column direction.
 */
export function PlayerArea({
  player,
  isCurrentPlayer,
  selectedCard,
  onSelectCard,
  onPlayToStorage,
  showHandCards = true,
  position = 'bottom',
  newlyDrawnCards = [],
}: PlayerAreaProps) {
  // Get screen width inside component (after React Native is initialized)
  const screenWidth = React.useMemo(() => {
    try {
      return Dimensions.get('window').width;
    } catch (e) {
      return DEFAULTS.SCREEN_WIDTH;
    }
  }, []);

  const isSmallScreen = screenWidth < SCREEN_BREAKPOINTS.SMALL;
  const isLargeScreen = screenWidth >= SCREEN_BREAKPOINTS.LARGE;

  // All positions use the same horizontal layout with fixed dimensions
  // Map left/right to top so they render as compact non-current player boards
  const mappedPosition = (position === 'left' || position === 'right') ? 'top' : position;

  return (
    <PlayerAreaHorizontal
      player={player}
      isCurrentPlayer={isCurrentPlayer}
      selectedCard={selectedCard}
      onSelectCard={onSelectCard}
      onPlayToStorage={onPlayToStorage}
      showHandCards={showHandCards}
      position={mappedPosition}
      isSmallScreen={isSmallScreen}
      isLargeScreen={isLargeScreen}
      newlyDrawnCards={newlyDrawnCards}
    />
  );
}

export default PlayerArea;
