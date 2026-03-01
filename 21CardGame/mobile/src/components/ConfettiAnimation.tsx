import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, useWindowDimensions } from 'react-native';
import { isReduceMotionEnabled } from '../utils/sounds';

const NUM_CONFETTI = 40;
const CONFETTI_COLORS = ['#f9c74f', '#f8961e', '#f3722c', '#90be6d', '#43aa8b', '#577590', '#f94144', '#fff'];

interface ConfettiPiece {
  x: Animated.Value;
  y: Animated.Value;
  rotate: Animated.Value;
  opacity: Animated.Value;
  color: string;
  size: number;
}

interface ConfettiAnimationProps {
  visible: boolean;
}

export function ConfettiAnimation({ visible }: ConfettiAnimationProps) {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const pieces = useRef<ConfettiPiece[]>([]);

  if (pieces.current.length === 0) {
    for (let i = 0; i < NUM_CONFETTI; i++) {
      pieces.current.push({
        x: new Animated.Value(Math.random() * screenWidth),
        y: new Animated.Value(-20 - Math.random() * 100),
        rotate: new Animated.Value(0),
        opacity: new Animated.Value(1),
        color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
        size: 6 + Math.random() * 8,
      });
    }
  }

  useEffect(() => {
    if (!visible) return;

    const animations = pieces.current.map((piece) => {
      const startX = Math.random() * screenWidth;
      const drift = (Math.random() - 0.5) * 120;
      const duration = 2500 + Math.random() * 2000;
      const delay = Math.random() * 800;

      piece.x.setValue(startX);
      piece.y.setValue(-20 - Math.random() * 100);
      piece.rotate.setValue(0);
      piece.opacity.setValue(1);

      return Animated.sequence([
        Animated.delay(delay),
        Animated.parallel([
          Animated.timing(piece.y, {
            toValue: screenHeight + 40,
            duration,
            useNativeDriver: true,
          }),
          Animated.timing(piece.x, {
            toValue: startX + drift,
            duration,
            useNativeDriver: true,
          }),
          Animated.timing(piece.rotate, {
            toValue: 360 * (1 + Math.random() * 3),
            duration,
            useNativeDriver: true,
          }),
          Animated.timing(piece.opacity, {
            toValue: 0,
            duration,
            delay: duration * 0.6,
            useNativeDriver: true,
          }),
        ]),
      ]);
    });

    Animated.parallel(animations).start();
  }, [visible, screenWidth, screenHeight]);

  if (!visible || isReduceMotionEnabled()) return null;

  return (
    <View style={styles.container} pointerEvents="none">
      {pieces.current.map((piece, i) => {
        const rotateInterpolation = piece.rotate.interpolate({
          inputRange: [0, 360],
          outputRange: ['0deg', '360deg'],
        });

        return (
          <Animated.View
            key={i}
            style={[
              styles.piece,
              {
                width: piece.size,
                height: piece.size * 0.6,
                backgroundColor: piece.color,
                borderRadius: piece.size * 0.15,
                opacity: piece.opacity,
                transform: [
                  { translateX: piece.x },
                  { translateY: piece.y },
                  { rotate: rotateInterpolation },
                ],
              },
            ]}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
  },
  piece: {
    position: 'absolute',
  },
});
