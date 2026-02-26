import React, { useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ViewStyle,
  Animated,
  PanResponder,
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
  draggable?: boolean;
  onDragStart?: () => void;
  onDragEnd?: (dx: number, dy: number, moveX: number, moveY: number) => void;
}

export const CardView = React.memo(function CardView({
  card,
  faceDown = false,
  selected = false,
  disabled = false,
  compact = false,
  onPress,
  style,
  showCount,
  draggable = false,
  onDragStart,
  onDragEnd,
}: CardViewProps) {
  const isRed = card ? isCardRed(card) : false;
  const cardColor = isRed ? colors.cardRed : colors.cardBlack;

  const width = compact ? CARD_DIMENSIONS.COMPACT_WIDTH : CARD_DIMENSIONS.WIDTH;
  const height = compact ? CARD_DIMENSIONS.COMPACT_HEIGHT : CARD_DIMENSIONS.HEIGHT;
  const fontSize = compact ? FONT_SIZES.CARD_COMPACT : FONT_SIZES.CARD_DEFAULT;
  const centerSize = compact ? 24 : 36;

  const pan = useRef(new Animated.ValueXY()).current;
  const isDragging = useRef(false);
  const onDragEndRef = useRef(onDragEnd);
  const onDragStartRef = useRef(onDragStart);
  const onPressRef = useRef(onPress);
  const draggableRef = useRef(draggable);
  const disabledRef = useRef(disabled);
  onDragEndRef.current = onDragEnd;
  onDragStartRef.current = onDragStart;
  onPressRef.current = onPress;
  draggableRef.current = draggable;
  disabledRef.current = disabled;

  const DRAG_THRESHOLD = 8;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !!draggableRef.current && !disabledRef.current,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return !!draggableRef.current && !disabledRef.current &&
          (Math.abs(gestureState.dx) > DRAG_THRESHOLD || Math.abs(gestureState.dy) > DRAG_THRESHOLD);
      },
      onPanResponderGrant: () => {
        isDragging.current = false;
        pan.setOffset({ x: (pan.x as any)._value || 0, y: (pan.y as any)._value || 0 });
        pan.setValue({ x: 0, y: 0 });
      },
      onPanResponderTerminationRequest: () => false,
      onPanResponderMove: (_, gestureState) => {
        if (!isDragging.current &&
            (Math.abs(gestureState.dx) > DRAG_THRESHOLD || Math.abs(gestureState.dy) > DRAG_THRESHOLD)) {
          isDragging.current = true;
          onDragStartRef.current?.();
        }
        if (isDragging.current) {
          pan.setValue({ x: gestureState.dx, y: gestureState.dy });
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        pan.flattenOffset();
        if (!isDragging.current) {
          onPressRef.current?.();
        } else {
          if (onDragEndRef.current) {
            onDragEndRef.current(gestureState.dx, gestureState.dy, gestureState.moveX, gestureState.moveY);
          }
          Animated.spring(pan, {
            toValue: { x: 0, y: 0 },
            useNativeDriver: false,
          }).start();
        }
        isDragging.current = false;
      },
      onPanResponderTerminate: (_, gestureState) => {
        pan.flattenOffset();
        if (isDragging.current && onDragEndRef.current) {
          onDragEndRef.current(gestureState.dx, gestureState.dy, gestureState.moveX, gestureState.moveY);
        }
        Animated.spring(pan, {
          toValue: { x: 0, y: 0 },
          useNativeDriver: false,
        }).start();
        isDragging.current = false;
      },
    })
  ).current;

  // Empty slot
  if (!card && !faceDown) {
    const isInteractive = !disabled && !!onPress;
    return (
      <TouchableOpacity
        style={[styles.card, { width, height }, styles.emptyCard, selected && styles.selectedCard, style]}
        onPress={onPress}
        disabled={disabled || !onPress}
        activeOpacity={0.7}
        accessibilityRole={isInteractive ? 'button' : undefined}
        accessibilityLabel="Empty card slot"
        accessibilityHint={onPress ? 'Press to place a card here' : undefined}
        accessibilityState={{ disabled: disabled || !onPress }}
      />
    );
  }

  // Face down card
  if (faceDown) {
    const cardLabel = showCount ? `${showCount} face down cards` : 'Face down card';
    const isInteractive = !disabled && !!onPress;

    const hslToHex = (h: number, s: number, l: number): string => {
      l /= 100;
      const a = (s * Math.min(l, 1 - l)) / 100;
      const f = (n: number) => {
        const k = (n + h / 30) % 12;
        const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
        return Math.round(255 * color).toString(16).padStart(2, '0');
      };
      return `#${f(0)}${f(8)}${f(4)}`;
    };

    const gradientColors = [colors.secondary, hslToHex(145, 40, 20), hslToHex(145, 50, 12)] as const;

    return (
      <TouchableOpacity
        style={[styles.card, { width, height }, selected && styles.selectedCard, style]}
        onPress={onPress}
        disabled={disabled || !onPress}
        activeOpacity={0.7}
        accessibilityRole={isInteractive ? 'button' : undefined}
        accessibilityLabel={cardLabel}
        accessibilityState={{ disabled: disabled || !onPress, selected }}
      >
        <LinearGradient
          colors={gradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.faceDownCard, { width, height }]}
        >
          <View style={styles.faceDownBorder} />
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

  // Face up card
  const rankSymbol = getRankSymbol(card!.rank);
  const suitSymbol = getSuitSymbol(card!.suit);
  const cardLabel = `${rankSymbol} of ${suitSymbol}${showCount ? `, ${showCount} cards` : ''}`;
  const isInteractive = !disabled && !!onPress;

  // Wrap in Animated.View for drag support - taps go through TouchableOpacity normally
  if (draggable && !disabled) {
    return (
      <Animated.View
        style={[{ transform: pan.getTranslateTransform() }, selected && { zIndex: 100 }]}
        {...panResponder.panHandlers}
      >
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
          accessibilityRole={isInteractive ? 'button' : undefined}
          accessibilityLabel={cardLabel}
          accessibilityState={{ disabled: disabled || !onPress, selected }}
        >
          <View style={styles.cornerTop}>
            <Text style={[styles.rankText, { color: cardColor, fontSize }]}>{rankSymbol}</Text>
            <Text style={[styles.suitTextSmall, { color: cardColor }]}>{suitSymbol}</Text>
          </View>
          <View style={styles.centerArea}>
            <Text style={[styles.centerSuit, { color: cardColor, fontSize: centerSize }]}>{suitSymbol}</Text>
          </View>
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
      </Animated.View>
    );
  }

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
      accessibilityRole={isInteractive ? 'button' : undefined}
      accessibilityLabel={cardLabel}
      accessibilityState={{ disabled: disabled || !onPress, selected }}
    >
      <View style={styles.cornerTop}>
        <Text style={[styles.rankText, { color: cardColor, fontSize }]}>{rankSymbol}</Text>
        <Text style={[styles.suitTextSmall, { color: cardColor }]}>{suitSymbol}</Text>
      </View>
      <View style={styles.centerArea}>
        <Text style={[styles.centerSuit, { color: cardColor, fontSize: centerSize }]}>{suitSymbol}</Text>
      </View>
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
});

