import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Card, getSuitSymbol, getRankSymbol, isCardRed } from '../models';
import { colors } from '../theme/colors';
import { CARD_DIMENSIONS, FONT_SIZES } from '../constants';

interface CardViewProps {
  card: Card | null;
  faceDown?: boolean;
  selected?: boolean;
  disabled?: boolean;
  compact?: boolean;
  onPress?: () => void;
  style?: ViewStyle;
  showCount?: number;
}

/**
 * Playing card component
 */
export function CardView({
  card,
  faceDown = false,
  selected = false,
  disabled = false,
  compact = false,
  onPress,
  style,
  showCount,
}: CardViewProps) {
  const isRed = card ? isCardRed(card) : false;
  const cardColor = isRed ? colors.cardRed : colors.cardBlack;
  
  const width = compact ? CARD_DIMENSIONS.COMPACT_WIDTH : CARD_DIMENSIONS.WIDTH;
  const height = compact ? CARD_DIMENSIONS.COMPACT_HEIGHT : CARD_DIMENSIONS.HEIGHT;
  const fontSize = compact ? FONT_SIZES.CARD_COMPACT : FONT_SIZES.CARD_DEFAULT;
  const centerSize = compact ? 24 : 36; // Larger center suit symbol like Lovable

  // Empty slot
  if (!card && !faceDown) {
    const isInteractive = !disabled && !!onPress;
    return (
      <TouchableOpacity
        style={[
          styles.card,
          { width, height },
          styles.emptyCard,
          selected && styles.selectedCard,
          style,
        ]}
        onPress={onPress}
        disabled={disabled || !onPress}
        activeOpacity={0.7}
        accessibilityRole={isInteractive ? "button" : undefined}
        accessibilityLabel="Empty card slot"
        accessibilityHint={onPress ? "Press to place a card here" : undefined}
        accessibilityState={{ disabled: disabled || !onPress }}
      />
    );
  }

  // Face down card - matching card-arch-designer gradient exactly
  // bg-gradient-to-br from-secondary via-[hsl(145,40%,20%)] to-[hsl(145,50%,12%)]
  if (faceDown) {
    const cardLabel = showCount ? `${showCount} face down cards` : 'Face down card';
    const isInteractive = !disabled && !!onPress;
    
    // Convert HSL colors to hex for gradient
    // from-secondary: hsl(145, 35%, 28%)
    // via: hsl(145, 40%, 20%)
    // to: hsl(145, 50%, 12%)
    const hslToHex = (h: number, s: number, l: number): string => {
      l /= 100;
      const a = (s * Math.min(l, 1 - l)) / 100;
      const f = (n: number) => {
        const k = (n + h / 30) % 12;
        const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
        return Math.round(255 * color)
          .toString(16)
          .padStart(2, '0');
      };
      return `#${f(0)}${f(8)}${f(4)}`;
    };
    
    const gradientColors = [
      colors.secondary, // from-secondary
      hslToHex(145, 40, 20), // via
      hslToHex(145, 50, 12), // to
    ];
    
    return (
      <TouchableOpacity
        style={[
          styles.card,
          { width, height },
          selected && styles.selectedCard,
          style,
        ]}
        onPress={onPress}
        disabled={disabled || !onPress}
        activeOpacity={0.7}
        accessibilityRole={isInteractive ? "button" : undefined}
        accessibilityLabel={cardLabel}
        accessibilityHint={onPress ? "Press to select this card" : undefined}
        accessibilityState={{ disabled: disabled || !onPress, selected }}
      >
        <LinearGradient
          colors={gradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.faceDownCard, { width, height }]}
        >
          {/* Outer border - matching card-arch-designer */}
          <View style={styles.faceDownBorder} />
          
          {/* Inner card with star symbol - matching card-arch-designer */}
          <View style={styles.faceDownInner}>
            <Text style={styles.faceDownStar}>✦</Text>
          </View>
        </LinearGradient>
        
        {showCount !== undefined && showCount > 0 && (
          <View style={styles.countBadge}>
            <Text style={styles.countText} numberOfLines={1}>{showCount}</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  }

  // Face up card (Lovable style: cream/beige gradient background)
  const rankSymbol = getRankSymbol(card!.rank);
  const suitSymbol = getSuitSymbol(card!.suit);
  const cardLabel = `${rankSymbol} of ${suitSymbol}${showCount ? `, ${showCount} cards` : ''}`;
  const accessibilityHint = selected
    ? 'Card is selected. Press again to deselect or press a valid destination to play.'
    : onPress
    ? 'Press to select this card'
    : undefined;

  const isInteractive = !disabled && !!onPress;
  
  return (
    <TouchableOpacity
      style={[
        styles.card,
        styles.faceUpCard,
        { width, height },
        selected && styles.selectedCard,
        disabled && styles.disabledCard,
        style,
      ]}
      onPress={onPress}
      disabled={disabled || !onPress}
      activeOpacity={0.7}
      accessibilityRole={isInteractive ? "button" : undefined}
      accessibilityLabel={cardLabel}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: disabled || !onPress, selected }}
    >
      {/* Top left corner */}
      <View style={styles.cornerTop}>
        <Text style={[styles.rankText, { color: cardColor, fontSize }]}>{rankSymbol}</Text>
        <Text style={[styles.suitTextSmall, { color: cardColor }]}>{suitSymbol}</Text>
      </View>

      {/* Center suit - large */}
      <View style={styles.centerArea}>
        <Text style={[styles.centerSuit, { color: cardColor, fontSize: centerSize }]}>{suitSymbol}</Text>
      </View>

      {/* Bottom right corner (rotated) */}
      <View style={styles.cornerBottom}>
        <Text style={[styles.rankText, { color: cardColor, fontSize }]}>{rankSymbol}</Text>
        <Text style={[styles.suitTextSmall, { color: cardColor }]}>{suitSymbol}</Text>
      </View>

      {showCount !== undefined && showCount > 0 && (
        <View style={styles.countBadge}>
          <Text style={styles.countText} numberOfLines={1}>{showCount}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 8, // rounded-lg
    overflow: 'visible', // Changed to 'visible' to allow badge to extend beyond card bounds
  },
  faceUpCard: {
    backgroundColor: colors.card, // Cream/beige card background
    borderWidth: 1,
    borderColor: colors.border,
    // Card shadow matching card-arch-designer exactly
    // box-shadow: 0 4px 6px -1px rgba(0,0,0,0.3), 0 10px 20px -5px rgba(0,0,0,0.25), 0 2px 4px rgba(0,0,0,0.2)
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  selectedCard: {
    borderWidth: 2,
    borderColor: colors.gold,
    shadowColor: colors.gold,
    shadowOpacity: 0.4,
    shadowRadius: 10,
    transform: [{ translateY: -20 }, { scale: 1.05 }],
    elevation: 10,
    zIndex: 50,
  },
  disabledCard: {
    opacity: 0.6,
  },
  emptyCard: {
    backgroundColor: `${colors.muted}33`, // rgba equivalent
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: `${colors.mutedForeground}33`,
  },
  // Face down card styling - matching card-arch-designer exactly
  // Gradient is applied via LinearGradient component
  faceDownCard: {
    borderRadius: 8,
    borderWidth: 2,
    borderColor: colors.secondary,
    // Multi-layer shadow matching card-arch-designer card-shadow
    // box-shadow: 0 4px 6px -1px rgba(0,0,0,0.3), 0 10px 20px -5px rgba(0,0,0,0.25), 0 2px 4px rgba(0,0,0,0.2)
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  faceDownBorder: {
    position: 'absolute',
    top: 8, // inset-2 = 8px
    left: 8,
    right: 8,
    bottom: 8,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: `${colors.mutedForeground}4D`, // muted-foreground/30 opacity-50
    opacity: 0.5,
  },
  faceDownInner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    // w-12 h-16 = 48x64px, centered
    width: 48,
    height: 64,
    alignSelf: 'center',
    borderRadius: 4,
    backgroundColor: `${colors.secondary}4D`, // bg-secondary/30
    borderWidth: 1,
    borderColor: `${colors.mutedForeground}4D`, // border-muted-foreground/30
  },
  faceDownStar: {
    fontSize: 24, // text-2xl = 24px
    color: `${colors.mutedForeground}99`, // text-muted-foreground/60
  },
  cornerTop: {
    position: 'absolute',
    top: 6, // top-1.5 = 6px
    left: 8, // left-2 = 8px
    alignItems: 'center',
  },
  cornerBottom: {
    position: 'absolute',
    bottom: 6, // bottom-1.5 = 6px
    right: 8, // right-2 = 8px
    alignItems: 'center',
    transform: [{ rotate: '180deg' }],
  },
  rankText: {
    fontWeight: 'bold',
    lineHeight: 14,
  },
  suitTextSmall: {
    fontSize: 14,
    lineHeight: 14,
  },
  centerArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerSuit: {
    // Large center suit symbol
  },
  countBadge: {
    position: 'absolute',
    top: -8, // -top-2 = -8px (matching card-arch-designer)
    right: -8, // -right-2 = -8px (matching card-arch-designer)
    width: 28, // w-7 = 28px (matching card-arch-designer)
    height: 28, // h-7 = 28px (matching card-arch-designer)
    minWidth: 28, // Prevent shrinking
    minHeight: 28, // Prevent shrinking
    maxWidth: 28, // Prevent expansion
    maxHeight: 28, // Prevent expansion
    borderRadius: 9999, // Use very large value to ensure perfect circle in React Native
    backgroundColor: colors.primary, // bg-primary (matching card-arch-designer)
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden', // Ensure content stays within circular bounds
    // Gold glow effect (matching card-arch-designer gold-glow: box-shadow: 0 0 20px hsl(var(--gold) / 0.4))
    shadowColor: colors.gold,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 8,
  },
  countText: {
    color: colors.primaryForeground, // text-primary-foreground (matching card-arch-designer)
    fontSize: 12, // text-xs = 12px (matching card-arch-designer)
    fontWeight: 'bold', // font-bold (matching card-arch-designer)
    textAlign: 'center',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
});

export default CardView;
