import React, { useEffect, useRef, useState } from 'react';
import { View, Animated, StyleSheet, Dimensions, Easing } from 'react-native';
import { Card } from '../models';
import CardView from './CardView';
import { CARD_DIMENSIONS } from '../constants';
import { colors, withOpacity, opacity } from '../theme/colors';

interface StockToHandAnimationProps {
  cardsToAnimate: Card[];
  stockRef: React.RefObject<View | null>;
  playerPosition: 'top' | 'bottom' | 'left' | 'right';
  onAnimationComplete: () => void;
}

/**
 * Animates cards flying from stock pile toward hand area
 * Creates a visual effect showing cards being drawn from stock
 */
export function StockToHandAnimation({
  cardsToAnimate,
  stockRef,
  playerPosition,
  onAnimationComplete,
}: StockToHandAnimationProps) {
  const [isAnimating, setIsAnimating] = useState(false);
  const [stockPosition, setStockPosition] = useState<{ x: number; y: number } | null>(null);
  const stockPulseRef = useRef(new Animated.Value(1));
  const animationRefs = useRef<Map<string, { 
    position: Animated.ValueXY; 
    opacity: Animated.Value; 
    scale: Animated.Value;
    glow: Animated.Value;
  }>>(new Map());

  useEffect(() => {
    if (cardsToAnimate.length === 0) {
      return;
    }

    // Measure stock position
    const measureStock = () => {
      if (!stockRef.current) return null;
      
      return new Promise<{ x: number; y: number }>((resolve) => {
        stockRef.current!.measure((x, y, width, height, pageX, pageY) => {
          const centerX = pageX + width / 2 - CARD_DIMENSIONS.WIDTH / 2;
          const centerY = pageY + height / 2 - CARD_DIMENSIONS.HEIGHT / 2;
          resolve({ x: centerX, y: centerY });
        });
      });
    };

    // Calculate target direction - straight line motion like lifting a real card
    const getTargetOffset = () => {
      const screenWidth = Dimensions.get('window').width;
      const screenHeight = Dimensions.get('window').height;
      
      switch (playerPosition) {
        case 'bottom':
          return { 
            x: 0, 
            y: -screenHeight * 0.3,
          };
        case 'top':
          return { 
            x: 0, 
            y: screenHeight * 0.3,
          };
        case 'left':
          return { 
            x: screenWidth * 0.3, 
            y: 0,
          };
        case 'right':
          return { 
            x: -screenWidth * 0.3, 
            y: 0,
          };
        default:
          return { x: 0, y: -100 };
      }
    };

    // Start measuring and animating
    const startAnimation = async () => {
      const stockPos = await measureStock();

      if (!stockPos) {
        console.log('StockToHandAnimation: Could not measure stock position, skipping animation');
        onAnimationComplete();
        return;
      }

      setStockPosition(stockPos);
      setIsAnimating(true);

      const targetOffset = getTargetOffset();

      // Anticipation effect: pulse the stock pile before cards appear
      Animated.sequence([
        Animated.timing(stockPulseRef.current, {
          toValue: 1.15,
          duration: 150,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(stockPulseRef.current, {
          toValue: 1,
          duration: 150,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
      ]).start();

      // Create animation values for each card with enhanced effects
      cardsToAnimate.forEach((card) => {
        const position = new Animated.ValueXY({
          x: stockPos.x,
          y: stockPos.y,
        });
        const opacity = new Animated.Value(0);
        const glow = new Animated.Value(0);
        
        animationRefs.current.set(card.id, { 
          position, 
          opacity, 
          scale: new Animated.Value(1.0), // Keep card at normal size
          glow,
        });
      });

      // Animate each card with refined stagger and effects
      const animations = cardsToAnimate.map((card, index) => {
        const anims = animationRefs.current.get(card.id);
        if (!anims) return null;

        // Gentle stagger - cards follow each other naturally
        const staggerDelay = index * 120;
        const animationDuration = 800; // Natural speed for card lift

        // Direct path - like lifting a card straight from deck
        const finalX = stockPos.x + targetOffset.x;
        const finalY = stockPos.y + targetOffset.y;

        // Very smooth, linear easing for natural card lift motion
        const naturalEase = Easing.bezier(0.25, 0.1, 0.25, 1); // Very smooth, natural motion

        return Animated.sequence([
          Animated.delay(staggerDelay),
          Animated.parallel([
            // Simple, smooth fade in
            Animated.timing(anims.opacity, {
              toValue: 1,
              duration: 150,
              easing: Easing.out(Easing.ease),
              useNativeDriver: true,
            }),
            // Keep scale at 1.0 - no size change
            // Very subtle glow - no pulsing, just steady
            Animated.timing(anims.glow, {
              toValue: 0.3,
              duration: 150,
              easing: Easing.out(Easing.ease),
              useNativeDriver: true,
            }),
            // Smooth, natural motion - like lifting a card from deck
            Animated.parallel([
              Animated.timing(anims.position.x, {
                toValue: finalX,
                duration: animationDuration,
                easing: naturalEase,
                useNativeDriver: true,
              }),
              Animated.timing(anims.position.y, {
                toValue: finalY,
                duration: animationDuration,
                easing: naturalEase,
                useNativeDriver: true,
              }),
            ]),
          ]),
          // Smooth fade out
          Animated.timing(anims.opacity, {
            toValue: 0,
            duration: 150,
            easing: Easing.in(Easing.ease),
            useNativeDriver: true,
          }),
        ]);
      }).filter(Boolean) as Animated.CompositeAnimation[];

      // Start all animations
      Animated.parallel(animations).start(() => {
        setIsAnimating(false);
        animationRefs.current.clear();
        onAnimationComplete();
      });
    };

    // Small delay to ensure components are rendered
    setTimeout(startAnimation, 100);
  }, [cardsToAnimate.length, stockRef, playerPosition, onAnimationComplete]);

  if (!isAnimating || cardsToAnimate.length === 0 || !stockPosition) {
    return null;
  }

  return (
    <View style={styles.container} pointerEvents="none">
      {/* Stock pile pulse effect */}
      {stockPosition && (
        <Animated.View
          style={[
            styles.stockPulse,
            {
              left: stockPosition.x + CARD_DIMENSIONS.WIDTH / 2 - 30,
              top: stockPosition.y + CARD_DIMENSIONS.HEIGHT / 2 - 30,
              transform: [{ scale: stockPulseRef.current }],
            },
          ]}
        />
      )}
      {cardsToAnimate.map((card) => {
        const anims = animationRefs.current.get(card.id);
        if (!anims) return null;

        // No rotation - cards stay straight

        // Very subtle glow - minimal effect
        const glowOpacity = anims.glow.interpolate({
          inputRange: [0, 0.3],
          outputRange: [0, 0.2],
        });

        // Subtle shadow - constant
        const shadowOpacity = 0.2;

        // Keep scale at 1.0 - normal size
        const finalScale = 1.0;

        return (
          <Animated.View
            key={card.id}
            style={[
              styles.animatedCard,
              {
                opacity: anims.opacity,
                transform: [
                  { translateX: anims.position.x },
                  { translateY: anims.position.y },
                ],
              },
            ]}
          >
            {/* Subtle glow effect */}
            <Animated.View
              style={[
                styles.glowEffect,
                styles.glowOuter,
                {
                  opacity: glowOpacity,
                  transform: [{ scale: 1.2 }],
                },
              ]}
            />
            {/* Card shadow for depth */}
            <Animated.View
              style={[
                styles.cardShadow,
                {
                  opacity: shadowOpacity,
                },
              ]}
            />
            <CardView
              card={card}
              faceDown={true}
              compact={true}
            />
          </Animated.View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10000, // Very high z-index to appear above everything
  },
  animatedCard: {
    position: 'absolute',
    width: CARD_DIMENSIONS.WIDTH,
    height: CARD_DIMENSIONS.HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glowEffect: {
    position: 'absolute',
    borderRadius: 12,
  },
  glowOuter: {
    width: CARD_DIMENSIONS.WIDTH * 1.5,
    height: CARD_DIMENSIONS.HEIGHT * 1.5,
    backgroundColor: colors.gold,
    shadowColor: colors.gold,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 15,
  },
  cardShadow: {
    position: 'absolute',
    width: CARD_DIMENSIONS.WIDTH,
    height: CARD_DIMENSIONS.HEIGHT,
    borderRadius: 8,
    backgroundColor: colors.cardBlack,
    shadowColor: colors.cardBlack,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    opacity: 0.3,
  },
  stockPulse: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.gold,
    opacity: 0.2,
    alignSelf: 'center',
    shadowColor: colors.gold,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 20,
    elevation: 20,
  },
});
