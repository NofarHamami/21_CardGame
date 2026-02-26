import React, { useEffect, useRef, useState } from 'react';
import { View, Animated, StyleSheet, Easing, useWindowDimensions } from 'react-native';
import { Card } from '../models';
import CardView from './CardView';
import { CARD_DIMENSIONS } from '../constants';
import { isReduceMotionEnabled } from '../utils/sounds';
import { colors } from '../theme/colors';

interface CardPlayAnimationProps {
  card: Card;
  playerPosition: 'top' | 'bottom' | 'left' | 'right';
  onComplete: () => void;
  sourceX?: number;
  sourceY?: number;
}

function getDefaultSource(playerPosition: string, screenWidth: number, screenHeight: number) {
  const cardW = CARD_DIMENSIONS.WIDTH;
  const cardH = CARD_DIMENSIONS.HEIGHT;
  const centerX = screenWidth / 2 - cardW / 2;
  const centerY = screenHeight / 2 - cardH / 2;

  switch (playerPosition) {
    case 'top':
      return { x: centerX, y: 100 };
    case 'bottom':
      return { x: centerX, y: screenHeight - 220 };
    case 'left':
      return { x: 80, y: centerY };
    case 'right':
      return { x: screenWidth - 160, y: centerY };
    default:
      return { x: centerX, y: screenHeight - 220 };
  }
}

export function CardPlayAnimation({ card, playerPosition, onComplete, sourceX, sourceY }: CardPlayAnimationProps) {
  const windowDims = useWindowDimensions();
  const reduceMotion = isReduceMotionEnabled();
  const posX = useRef(new Animated.Value(0)).current;
  const posY = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    if (reduceMotion) {
      onComplete();
      return;
    }
    const screenWidth = windowDims.width;
    const screenHeight = windowDims.height;
    const cardW = CARD_DIMENSIONS.WIDTH;
    const cardH = CARD_DIMENSIONS.HEIGHT;
    const dest = { x: screenWidth / 2 - cardW / 2, y: screenHeight / 2 - cardH / 2 };
    const source = (sourceX != null && sourceY != null)
      ? { x: sourceX, y: sourceY }
      : getDefaultSource(playerPosition, screenWidth, screenHeight);
    posX.setValue(source.x);
    posY.setValue(source.y);
    opacityAnim.setValue(1);
    scaleAnim.setValue(1);
    setIsActive(true);

    const ease = Easing.bezier(0.25, 0.1, 0.25, 1);

    Animated.parallel([
      Animated.timing(posX, {
        toValue: dest.x,
        duration: 350,
        easing: ease,
        useNativeDriver: true,
      }),
      Animated.timing(posY, {
        toValue: dest.y,
        duration: 350,
        easing: ease,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 0.85,
        duration: 350,
        easing: ease,
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.delay(250),
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 100,
          useNativeDriver: true,
        }),
      ]),
    ]).start(() => {
      setIsActive(false);
      onComplete();
    });
  }, [card.id]);

  if (!isActive) return null;

  return (
    <View style={styles.container} pointerEvents="none">
      <Animated.View
        style={[
          styles.animatedCard,
          {
            opacity: opacityAnim,
            transform: [
              { translateX: posX },
              { translateY: posY },
              { scale: scaleAnim },
            ],
          },
        ]}
      >
        <View style={styles.cardGlow} />
        <CardView card={card} compact={true} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
  },
  animatedCard: {
    position: 'absolute',
    width: CARD_DIMENSIONS.WIDTH,
    height: CARD_DIMENSIONS.HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardGlow: {
    position: 'absolute',
    width: CARD_DIMENSIONS.WIDTH + 8,
    height: CARD_DIMENSIONS.HEIGHT + 8,
    borderRadius: 12,
    backgroundColor: colors.gold,
    opacity: 0.2,
    shadowColor: colors.gold,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 10,
  },
});
