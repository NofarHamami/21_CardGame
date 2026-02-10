import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { CenterPile, peekPile, getExpectedNextRank, isPileComplete, pileSize } from '../models';
import CardView from './CardView';
import { SelectedCard } from '../hooks/useGameEngine';
import { colors } from '../theme/colors';
import { loadLanguagePreference } from '../utils/storage';

type Language = 'he' | 'en';

const translations = {
  he: {
    turn: 'התור של',
    played: 'שיחק',
    centerPiles: 'ערימות מרכזיות (A → Q)',
    stock: 'חפיסה',
    hint: 'הקש על ערימה לשחק או על אחסון לאחסן',
    done: 'הושלם!',
  },
  en: {
    turn: "'s Turn",
    played: 'Played',
    centerPiles: 'Center Piles (A → Q)',
    stock: 'Stock',
    hint: 'Tap a pile to play or storage to store',
    done: 'Done!',
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
}

/**
 * Center area - 4 piles in a row + stock deck
 */
export function CenterArea({
  centerPiles,
  stockPileSize,
  selectedCard,
  onPlayToCenter,
  currentPlayerName,
  cardsPlayedThisTurn,
  stockRef,
}: CenterAreaProps) {
  const [language, setLanguage] = useState<Language>('he');

  useEffect(() => {
    loadLanguagePreference().then(lang => {
      setLanguage(lang);
    });
  }, []);

  const t = translations[language];

  // Get screen width inside component (after React Native is initialized)
  const screenWidth = React.useMemo(() => {
    try {
      return Dimensions.get('window').width;
    } catch (e) {
      return 800; // Fallback for web
    }
  }, []);
  
  const isSmallScreen = screenWidth < 375;
  const isLargeScreen = screenWidth >= 768;
  
  // Create styles dynamically
  const styles = React.useMemo(() => createStyles(isSmallScreen, isLargeScreen), [isSmallScreen, isLargeScreen]);
  
  return (
    <View style={styles.container}>
      {/* Turn indicator */}
      <Text
        style={styles.turnText}
        accessibilityRole="text"
        accessibilityLabel={language === 'he' 
          ? `התור של ${currentPlayerName}${cardsPlayedThisTurn > 0 ? `, שיחק ${cardsPlayedThisTurn} קלפים` : ''}`
          : `${currentPlayerName}'s turn${cardsPlayedThisTurn > 0 ? `, ${cardsPlayedThisTurn} cards played` : ''}`}
      >
        {language === 'he' ? `${t.turn} ${currentPlayerName}` : `${currentPlayerName}${t.turn}`}
        {cardsPlayedThisTurn > 0 && ` • ${t.played}: ${cardsPlayedThisTurn}`}
      </Text>

      {/* Center piles and stock in one row */}
      <View style={styles.centerRow}>
        {/* 4 Center Piles */}
        <View style={styles.pilesSection} accessibilityLabel={language === 'he' ? 'ערימות מרכזיות' : 'Center piles'}>
          <Text style={styles.sectionLabel} accessibilityRole="text">{t.centerPiles}</Text>
          <View style={styles.pilesRow}>
            {centerPiles.map((pile, index) => {
              const topCard = peekPile(pile);
              const expectedRank = getExpectedNextRank(pile);
              const isComplete = isPileComplete(pile);
              const cardCount = pileSize(pile);
              const canPlay = selectedCard && !isComplete;
              const pileLabel = isComplete
                ? `Pile ${index + 1}, complete`
                : `Pile ${index + 1}, needs ${expectedRank}${topCard ? `, ${cardCount} cards` : ', empty'}`;
              const accessibilityHint = canPlay
                ? `Press to play selected card to pile ${index + 1}`
                : !selectedCard
                ? 'Select a card first'
                : 'This pile is complete';

              return (
                <TouchableOpacity
                  key={`pile-${index}`}
                  style={styles.pileSlot}
                  onPress={() => {
                    console.log('CenterArea: Pile clicked - index:', index, 'selectedCard:', selectedCard?.card?.rank, 'isComplete:', isComplete, 'canPlay:', canPlay);
                    onPlayToCenter(index);
                  }}
                  disabled={!selectedCard || isComplete}
                  activeOpacity={0.8}
                  accessibilityRole="button"
                  accessibilityLabel={pileLabel}
                  accessibilityHint={accessibilityHint}
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
                    <View style={[styles.emptyPile, canPlay && styles.emptyPileHighlight]}>
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
          accessibilityLabel={language === 'he' ? `חפיסה עם ${stockPileSize} קלפים` : `Stock pile with ${stockPileSize} cards`}
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
      {selectedCard && (
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
    color: colors.accent, // Gold text
    marginBottom: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
    textAlign: 'center',
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
  emptyPile: {
    width: 80, // Match card width
    height: 112, // Match card height
    backgroundColor: `${colors.muted}33`, // Muted background
    borderRadius: 8,
    borderWidth: 2,
    borderColor: `${colors.mutedForeground}4D`, // 30% opacity
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyPileHighlight: {
    borderColor: colors.gold,
    backgroundColor: `${colors.muted}4D`, // Slightly more visible
  },
  emptyPileText: {
    fontSize: 24,
    color: `${colors.mutedForeground}80`, // 50% opacity
    fontWeight: 'bold',
  },
  pileLabel: {
    fontSize: 10,
    color: colors.mutedForeground,
    marginTop: 4,
  },
  completePileLabel: {
    color: colors.accent, // Gold for completed
    fontWeight: 'bold',
  },
  stockSection: {
    alignItems: 'center',
  },
  stockLabel: {
    fontSize: 10,
    color: colors.mutedForeground,
    marginTop: 4,
    fontWeight: '500',
  },
  hint: {
    backgroundColor: colors.accent, // Gold hint box
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
