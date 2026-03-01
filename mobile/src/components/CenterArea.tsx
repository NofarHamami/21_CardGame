import React, { useState, useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, useWindowDimensions } from 'react-native';
import { Card, CenterPile, peekPile, getExpectedNextRank, isPileComplete, pileSize, canPlaceOnPile } from '../models';
import CardView from './CardView';
import { SelectedCard } from '../hooks/useGameEngine';
import { colors } from '../theme/colors';
import { CARD_DIMENSIONS } from '../constants';
import { loadLanguagePreference } from '../utils/storage';
import { logger } from '../utils/logger';

export interface CenterAreaRef {
  getPileIndexAtPoint: (pageX: number, pageY: number) => number | null;
}

type Language = 'he' | 'en';

const translations = {
  he: {
    turn: 'התור של',
    played: 'שיחק',
    centerPiles: 'ערימות מרכזיות (A → Q)',
    stock: 'חפיסה',
    hint: 'הקש על ערימה לשחק או על אחסון לאחסן',
    done: 'הושלם!',
    aiPlaying: 'המחשב משחק...',
  },
  en: {
    turn: "'s Turn",
    played: 'Played',
    centerPiles: 'Center Piles (A → Q)',
    stock: 'Stock',
    hint: 'Tap a pile to play or storage to store',
    done: 'Done!',
    aiPlaying: 'AI is playing...',
  },
};

