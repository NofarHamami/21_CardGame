import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Player, Card, CardSource, getStorageTop, getStorageStack, STORAGE_STACKS } from '../models';
import CardView from './CardView';
import { SelectedCard } from '../hooks/useGameEngine';
import { colors } from '../theme/colors';
import { SPACING, FONT_SIZES, CARD_DIMENSIONS } from '../constants';
import { loadLanguagePreference } from '../utils/storage';

type Language = 'he' | 'en';

const translations = {
  he: {
    storage: 'אחסון',
  },
  en: {
    storage: 'storage',
  },
};

interface StorageViewProps {
  player: Player;
  isCurrentPlayer: boolean;
  selectedCard: SelectedCard | null;
  onSelectCard: (card: Card, source: CardSource, sourceIndex: number) => void;
  onPlayToStorage: (storageIndex: number) => void;
  isCardSelected: (source: CardSource, index: number) => boolean;
  compact?: boolean;
  horizontal?: boolean;
  language?: Language;
  onCardDragEnd?: (card: Card, source: CardSource, sourceIndex: number, dx: number, dy: number, moveX: number, moveY: number) => void;
}

/**
 * Storage view component that displays storage stacks
 */
export const StorageView = React.memo(function StorageView({
  player,
  isCurrentPlayer,
  selectedCard,
  onSelectCard,
  onPlayToStorage,
  isCardSelected,
  compact = false,
  horizontal = true,
  language: propLanguage,
  onCardDragEnd,
}: StorageViewProps) {
  const [language, setLanguage] = useState<Language>(propLanguage || 'he');
  const [draggingIndex, setDraggingIndex] = React.useState<number | null>(null);

  useEffect(() => {
    if (propLanguage) {
      setLanguage(propLanguage);
    } else {
      loadLanguagePreference().then(lang => {
        setLanguage(lang);
      });
    }
  }, [propLanguage]);

  const t = translations[language];

  const showTargetHighlight = isCurrentPlayer && !!selectedCard && selectedCard.source === CardSource.HAND;

  const handleStoragePress = (index: number) => {
    if (!isCurrentPlayer) return;
    const topCard = getStorageTop(player, index);

    if (selectedCard && selectedCard.source === CardSource.HAND) {
      onPlayToStorage(index);
    } else if (topCard) {
      onSelectCard(topCard, CardSource.STORAGE, index);
    }
  };

  const containerStyle = horizontal ? styles.horizontalStorageRow : styles.verticalStorageSlotsColumn;
  const labelStyle = horizontal ? styles.horizontalLabel : styles.verticalLabel;

  const cardHeight = compact ? CARD_DIMENSIONS.COMPACT_HEIGHT : CARD_DIMENSIONS.HEIGHT;
  const stackOffset = compact ? 16 : 20;

  return (
    <View style={styles.container} accessibilityLabel={language === 'he' ? `אזור אחסון עם ${STORAGE_STACKS} מקומות` : `Storage area with ${STORAGE_STACKS} slots`}>
      <View style={containerStyle}>
        {Array.from({ length: STORAGE_STACKS }).map((_, index) => {
          const topCard = getStorageTop(player, index);
          const stackCards = getStorageStack(player, index);
          const stackSize = stackCards.length;
          const isDraggable = isCurrentPlayer && !!topCard && !!onCardDragEnd;
          const stackHeight = stackSize > 0 ? cardHeight + (stackSize - 1) * stackOffset : cardHeight;

          return (
            <View
              key={`storage-${index}`}
              nativeID={`storage-slot-${index}`}
              style={[
                showTargetHighlight && styles.storageHighlight,
                { height: stackHeight },
              ]}
            >
              {stackSize === 0 ? (
                <CardView
                  card={null}
                  compact={compact}
                  onPress={isCurrentPlayer ? () => handleStoragePress(index) : undefined}
                />
              ) : (
                stackCards.map((card, cardIdx) => {
                  const isTop = cardIdx === stackSize - 1;
                  return (
                    <View
                      key={`storage-${index}-${cardIdx}`}
                      style={{
                        position: cardIdx === 0 ? 'relative' : 'absolute',
                        top: cardIdx * stackOffset,
                        zIndex: cardIdx,
                      }}
                      pointerEvents={isTop ? 'auto' : 'none'}
                    >
                      <CardView
                        card={card}
                        selected={isTop && isCurrentPlayer && isCardSelected(CardSource.STORAGE, index)}
                        onPress={isTop && isCurrentPlayer ? () => handleStoragePress(index) : undefined}
                        compact={compact}
                        disabled={!isTop}
                        draggable={isTop && isDraggable}
                        onDragStart={isTop ? () => setDraggingIndex(index) : undefined}
                        onDragEnd={isTop && onCardDragEnd && topCard ? (dx: number, dy: number, moveX: number, moveY: number) => {
                          setDraggingIndex(null);
                          onCardDragEnd(topCard, CardSource.STORAGE, index, dx, dy, moveX, moveY);
                        } : undefined}
                      />
                    </View>
                  );
                })
              )}
            </View>
          );
        })}
      </View>
      <Text style={labelStyle} accessibilityRole="text">{t.storage}</Text>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    zIndex: 1, // Ensure storage is above the mainRow's stacking context
  },
  storageHighlight: {
    borderRadius: 10,
    borderWidth: 2,
    borderColor: `${colors.gold}80`,
    shadowColor: colors.gold,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
    elevation: 4,
  },
  horizontalStorageRow: {
    flexDirection: 'row',
    gap: SPACING.GAP_SMALL,
    flexWrap: 'nowrap',
    justifyContent: 'center',
    maxWidth: '100%',
  },
  verticalStorageSlotsColumn: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: SPACING.GAP_SMALL,
    marginBottom: 4,
  },
  horizontalLabel: {
    color: colors.mutedForeground,
    fontSize: FONT_SIZES.LABEL_DEFAULT,
    marginTop: 4,
    fontWeight: '500',
  },
  verticalLabel: {
    color: colors.mutedForeground,
    fontSize: FONT_SIZES.LABEL_SMALL,
    marginTop: 4,
  },
});
