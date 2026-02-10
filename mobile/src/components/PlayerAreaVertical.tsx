import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Player, Card, CardSource, getPersonalPileTop, getPersonalPileSize } from '../models';
import CardView from './CardView';
import { SelectedCard } from '../hooks/useGameEngine';
import PlayerAvatar from './PlayerAvatar';
import { HandView } from './HandView';
import { StorageView } from './StorageView';
import { colors } from '../theme/colors';
import {
  SPACING,
  FONT_SIZES,
  AVATAR_SIZES,
  Z_INDEX,
} from '../constants';
import { loadLanguagePreference } from '../utils/storage';

type Language = 'he' | 'en';

const translations = {
  he: {
    yourHand: 'היד שלך',
    hand: 'יד',
    pile21: 'ערימת 21',
    storage: 'אחסון',
  },
  en: {
    yourHand: 'Your Hand',
    hand: 'hand',
    pile21: '21-pile',
    storage: 'storage',
  },
};

interface PlayerAreaVerticalProps {
  player: Player;
  isCurrentPlayer: boolean;
  selectedCard: SelectedCard | null;
  onSelectCard: (card: Card, source: CardSource, sourceIndex: number) => void;
  onPlayToStorage: (storageIndex: number) => void;
  showHandCards?: boolean;
  position: 'left' | 'right';
  isSmallScreen: boolean;
  isLargeScreen: boolean;
  newlyDrawnCards?: Card[];
}

/**
 * Vertical player area component (for left/right positions)
 */
export function PlayerAreaVertical({
  player,
  isCurrentPlayer,
  selectedCard,
  onSelectCard,
  onPlayToStorage,
  showHandCards = true,
  position,
  isSmallScreen,
  isLargeScreen,
  newlyDrawnCards = [],
}: PlayerAreaVerticalProps) {
  const [language, setLanguage] = useState<Language>('he');

  useEffect(() => {
    loadLanguagePreference().then(lang => {
      setLanguage(lang);
    });
  }, []);

  const t = translations[language];

  const personalPileTop = getPersonalPileTop(player);
  const personalPileSize = getPersonalPileSize(player);

  const isCardSelected = (source: CardSource, index: number): boolean => {
    if (!selectedCard) return false;
    return selectedCard.source === source && selectedCard.sourceIndex === index;
  };

  const handleCardPress = (card: Card, source: CardSource, index: number) => {
    if (!isCurrentPlayer) return;
    onSelectCard(card, source, index);
  };

  const styles = createStyles(isSmallScreen, isLargeScreen);
  // Display naturally like sitting around a table - all players face the center

  return (
    <View style={[
      styles.container,
      isCurrentPlayer && styles.currentPlayerContainer,
    ]}>
      {/* Avatar at top */}
      <View style={styles.header}>
        <PlayerAvatar name={player.name} avatar={player.avatar} size={AVATAR_SIZES.DEFAULT} isCurrentPlayer={isCurrentPlayer} />
        <Text style={styles.playerName}>{player.name}</Text>
      </View>

      {/* Hand */}
      <View style={styles.handSection}>
        {isCurrentPlayer ? (
          <>
            <Text style={styles.label}>{t.yourHand}</Text>
            <HandView
              cards={player.hand}
              selectedCard={selectedCard}
              onSelectCard={onSelectCard}
              isCurrentPlayer={isCurrentPlayer}
              showHandCards={showHandCards}
              isCardSelected={isCardSelected}
              playerName={player.name}
              newlyDrawnCards={newlyDrawnCards}
            />
          </>
        ) : (
          <>
            <CardView
              card={null}
              faceDown={true}
              showCount={player.hand.length}
              compact={true}
            />
            <Text style={styles.label}>{t.hand} ({player.hand.length})</Text>
          </>
        )}
      </View>

      {/* 21-Pile */}
      <View style={styles.pileSection}>
        <CardView
          card={personalPileTop}
          selected={isCurrentPlayer && isCardSelected(CardSource.PERSONAL_PILE, 0)}
          onPress={isCurrentPlayer ? () => personalPileTop && handleCardPress(personalPileTop, CardSource.PERSONAL_PILE, 0) : undefined}
          disabled={!isCurrentPlayer || !personalPileTop}
          showCount={personalPileSize}
          compact={true}
        />
        <Text style={styles.label}>{t.pile21}</Text>
      </View>

      {/* Storage at bottom */}
      <View style={styles.storageSection}>
        <StorageView
          player={player}
          isCurrentPlayer={isCurrentPlayer}
          selectedCard={selectedCard}
          onSelectCard={onSelectCard}
          onPlayToStorage={onPlayToStorage}
          isCardSelected={isCardSelected}
          compact={true}
          horizontal={true}
          language={language}
        />
        <Text style={styles.label}>{t.storage}</Text>
      </View>
    </View>
  );
}

const createStyles = (isSmallScreen: boolean, isLargeScreen: boolean) => StyleSheet.create({
  container: {
    alignItems: 'center',
    padding: isSmallScreen ? SPACING.CONTAINER_PADDING_SMALL : SPACING.CONTAINER_PADDING_DEFAULT,
    backgroundColor: `${colors.muted}33`,
    borderRadius: 12,
    width: '100%',
    maxWidth: '100%',
  },
  currentPlayerContainer: {
    backgroundColor: `${colors.muted}4D`,
    borderWidth: 1,
    borderColor: `${colors.gold}66`,
  },
  header: {
    alignItems: 'center',
    justifyContent: 'flex-start',
    marginBottom: isSmallScreen ? SPACING.SECTION_MARGIN_SMALL : SPACING.SECTION_MARGIN_DEFAULT,
  },
  playerName: {
    color: colors.foreground,
    fontSize: isSmallScreen ? FONT_SIZES.LABEL_DEFAULT : FONT_SIZES.PLAYER_NAME_SMALL,
    fontWeight: 'bold',
    marginTop: 4,
  },
  pileSection: {
    alignItems: 'center',
    marginBottom: isSmallScreen ? SPACING.SECTION_MARGIN_SMALL : SPACING.SECTION_MARGIN_DEFAULT,
  },
  handSection: {
    alignItems: 'center',
    marginBottom: isSmallScreen ? SPACING.SECTION_MARGIN_SMALL : SPACING.SECTION_MARGIN_DEFAULT,
  },
  storageSection: {
    alignItems: 'center',
    justifyContent: 'flex-start',
    width: '100%',
  },
  label: {
    color: colors.mutedForeground,
    fontSize: isSmallScreen ? FONT_SIZES.LABEL_SMALL : FONT_SIZES.LABEL_DEFAULT,
    marginTop: 4,
  },
});
