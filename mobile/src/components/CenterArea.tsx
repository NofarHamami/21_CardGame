import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, Animated } from 'react-native';
import { CenterPile, peekPile, getExpectedNextRank, isPileComplete, pileSize, canPlaceOnPile } from '../models';
import CardView from './CardView';
import { SelectedCard } from '../hooks/useGameEngine';
import { colors } from '../theme/colors';
import { loadLanguagePreference } from '../utils/storage';
import { logger } from '../utils/logger';

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

interface CenterAreaProps {
  centerPiles: CenterPile[];
  stockPileSize: number;
  selectedCard: SelectedCard | null;
  onPlayToCenter: (pileIndex: number) => void;
  currentPlayerName: string;
  cardsPlayedThisTurn: number;
  stockRef?: React.RefObject<View | null>;
  isAITurn?: boolean;
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
}: CenterAreaProps) {
  const [language, setLanguage] = useState<Language>('he');

  useEffect(() => {
    loadLanguagePreference().then(lang => setLanguage(lang));
  }, []);

  const t = translations[language];

  const screenWidth = React.useMemo(() => {
    try { return Dimensions.get('window').width; } catch { return 800; }
  }, []);

  const isSmallScreen = screenWidth < 375;
  const isLargeScreen = screenWidth >= 768;
  const styles = React.useMemo(() => createStyles(isSmallScreen, isLargeScreen), [isSmallScreen, isLargeScreen]);

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
              const canPlay = selectedCard && !isComplete;

              // Valid move hint: highlight piles where selected card can be placed
              const isValidTarget = selectedCard && !isComplete && canPlaceOnPile(pile, selectedCard.card);

              return (
                <TouchableOpacity
                  key={`pile-${index}`}
                  style={[styles.pileSlot, isValidTarget && styles.validTargetPile]}
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
                  {topCard ? (
                    <View pointerEvents="none">
                      <CardView
                        card={topCard}
                        disabled={true}
                        showCount={cardCount > 1 ? cardCount : undefined}
                        compact={true}
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
          <Text style={styles.sectionLabel} accessibilityRole="text">{t.stock}</Text>
          <CardView
            card={null}
            faceDown={stockPileSize > 0}
            showCount={stockPileSize}
            disabled={true}
            compact={true}
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
    marginBottom: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
    textAlign: 'center',
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
  emptyPile: {
    width: 80,
    height: 112,
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
