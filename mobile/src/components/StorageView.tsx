import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Player, Card, CardSource, getStorageTop, getStorageStackSize, STORAGE_STACKS } from '../models';
import CardView from './CardView';
import { SelectedCard } from '../hooks/useGameEngine';
import { colors } from '../theme/colors';
import { SPACING, FONT_SIZES } from '../constants';
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
}

/**
 * Storage view component that displays storage stacks
 */
export function StorageView({
  player,
  isCurrentPlayer,
  selectedCard,
  onSelectCard,
  onPlayToStorage,
  isCardSelected,
  compact = false,
  horizontal = true,
  language: propLanguage,
}: StorageViewProps) {
  const [language, setLanguage] = useState<Language>(propLanguage || 'he');

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

  const handleStoragePress = (index: number) => {
    if (!isCurrentPlayer) return;
    if (selectedCard) {
      onPlayToStorage(index);
    } else {
      const topCard = getStorageTop(player, index);
      if (topCard) {
        onSelectCard(topCard, CardSource.STORAGE, index);
      }
    }
  };

  const containerStyle = horizontal ? styles.horizontalStorageRow : styles.verticalStorageSlotsColumn;
  const labelStyle = horizontal ? styles.horizontalLabel : styles.verticalLabel;

  return (
    <View style={styles.container} accessibilityLabel={language === 'he' ? `אזור אחסון עם ${STORAGE_STACKS} מקומות` : `Storage area with ${STORAGE_STACKS} slots`}>
      <View style={containerStyle}>
        {Array.from({ length: STORAGE_STACKS }).map((_, index) => {
          const topCard = getStorageTop(player, index);
          const stackSize = getStorageStackSize(player, index);
          return (
            <CardView
              key={`storage-${index}`}
              card={topCard}
              selected={isCurrentPlayer && isCardSelected(CardSource.STORAGE, index)}
              onPress={isCurrentPlayer ? () => handleStoragePress(index) : undefined}
              showCount={stackSize > 1 ? stackSize : undefined}
              compact={compact}
            />
          );
        })}
      </View>
      <Text style={labelStyle} accessibilityRole="text">{t.storage}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  horizontalStorageRow: {
    flexDirection: 'row',
    gap: SPACING.GAP_SMALL,
    flexWrap: 'wrap',
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
