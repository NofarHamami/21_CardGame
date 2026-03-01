import React, { useEffect, useRef } from 'react';
import { Text, StyleSheet, Animated } from 'react-native';
import { colors } from '../theme/colors';

interface ErrorToastProps {
  message: string | null;
  animKey?: number;
}

/**
 * Inline error message shown below the center piles.
 * Visible as long as `message` is non-null (clears when the next game event occurs).
 * The `animKey` prop triggers the entrance shake each time a new error happens.
 */
export function ErrorToast({ message, animKey = 0 }: ErrorToastProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const prevAnimKey = useRef(animKey);

  useEffect(() => {
    if (message) {
      fadeAnim.setValue(1);

      if (animKey !== prevAnimKey.current) {
        prevAnimKey.current = animKey;
        shakeAnim.setValue(0);
        Animated.sequence([
          Animated.timing(shakeAnim, { toValue: 8, duration: 50, useNativeDriver: true }),
          Animated.timing(shakeAnim, { toValue: -8, duration: 50, useNativeDriver: true }),
          Animated.timing(shakeAnim, { toValue: 5, duration: 40, useNativeDriver: true }),
          Animated.timing(shakeAnim, { toValue: -5, duration: 40, useNativeDriver: true }),
          Animated.timing(shakeAnim, { toValue: 0, duration: 30, useNativeDriver: true }),
        ]).start();
      }
    } else {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [message, animKey, fadeAnim, shakeAnim]);

  if (!message) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: fadeAnim,
          transform: [{ translateX: shakeAnim }],
        },
      ]}
      accessibilityRole="alert"
      accessibilityLiveRegion="assertive"
      accessibilityLabel={message}
    >
      <Text style={styles.icon}>⚠</Text>
      <Text style={styles.message}>{message}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.destructive,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  icon: {
    fontSize: 14,
  },
  message: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
    lineHeight: 18,
  },
});
