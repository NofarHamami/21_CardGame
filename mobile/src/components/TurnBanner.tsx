import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { colors } from '../theme/colors';

type Language = 'he' | 'en';

interface TurnBannerProps {
  playerName: string;
  isHumanTurn: boolean;
  visible: boolean;
  language: Language;
}

export const TurnBanner = React.memo(function TurnBanner({
  playerName,
  isHumanTurn,
  visible,
  language,
}: TurnBannerProps) {
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.8)).current;
  const translateY = useRef(new Animated.Value(-30)).current;
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setShow(true);
    opacity.setValue(0);
    scale.setValue(0.8);
    translateY.setValue(-30);

    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, friction: 6, useNativeDriver: true }),
      Animated.spring(translateY, { toValue: 0, friction: 6, useNativeDriver: true }),
    ]).start(() => {
      setTimeout(() => {
        Animated.parallel([
          Animated.timing(opacity, { toValue: 0, duration: 250, useNativeDriver: true }),
          Animated.timing(translateY, { toValue: -20, duration: 250, useNativeDriver: true }),
        ]).start(() => setShow(false));
      }, 500);
    });
  }, [visible, opacity, scale, translateY]);

  if (!show) return null;

  const label = isHumanTurn
    ? (language === 'he' ? 'התור שלך!' : 'Your Turn!')
    : (language === 'he' ? `התור של ${playerName}` : `${playerName}'s Turn`);

  return (
    <View style={styles.overlay} pointerEvents="none">
      <Animated.View
        style={[
          styles.banner,
          isHumanTurn ? styles.bannerHuman : styles.bannerAI,
          { opacity, transform: [{ scale }, { translateY }] },
        ]}
      >
        <Text style={[styles.text, isHumanTurn && styles.textHuman]}>{label}</Text>
      </Animated.View>
    </View>
  );
});

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9000,
  },
  banner: {
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 2,
  },
  bannerHuman: {
    backgroundColor: colors.primary,
    borderColor: colors.goldLight,
    shadowColor: colors.gold,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 16,
    elevation: 12,
  },
  bannerAI: {
    backgroundColor: colors.secondary,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  text: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.foreground,
    textAlign: 'center',
  },
  textHuman: {
    color: colors.primaryForeground,
  },
});
