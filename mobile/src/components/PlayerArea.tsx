import React, { useState, useCallback } from 'react';
import { View, LayoutChangeEvent, useWindowDimensions } from 'react-native';
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
  containerWidth?: number;   // For left/right rotation - the side section width
  containerHeight?: number;  // For left/right rotation - the middle row height
  onEndTurn?: () => void;
  canEndTurn?: boolean;
  onCancelSelection?: () => void;
  hasSelection?: boolean;
  onCardDragEnd?: (card: Card, source: CardSource, sourceIndex: number, dx: number, dy: number, moveX: number, moveY: number) => void;
  onCardDragStart?: (card: Card) => void;
}

/**
 * Player area component - uses horizontal layout for all positions.
 * Left/right positions render the same horizontal layout but rotated 90°.
 */
export function PlayerArea({
  player,
  isCurrentPlayer,
  selectedCard,
  onSelectCard,
  onPlayToStorage,
  showHandCards = true,
  showStorageCards = true,
  compact = false,
  position = 'bottom',
  newlyDrawnCards = [],
  containerWidth = 0,
  containerHeight = 0,
  onEndTurn,
  canEndTurn = false,
  onCancelSelection,
  hasSelection = false,
  onCardDragEnd,
  onCardDragStart,
}: PlayerAreaProps) {
  const [measuredHeight, setMeasuredHeight] = useState(0);

  const { width: screenWidth } = useWindowDimensions();

  const isSmallScreen = screenWidth < SCREEN_BREAKPOINTS.SMALL;
  const isLargeScreen = screenWidth >= SCREEN_BREAKPOINTS.LARGE;
  const isDesktop = screenWidth >= SCREEN_BREAKPOINTS.DESKTOP;

  // Handle measurement of the inner horizontal layout (for scaling)
  // Only measure once to avoid infinite re-render loops
  // (width depends on scale, scale depends on height, height depends on width)
  const handleInnerLayout = useCallback((e: LayoutChangeEvent) => {
    const { height } = e.nativeEvent.layout;
    if (height > 0 && measuredHeight === 0) {
      setMeasuredHeight(height);
    }
  }, [measuredHeight]);

  // On desktop: all positions use the same fixed-size layout (no rotation)
  if (isDesktop) {
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
        isDesktop={isDesktop}
        newlyDrawnCards={newlyDrawnCards}
        onEndTurn={onEndTurn}
        canEndTurn={canEndTurn}
        onCancelSelection={onCancelSelection}
        hasSelection={hasSelection}
        onCardDragEnd={onCardDragEnd}
        onCardDragStart={onCardDragStart}
      />
    );
  }

  // For left/right positions (non-desktop): render horizontal layout with rotation + scale
  if (position === 'left' || position === 'right') {
    const rotation = position === 'left' ? '90deg' : '-90deg';
    
    // The horizontal layout is rendered at full width (containerHeight becomes the width
    // after rotation, giving us the visual height). We measure its natural height to
    // calculate the scale factor that makes it fit within containerWidth (the visual width).
    
    // Use measured height for accurate scaling, with a reasonable default estimate
    const estimatedHeight = 250; // Approximate natural height of compact PlayerAreaHorizontal
    const naturalHeight = measuredHeight > 0 ? measuredHeight : estimatedHeight;
    
    // Scale to fit: the natural height of the horizontal layout becomes the visual width
    // after rotation, and it must fit within containerWidth
    const scale = containerWidth > 0 && naturalHeight > 0
      ? Math.min(1, containerWidth / naturalHeight)
      : 0.5;
    
    // Pre-rotation width: after rotation this becomes the visual height.
    // We divide by scale so that after scaling, it matches containerHeight.
    const innerWidth = containerHeight > 0 ? containerHeight / scale : 300;
    
    // Only show once we have container dimensions
    if (containerWidth <= 0 || containerHeight <= 0) {
      return null;
    }

    return (
      <View
        style={{
          width: containerWidth,
          height: containerHeight,
          justifyContent: 'center',
          alignItems: 'center',
          overflow: 'hidden',
        }}
        accessibilityLabel={`${player.name} player area`}
      >
        <View
          style={{
            width: innerWidth,
            transform: [
              { scale },
              { rotate: rotation },
            ],
          }}
          onLayout={handleInnerLayout}
        >
          <PlayerAreaHorizontal
            player={player}
            isCurrentPlayer={isCurrentPlayer}
            selectedCard={selectedCard}
            onSelectCard={onSelectCard}
            onPlayToStorage={onPlayToStorage}
            showHandCards={showHandCards}
            position="top"
            isSmallScreen={isSmallScreen}
            isLargeScreen={isLargeScreen}
            newlyDrawnCards={newlyDrawnCards}
            onEndTurn={onEndTurn}
            canEndTurn={canEndTurn}
            onCancelSelection={onCancelSelection}
            hasSelection={hasSelection}
            onCardDragEnd={onCardDragEnd}
            onCardDragStart={onCardDragStart}
          />
        </View>
      </View>
    );
  }

  // Top/bottom use horizontal layout directly (no rotation)
  return (
    <PlayerAreaHorizontal
      player={player}
      isCurrentPlayer={isCurrentPlayer}
      selectedCard={selectedCard}
      onSelectCard={onSelectCard}
      onPlayToStorage={onPlayToStorage}
      showHandCards={showHandCards}
      position={position}
      isSmallScreen={isSmallScreen}
      isLargeScreen={isLargeScreen}
      isDesktop={isDesktop}
      newlyDrawnCards={newlyDrawnCards}
      onEndTurn={onEndTurn}
      canEndTurn={canEndTurn}
      onCancelSelection={onCancelSelection}
      hasSelection={hasSelection}
      onCardDragEnd={onCardDragEnd}
      onCardDragStart={onCardDragStart}
    />
  );
}

export default PlayerArea;