const styles = StyleSheet.create({
  card: {
    borderRadius: 8,
    overflow: 'visible',
  },
  faceUpCard: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
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
    backgroundColor: `${colors.muted}33`,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: `${colors.mutedForeground}33`,
  },
  faceDownCard: {
    borderRadius: 8,
    borderWidth: 2,
    borderColor: colors.secondary,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  faceDownBorder: {
    position: 'absolute',
    top: 8,
    left: 8,
    right: 8,
    bottom: 8,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: `${colors.mutedForeground}4D`,
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
    width: 48,
    height: 64,
    alignSelf: 'center',
    borderRadius: 4,
    backgroundColor: `${colors.secondary}4D`,
    borderWidth: 1,
    borderColor: `${colors.mutedForeground}4D`,
  },
  faceDownStar: {
    fontSize: 24,
    color: `${colors.mutedForeground}99`,
  },
  cornerTop: {
    position: 'absolute',
    top: 6,
    left: 8,
    alignItems: 'center',
  },
  cornerBottom: {
    position: 'absolute',
    bottom: 6,
    right: 8,
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
  centerSuit: {},
  countBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    width: 28,
    height: 28,
    minWidth: 28,
    minHeight: 28,
    maxWidth: 28,
    maxHeight: 28,
    borderRadius: 9999,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    shadowColor: colors.gold,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 8,
  },
  countText: {
    color: colors.primaryForeground,
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
});

export default CardView;
