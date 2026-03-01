import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  Platform,
  GestureResponderEvent,
  Animated,
} from 'react-native';
import { colors } from '../theme/colors';

type Language = 'he' | 'en';

interface GameToolbarProps {
  language: Language;
  soundMuted: boolean;
  currentVolume: number;
  onToggleMute: () => void;
  onVolumeChange: (volume: number) => void;
  onOpenSettings: () => void;
  onOpenTutorial: () => void;
  onHint?: () => void;
  hintDisabled?: boolean;
}

function HintButton({ onPress, disabled, language }: { onPress: () => void; disabled: boolean; language: Language }) {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (disabled) {
      pulseAnim.setValue(1);
      return;
    }
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.15, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [disabled, pulseAnim]);

  return (
    <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
      <TouchableOpacity
        style={[styles.toolbarButton, styles.hintButton, disabled && styles.toolbarButtonDisabled]}
        onPress={onPress}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={language === 'he' ? 'רמז' : 'Hint'}
        accessibilityHint={language === 'he' ? 'מציג את המהלך הטוב ביותר' : 'Shows the best move'}
      >
        <Text style={styles.buttonText}>💡</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

export function GameToolbar({
  language,
  soundMuted,
  currentVolume,
  onToggleMute,
  onVolumeChange,
  onOpenSettings,
  onOpenTutorial,
  onHint,
  hintDisabled = false,
}: GameToolbarProps) {
  const [volumePopupVisible, setVolumePopupVisible] = useState(false);
  const [sliderTrackWidth, setSliderTrackWidth] = useState(0);
  const volumeHideTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const previewThrottleRef = React.useRef<number>(0);

  const showVolumePopup = useCallback(() => {
    if (volumeHideTimeoutRef.current) {
      clearTimeout(volumeHideTimeoutRef.current);
      volumeHideTimeoutRef.current = null;
    }
    setVolumePopupVisible(true);
  }, []);

  const scheduleHideVolumePopup = useCallback(() => {
    volumeHideTimeoutRef.current = setTimeout(() => {
      setVolumePopupVisible(false);
    }, 400);
  }, []);

  const handleVolumeSlider = useCallback((e: GestureResponderEvent) => {
    if (sliderTrackWidth <= 0) return;
    const locationX = Math.max(0, Math.min(e.nativeEvent.locationX, sliderTrackWidth));
    const newVolume = Math.round((locationX / sliderTrackWidth) * 100) / 100;
    onVolumeChange(newVolume);
    const now = Date.now();
    if (now - previewThrottleRef.current > 250) {
      previewThrottleRef.current = now;
    }
  }, [sliderTrackWidth, onVolumeChange]);

  return (
    <View style={styles.toolbar}>
      <TouchableOpacity
        style={styles.toolbarButton}
        onPress={onOpenSettings}
        accessibilityRole="button"
        accessibilityLabel="Open settings"
      >
        <Text style={styles.buttonText}>⚙️</Text>
      </TouchableOpacity>

      <View
        style={styles.soundControlWrapper}
        {...(Platform.OS === 'web' ? {
          onMouseEnter: showVolumePopup,
          onMouseLeave: scheduleHideVolumePopup,
        } : {})}
      >
        <Pressable
          style={styles.toolbarButton}
          onPress={onToggleMute}
          onLongPress={Platform.OS !== 'web' ? () => setVolumePopupVisible(v => !v) : undefined}
          accessibilityRole="button"
          accessibilityLabel={soundMuted ? 'Unmute' : 'Mute'}
        >
          <Text style={styles.buttonText}>
            {soundMuted ? '🔇' : currentVolume > 0.5 ? '🔊' : currentVolume > 0 ? '🔉' : '🔈'}
          </Text>
        </Pressable>

        {volumePopupVisible && (
          <View style={styles.volumePopup}>
            <View
              style={styles.volumeSliderTrack}
              onLayout={(e) => setSliderTrackWidth(e.nativeEvent.layout.width)}
              onStartShouldSetResponder={() => true}
              onMoveShouldSetResponder={() => true}
              onResponderGrant={handleVolumeSlider}
              onResponderMove={handleVolumeSlider}
              accessibilityRole="adjustable"
              accessibilityLabel="Volume"
              accessibilityValue={{
                min: 0,
                max: 100,
                now: Math.round(currentVolume * 100),
                text: `${Math.round(currentVolume * 100)}%`,
              }}
            >
              <View
                style={[
                  styles.volumeSliderFill,
                  { width: `${Math.round(currentVolume * 100)}%` },
                  soundMuted && styles.volumeSliderFillMuted,
                ]}
              />
              <View
                style={[
                  styles.volumeSliderThumb,
                  { left: `${Math.round(currentVolume * 100)}%` },
                ]}
              />
            </View>
            <Text style={styles.volumePercent}>
              {soundMuted ? '🔇' : `${Math.round(currentVolume * 100)}%`}
            </Text>
          </View>
        )}
      </View>

      <TouchableOpacity
        style={styles.toolbarButton}
        onPress={onOpenTutorial}
        accessibilityRole="button"
        accessibilityLabel={language === 'he' ? 'איך משחקים?' : 'How to play'}
      >
        <Text style={styles.buttonText}>❓</Text>
      </TouchableOpacity>

      {onHint && (
        <HintButton
          onPress={onHint}
          disabled={hintDisabled}
          language={language}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  toolbar: {
    position: 'absolute',
    top: 50,
    left: 16,
    flexDirection: 'row',
    gap: 8,
    zIndex: 1001,
  },
  toolbarButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 8,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  } as any,
  hintButton: {
    borderColor: colors.gold,
    shadowColor: colors.gold,
    shadowOpacity: 0.5,
    shadowRadius: 6,
  },
  toolbarButtonDisabled: {
    opacity: 0.4,
  },
  buttonText: {
    fontSize: 20,
  },
  soundControlWrapper: {
    zIndex: 1,
  },
  volumePopup: {
    position: 'absolute',
    top: 46,
    left: -8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.secondary,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 2,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 12,
    gap: 10,
    width: 200,
  },
  volumeSliderTrack: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    backgroundColor: `${colors.muted}88`,
    justifyContent: 'center',
    overflow: 'visible' as const,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  } as any,
  volumeSliderFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.gold,
  },
  volumeSliderFillMuted: {
    backgroundColor: colors.mutedForeground,
  },
  volumeSliderThumb: {
    position: 'absolute',
    top: -4,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.gold,
    marginLeft: -8,
    borderWidth: 2,
    borderColor: colors.background,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 4,
  },
  volumePercent: {
    color: colors.mutedForeground,
    fontSize: 12,
    fontWeight: '600',
    minWidth: 36,
    textAlign: 'right',
  },
});
