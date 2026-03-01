import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { colors as themeColors } from '../theme/colors';

interface PlayerAvatarProps {
  name: string;
  avatar?: string; // Custom emoji avatar
  size?: number;
  isCurrentPlayer?: boolean;
}

// Avatar colors based on player name (matching Lovable style)
const AVATAR_COLORS = [
  themeColors.primary, // Gold
  themeColors.secondary, // Green
  themeColors.accent, // Lighter gold
  themeColors.muted, // Muted green
];

/**
 * Player avatar component (Lovable style with emoji)
 */
export const PlayerAvatar = React.memo(function PlayerAvatar({ name, avatar, size = 48, isCurrentPlayer = false }: PlayerAvatarProps) {
  // Pick color based on name hash
  const colorIndex = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % AVATAR_COLORS.length;
  const bgColor = AVATAR_COLORS[colorIndex];
  
  const emojiSize = size * 0.5; // Emoji size relative to avatar
  const emojiToShow = avatar || '😎'; // Use custom avatar or default
  
  // Animation for jump effect when turn starts
  const jumpAnim = useRef(new Animated.Value(0)).current;
  const prevIsCurrentPlayer = useRef(isCurrentPlayer);

  useEffect(() => {
    // Trigger jump animation when isCurrentPlayer changes from false to true
    if (isCurrentPlayer && !prevIsCurrentPlayer.current) {
      // Reset animation value
      jumpAnim.setValue(0);
      
      // Create bounce animation: jump up and come back down
      Animated.sequence([
        Animated.timing(jumpAnim, {
          toValue: -20, // Jump up 20 pixels
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(jumpAnim, {
          toValue: 0, // Return to original position
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
    
    prevIsCurrentPlayer.current = isCurrentPlayer;
  }, [isCurrentPlayer, jumpAnim]);

  return (
    <Animated.View
      style={[
        styles.container,
        { 
          width: size, 
          height: size, 
          borderRadius: size / 2,
          backgroundColor: bgColor,
          transform: [{ translateY: jumpAnim }],
        },
        isCurrentPlayer && styles.currentPlayer,
      ]}
      accessibilityRole="image"
      accessibilityLabel={`${name}${isCurrentPlayer ? ', current player' : ''}`}
    >
      {/* Emoji avatar (matching Lovable design) */}
      <Text style={[styles.emoji, { fontSize: emojiSize }]}>{emojiToShow}</Text>
      
      {/* Current turn indicator dot */}
      {isCurrentPlayer && (
        <View style={styles.currentIndicator} />
      )}
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'visible',
  },
  currentPlayer: {
    borderWidth: 2,
    borderColor: themeColors.accent, // Gold ring
    // Gold glow effect
    shadowColor: themeColors.gold,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  emoji: {
    textAlign: 'center',
  },
  currentIndicator: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: themeColors.success, // Green dot
    borderWidth: 2,
    borderColor: themeColors.background,
  },
});

export default PlayerAvatar;
