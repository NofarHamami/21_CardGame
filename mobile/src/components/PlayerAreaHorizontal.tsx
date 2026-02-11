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
    yourTurn: '(התור שלך)',
    pile21: 'ערימת 21',
    yourHand: 'היד שלך',
    hand: 'יד',
    storage: 'אחסון',
  },
  en: {
    yourTurn: '(Your Turn)',
    pile21: '21-pile',
    yourHand: 'Your Hand',
    hand: 'hand',
    storage: 'storage',
  },
};

interface PlayerAreaHorizontalProps {
  player: Player;
  isCurrentPlayer: boolean;
  selectedCard: SelectedCard | null;
  onSelectCard: (card: Card, source: CardSource, sourceIndex: number) => void;
  onPlayToStorage: (storageIndex: number) => void;
  showHandCards?: boolean;
  position: 'top' | 'bottom';
  isSmallScreen: boolean;
  isLargeScreen: boolean;
  isDesktop?: boolean;
  newlyDrawnCards?: Card[];
}

/**
 * Horizontal player area component (for top/bottom positions)
 */
export function PlayerAreaHorizontal({
  player,
  isCurrentPlayer,
  selectedCard,
  onSelectCard,
  onPlayToStorage,
  showHandCards = true,
  position,
  isSmallScreen,
  isLargeScreen,
  isDesktop = false,
  newlyDrawnCards = [],
}: PlayerAreaHorizontalProps) {
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

  const styles = createStyles(isSmallScreen, isLargeScreen, isDesktop);

  return (
    <View style={[
      styles.container,
      isDesktop && !isCurrentPlayer && styles.desktopCompactContainer,
      isCurrentPlayer && styles.currentPlayerContainer,
    ]}>
      {/* Header: Avatar + Name */}
      <View style={styles.header} accessibilityRole="header">
        <PlayerAvatar
          name={player.name}
          avatar={player.avatar}
          size={isCurrentPlayer ? AVATAR_SIZES.CURRENT_PLAYER : AVATAR_SIZES.DEFAULT}
          isCurrentPlayer={isCurrentPlayer}
        />
        <Text
          style={[
            styles.playerName,
            isCurrentPlayer && styles.currentPlayerName,
          ]}
          accessibilityRole="text"
          accessibilityLabel={language === 'he' 
            ? `${player.name}${isCurrentPlayer ? ', התור שלך' : ''}`
            : `${player.name}${isCurrentPlayer ? ', your turn' : ''}`}
        >
          {player.name}
          {isCurrentPlayer && ` ${t.yourTurn}`}
        </Text>
      </View>

      {/* Main row: 21-pile + Hand */}
      <View style={styles.mainRow}>
        {/* 21-Pile */}
        <View style={styles.pileSection} accessibilityLabel={language === 'he' ? `ערימת 21 עם ${personalPileSize} קלפים` : `21-pile with ${personalPileSize} cards`}>
          <CardView
            card={personalPileTop}
            selected={isCurrentPlayer && isCardSelected(CardSource.PERSONAL_PILE, 0)}
            onPress={isCurrentPlayer ? () => personalPileTop && handleCardPress(personalPileTop, CardSource.PERSONAL_PILE, 0) : undefined}
            disabled={!isCurrentPlayer || !personalPileTop}
            showCount={personalPileSize}
            compact={position === 'top'}
          />
          <Text style={styles.label} accessibilityRole="text">{t.pile21}</Text>
        </View>

        {/* Hand */}
        <View
          style={styles.handSection}
          accessibilityLabel={language === 'he'
            ? isCurrentPlayer ? `היד שלך עם ${player.hand.length} קלפים` : `יד עם ${player.hand.length} קלפים`
            : isCurrentPlayer ? `Your hand with ${player.hand.length} cards` : `Hand with ${player.hand.length} cards`}
        >
          {isCurrentPlayer ? (
            <>
              <Text style={styles.label} accessibilityRole="text">{t.yourHand}</Text>
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
              <Text style={styles.label} accessibilityRole="text">{t.hand} ({player.hand.length})</Text>
            </>
          )}
        </View>
      </View>

      {/* Storage */}
      <StorageView
        player={player}
        isCurrentPlayer={isCurrentPlayer}
        selectedCard={selectedCard}
        onSelectCard={onSelectCard}
        onPlayToStorage={onPlayToStorage}
        isCardSelected={isCardSelected}
        compact={isDesktop || position === 'top'}
        horizontal={true}
        language={language}
      />
    </View>
  );
}

const createStyles = (isSmallScreen: boolean, isLargeScreen: boolean, isDesktop: boolean) => StyleSheet.create({
  container: {
    alignItems: 'center',
    padding: isSmallScreen ? SPACING.CONTAINER_PADDING_SMALL : SPACING.CONTAINER_PADDING_DEFAULT,
    backgroundColor: `${colors.muted}33`,
    borderRadius: 12,
    marginHorizontal: isSmallScreen ? 2 : 5,
    ...(isDesktop
      ? { width: 316, flexDirection: 'column' as const }
      : { maxWidth: '100%' }),
  },
  desktopCompactContainer: {
    height: 296,
    overflow: 'hidden' as const,
  },
  currentPlayerContainer: {
    backgroundColor: `${colors.muted}4D`,
    borderWidth: 1,
    borderColor: `${colors.gold}66`,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.GAP_MEDIUM,
    marginBottom: SPACING.GAP_MEDIUM,
  },
  playerName: {
    color: colors.foreground,
    fontSize: isSmallScreen ? FONT_SIZES.PLAYER_NAME_SMALL : FONT_SIZES.PLAYER_NAME_DEFAULT,
    fontWeight: 'bold',
  },
  currentPlayerName: {
    color: colors.accent,
    fontSize: isSmallScreen ? FONT_SIZES.PLAYER_NAME_DEFAULT : FONT_SIZES.PLAYER_NAME_CURRENT,
  },
  mainRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: isSmallScreen ? SPACING.MAIN_ROW_GAP_SMALL : isLargeScreen ? SPACING.MAIN_ROW_GAP_LARGE : SPACING.MAIN_ROW_GAP_DEFAULT,
    marginBottom: isSmallScreen ? SPACING.MAIN_ROW_MARGIN_SMALL : isLargeScreen ? SPACING.MAIN_ROW_MARGIN_LARGE : SPACING.MAIN_ROW_MARGIN_DEFAULT,
    flexWrap: 'nowrap',
    zIndex: 0, // Create stacking context so hand card z-index doesn't block storage below
  },
  pileSection: {
    alignItems: 'center',
    zIndex: Z_INDEX.BASE,
    minWidth: 90,
  },
  handSection: {
    alignItems: 'center',
    flex: 1,
    minWidth: 0,
    maxWidth: '100%',
  },
  label: {
    color: colors.mutedForeground,
    fontSize: isSmallScreen ? FONT_SIZES.LABEL_DEFAULT : FONT_SIZES.LABEL_MEDIUM,
    marginTop: 4,
    fontWeight: '500',
  },
});