interface PileLayout {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface CenterAreaProps {
  centerPiles: CenterPile[];
  stockPileSize: number;
  selectedCard: SelectedCard | null;
  onPlayToCenter: (pileIndex: number) => void;
  currentPlayerName: string;
  cardsPlayedThisTurn: number;
  stockRef?: React.RefObject<View | null>;
  isAITurn?: boolean;
  completedPileIndex?: number | null;
  onPileLayout?: (index: number, layout: PileLayout) => void;
  draggingCard?: Card | null;
  invalidPileIndex?: number | null;
  invalidPileKey?: number;
  turnTimeRemaining?: number | null;
}

export function CenterArea({
  centerPiles,
  stockPileSize,
  selectedCard,
  onPlayToCenter,
  currentPlayerName,
  cardsPlayedThisTurn,
  stockRef,
  isAITurn = false,
  completedPileIndex = null,
  onPileLayout,
  draggingCard = null,
  invalidPileIndex = null,
  invalidPileKey = 0,
  turnTimeRemaining = null,
}: CenterAreaProps) {
  const [language, setLanguage] = useState<Language>('he');

  useEffect(() => {
    loadLanguagePreference().then(lang => setLanguage(lang));
  }, []);

  const t = translations[language];

  const { width: screenWidth } = useWindowDimensions();

  const isSmallScreen = screenWidth < 375;
  const isLargeScreen = screenWidth >= 768;
  const styles = React.useMemo(() => createStyles(isSmallScreen, isLargeScreen), [isSmallScreen, isLargeScreen]);

  const pulseAnim = React.useRef(new Animated.Value(0.4)).current;
  const activeCard = selectedCard?.card || draggingCard;
  const hasValidTargets = React.useMemo(() => {
    if (!activeCard) return false;
    return centerPiles.some((pile) => !isPileComplete(pile) && canPlaceOnPile(pile, activeCard));
  }, [activeCard, centerPiles]);

  React.useEffect(() => {
    if (hasValidTargets) {
      const animation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 0.4, duration: 700, useNativeDriver: true }),
        ])
      );
      animation.start();
      return () => animation.stop();
    } else {
      pulseAnim.setValue(0.4);
    }
  }, [hasValidTargets, pulseAnim]);

  const pileViewRefs = React.useRef<(View | null)[]>([]);

  const measurePile = React.useCallback((index: number) => {
    if (!onPileLayout) return;
    const ref = pileViewRefs.current[index];
    if (ref) {
      ref.measureInWindow((x: number, y: number, width: number, height: number) => {
        onPileLayout(index, { x, y, width, height });
      });
    }
  }, [onPileLayout]);

  const celebrateScale = React.useRef(new Animated.Value(0)).current;
  const celebrateOpacity = React.useRef(new Animated.Value(0)).current;
  const [celebratingPile, setCelebratingPile] = React.useState<number | null>(null);
  const lastCelebratedRef = React.useRef<number | null>(null);

  const pileShakeAnims = React.useRef(
    Array.from({ length: 4 }, () => new Animated.Value(0))
  ).current;

  React.useEffect(() => {
    if (invalidPileIndex != null && invalidPileIndex >= 0 && invalidPileIndex < pileShakeAnims.length) {
      const anim = pileShakeAnims[invalidPileIndex];
      anim.setValue(0);
      Animated.sequence([
        Animated.timing(anim, { toValue: 8, duration: 50, useNativeDriver: true }),
        Animated.timing(anim, { toValue: -8, duration: 50, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 6, duration: 40, useNativeDriver: true }),
        Animated.timing(anim, { toValue: -6, duration: 40, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 3, duration: 30, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration: 30, useNativeDriver: true }),
      ]).start();
    }
  }, [invalidPileIndex, invalidPileKey, pileShakeAnims]);

  React.useEffect(() => {
    if (completedPileIndex != null && completedPileIndex !== lastCelebratedRef.current) {
      lastCelebratedRef.current = completedPileIndex;
      setCelebratingPile(completedPileIndex);
      celebrateScale.setValue(0.3);
      celebrateOpacity.setValue(1);
      Animated.parallel([
        Animated.timing(celebrateScale, { toValue: 3, duration: 800, useNativeDriver: true }),
        Animated.timing(celebrateOpacity, { toValue: 0, duration: 800, useNativeDriver: true }),
      ]).start(() => setCelebratingPile(null));
    }
    if (completedPileIndex == null) {
      lastCelebratedRef.current = null;
    }
  }, [completedPileIndex, celebrateScale, celebrateOpacity]);

  return (
    <View style={styles.container}>
      {/* Turn indicator */}
      <Text
        style={styles.turnText}
        accessibilityRole="text"
        accessibilityLabel={`${currentPlayerName}'s turn${cardsPlayedThisTurn > 0 ? `, ${cardsPlayedThisTurn} cards played` : ''}`}
      >
        {language === 'he' ? `${t.turn} ${currentPlayerName}` : `${currentPlayerName}${t.turn}`}
        {cardsPlayedThisTurn > 0 && ` • ${t.played}: ${cardsPlayedThisTurn}`}
      </Text>

      {turnTimeRemaining != null && (
        <View style={[styles.timerContainer, turnTimeRemaining <= 5 && styles.timerContainerUrgent]}>
          <Text style={[styles.timerText, turnTimeRemaining <= 5 && styles.timerTextUrgent]}>
            {turnTimeRemaining}s
          </Text>
        </View>
      )}

      {isAITurn && (
        <Text style={styles.aiLabel}>{t.aiPlaying}</Text>
      )}

      {/* Center piles and stock */}
      <View style={styles.centerRow}>
        <View style={styles.pilesSection} accessibilityLabel={language === 'he' ? 'ערימות מרכזיות' : 'Center piles'}>
          <Text style={styles.sectionLabel} accessibilityRole="text">{t.centerPiles}</Text>
          <View style={styles.pilesRow}>
            {centerPiles.map((pile, index) => {
              const topCard = peekPile(pile);
              const expectedRank = getExpectedNextRank(pile);
              const isComplete = isPileComplete(pile);
              const cardCount = pileSize(pile);
              const canPlay = (selectedCard || draggingCard) && !isComplete;

              const isValidTarget = activeCard && !isComplete && canPlaceOnPile(pile, activeCard);

              const shakeTranslate = index < pileShakeAnims.length ? pileShakeAnims[index] : undefined;
              const isShaking = invalidPileIndex === index;

              return (
                <View
                  key={`pile-${index}`}
                  nativeID={`center-pile-${index}`}
                  ref={el => { pileViewRefs.current[index] = el; }}
                  onLayout={() => measurePile(index)}
                  collapsable={false}
                  pointerEvents="box-none"
                >
                <Animated.View
                  style={shakeTranslate ? { transform: [{ translateX: shakeTranslate }] } : undefined}
                >
                  <TouchableOpacity
                    style={[styles.pileSlot, isValidTarget && styles.validTargetPile, isShaking && styles.invalidTargetPile]}
                    onPress={() => {
                      logger.debug('CenterArea: Pile clicked', index);
                      onPlayToCenter(index);
                    }}
                    disabled={!selectedCard || isComplete}
                    activeOpacity={0.8}
                    accessibilityRole="button"
                    accessibilityLabel={`Pile ${index + 1}, needs ${expectedRank}`}
                    accessibilityState={{ disabled: !canPlay }}
                  >
                    {isValidTarget && (
                      <Animated.View
                        style={[styles.validTargetGlow, { opacity: pulseAnim }]}
                        pointerEvents="none"
                      />
                    )}
                    {celebratingPile === index && (
                      <View style={styles.celebrationContainer} pointerEvents="none">
                        <Animated.View
                          style={[styles.celebrationBurst, {
                            transform: [{ scale: celebrateScale }],
                            opacity: celebrateOpacity,
                          }]}
                        />
                        <Animated.View
                          style={[styles.celebrationRing, {
                            transform: [{ scale: celebrateScale }],
                            opacity: celebrateOpacity,
                          }]}
                        />
                      </View>
                    )}
                    {topCard ? (
                      <View pointerEvents="none">
                        <CardView
                          card={topCard}
                          disabled={true}
                          showCount={cardCount > 1 ? cardCount : undefined}
                        />
                      </View>
                    ) : (
                      <View style={[styles.emptyPile, canPlay && styles.emptyPileHighlight, isValidTarget && styles.validTargetEmpty]}>
                        <Text style={styles.emptyPileText}>A</Text>
                      </View>
                    )}
                    <Text style={[styles.pileLabel, isComplete && styles.completePileLabel]}>
                      {isComplete ? t.done : `→${expectedRank}`}
                    </Text>
                  </TouchableOpacity>
                </Animated.View>
                </View>
              );
            })}
          </View>
        </View>

        {/* Stock Deck */}
        <View
          ref={stockRef}
          style={styles.stockSection}
          accessibilityLabel={`Stock pile with ${stockPileSize} cards`}
        >
          <Text style={styles.stockLabel} accessibilityRole="text">{t.stock}</Text>
          <CardView
            card={null}
            faceDown={stockPileSize > 0}
            showCount={stockPileSize}
            disabled={true}
          />
        </View>
      </View>

      {/* Hint */}
      {selectedCard && !isAITurn && (
        <View style={styles.hint} accessibilityRole="alert" accessibilityLiveRegion="polite">
          <Text style={styles.hintText} accessibilityRole="text">{t.hint}</Text>
        </View>
      )}
    </View>
  );
}

const createStyles = (isSmallScreen: boolean, isLargeScreen: boolean) => StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  turnText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.accent,
    marginBottom: 4,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
    textAlign: 'center',
  },
  timerContainer: {
    backgroundColor: colors.secondary,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.gold,
    alignSelf: 'center',
    marginBottom: 6,
  },
  timerContainerUrgent: {
    backgroundColor: colors.destructive,
    borderColor: colors.destructive,
  },
  timerText: {
    color: colors.gold,
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  timerTextUrgent: {
    color: colors.primaryForeground,
  },
  aiLabel: {
    fontSize: 11,
    color: colors.mutedForeground,
    marginBottom: 4,
    fontStyle: 'italic',
  },
  centerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: isSmallScreen ? 8 : isLargeScreen ? 24 : 12,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  pilesSection: {
    alignItems: 'center',
    flexShrink: 1,
    minWidth: 0,
  },
  sectionLabel: {
    color: colors.mutedForeground,
    fontSize: 11,
    marginBottom: 6,
    fontWeight: '500',
  },
  pilesRow: {
    flexDirection: 'row',
    gap: isSmallScreen ? 3 : isLargeScreen ? 8 : 4,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  pileSlot: {
    alignItems: 'center',
  },
  validTargetPile: {
    borderRadius: 10,
    shadowColor: colors.gold,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 6,
  },
  invalidTargetPile: {
    borderRadius: 10,
    shadowColor: colors.destructive,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 8,
  },
  validTargetGlow: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.gold,
    backgroundColor: `${colors.gold}15`,
  },
  celebrationContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'visible',
    zIndex: 100,
  },
  celebrationBurst: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.gold,
  },
  celebrationRing: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: colors.goldLight,
    backgroundColor: 'transparent',
  },
  emptyPile: {
    width: CARD_DIMENSIONS.WIDTH,
    height: CARD_DIMENSIONS.HEIGHT,
    backgroundColor: `${colors.muted}33`,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: `${colors.mutedForeground}4D`,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyPileHighlight: {
    borderColor: colors.gold,
    backgroundColor: `${colors.muted}4D`,
  },
  validTargetEmpty: {
    borderColor: colors.gold,
    borderWidth: 3,
    borderStyle: 'solid',
    backgroundColor: `${colors.gold}1A`,
  },
  emptyPileText: {
    fontSize: 24,
    color: `${colors.mutedForeground}80`,
    fontWeight: 'bold',
  },
  pileLabel: {
    fontSize: 10,
    color: colors.mutedForeground,
    marginTop: 4,
  },
  completePileLabel: {
    color: colors.accent,
    fontWeight: 'bold',
  },
  stockLabel: {
    color: colors.mutedForeground,
    fontSize: 11,
    marginBottom: 6,
    fontWeight: '500',
  },
  stockSection: {
    alignItems: 'center',
  },
  hint: {
    backgroundColor: colors.accent,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 12,
    borderWidth: 1,
    borderColor: colors.goldLight,
  },
  hintText: {
    color: colors.primaryForeground,
    fontSize: 12,
    fontWeight: '500',
  },
});

export default CenterArea;
