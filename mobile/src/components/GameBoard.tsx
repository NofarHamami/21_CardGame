import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  Modal,
  Dimensions,
  BackHandler,
  Platform,
  LayoutChangeEvent,
  SafeAreaView,
  Animated,
  GestureResponderEvent,
} from 'react-native';
import { Card, CardSource, Player, STORAGE_STACKS } from '../models';
import { MAX_HAND_SIZE } from '../models/Player';
import {
  CARD_DIMENSIONS,
  CARD_LAYOUT,
  HAND_RESERVED_SPACE,
  SCREEN_BREAKPOINTS,
  SPACING,
} from '../constants';
import { UseGameEngineReturn } from '../hooks/useGameEngine';
import PlayerArea from './PlayerArea';
import CenterArea from './CenterArea';
import { ErrorToast } from './ErrorToast';
import { colors } from '../theme/colors';
import { useStockToHandAnimation } from '../hooks/useStockToHandAnimation';
import { StockToHandAnimation } from './StockToHandAnimation';
import { SettingsMenu } from './SettingsMenu';
import { ConfettiAnimation } from './ConfettiAnimation';
import { CardPlayAnimation } from './CardPlayAnimation';
import { Tutorial } from './Tutorial';
import { loadLanguagePreference, loadMutePreference, loadVolumePreference, loadReduceMotion, loadThemePreference } from '../utils/storage';
import { isMuted, setMuted, getVolume, setVolume, playVolumePreview, setReduceMotion, isReduceMotionEnabled } from '../utils/sounds';
import { setActiveTheme, ThemePresetName } from '../theme/colors';
import { logger } from '../utils/logger';

type Language = 'he' | 'en';

const translations = {
  he: {
    endTurn: 'סיים תור',
    cancel: 'בטל',
    gameOver: 'המשחק נגמר!',
    youWon: '🎉 ניצחת! 🎉',
    wins: 'ניצח!',
    newGame: 'משחק חדש',
    playAgain: 'שחק שוב',
  },
  en: {
    endTurn: 'End Turn',
    cancel: 'Cancel',
    gameOver: 'Game Over!',
    youWon: '🎉 You Won! 🎉',
    wins: 'wins!',
    newGame: 'New Game',
    playAgain: 'Play Again',
  },
};

const errorTranslations: Record<string, string> = {
  'Cannot move cards between storage stacks. Play cards from storage to center piles instead.':
    'לא ניתן להעביר קלפים בין ערימות אחסון. שחק קלפים מהאחסון לערימות המרכזיות.',
  'Cannot play to storage after playing to center piles. End your turn or continue playing to center piles.':
    'לא ניתן לשחק לאחסון לאחר ששיחקת לערימות המרכזיות. סיים את התור או המשך לשחק לערימות המרכזיות.',
  'Cards from your 21-pile can only be played to center piles, not storage.':
    'קלפים מערימת 21 שלך ניתנים לשחק רק לערימות המרכזיות, לא לאחסון.',
  'No card at that position. Please select a valid card.':
    'אין קלף במיקום זה. בחר קלף תקין.',
  'Game has not started. Please start a new game.':
    'המשחק לא התחיל. התחל משחק חדש.',
  'Game is over. Please start a new game to continue playing.':
    'המשחק נגמר. התחל משחק חדש כדי להמשיך לשחק.',
  'You must play at least 1 card before ending your turn.':
    'עליך לשחק לפחות קלף אחד לפני סיום התור.',
  'You cannot end your turn with 5 cards in hand. Play or store a card first.':
    'לא ניתן לסיים את התור עם 5 קלפים ביד. שחק או אחסן קלף קודם.',
};

function translateError(message: string, language: string): string {
  if (language === 'he') {
    if (errorTranslations[message]) return errorTranslations[message];
    const match = message.match(/^Cannot place (.+?) on pile (\d+)\. This pile needs a (.+?)( \(top card is (.+?)\))?\.$/);
    if (match) {
      const [, cardVal, pileNum, expectedRank, , topCardInfo] = match;
      const cardName = cardVal === 'King' ? 'מלך' : cardVal;
      const expectedName = expectedRank === 'King' ? 'מלך' : expectedRank;
      if (topCardInfo) {
        const topName = topCardInfo === 'King (acting as wild)' ? 'מלך (ג\'וקר)' : topCardInfo;
        return `לא ניתן להניח ${cardName} על ערימה ${pileNum}. ערימה זו צריכה ${expectedName} (הקלף העליון הוא ${topName}).`;
      }
      return `לא ניתן להניח ${cardName} על ערימה ${pileNum}. ערימה זו צריכה ${expectedName}.`;
    }
  }
  return message;
}

/**
 * Approximates the screen position of a card in the player's hand,
 * replicating the overlap/arch math from HandView.
 */
function estimateHandCardPosition(
  sourceIndex: number,
  handSize: number,
  playerPosition: 'top' | 'bottom' | 'left' | 'right',
  screenWidth: number,
  screenHeight: number,
): { x: number; y: number } {
  const cardW = CARD_DIMENSIONS.WIDTH;
  const isSmallScreen = screenWidth < SCREEN_BREAKPOINTS.SMALL;
  const isLargeScreen = screenWidth >= SCREEN_BREAKPOINTS.LARGE;

  const reservedSpace = isSmallScreen
    ? HAND_RESERVED_SPACE.SMALL_SCREEN
    : isLargeScreen
    ? HAND_RESERVED_SPACE.LARGE_SCREEN
    : HAND_RESERVED_SPACE.DEFAULT;
  const availableWidth = Math.max(HAND_RESERVED_SPACE.MIN_WIDTH, screenWidth - reservedSpace);
  const cardVisibleWidth = CARD_LAYOUT.VISIBLE_WIDTH;
  const totalNeededWidth = handSize * cardVisibleWidth;

  let overlap: number = CARD_LAYOUT.DEFAULT_OVERLAP;
  if (totalNeededWidth > availableWidth && handSize > 1) {
    const extra = totalNeededWidth - availableWidth;
    overlap = CARD_LAYOUT.DEFAULT_OVERLAP - extra / Math.max(1, handSize - 1);
    overlap = Math.max(CARD_LAYOUT.MIN_OVERLAP, Math.min(CARD_LAYOUT.MAX_OVERLAP, overlap));
  } else if (isSmallScreen) {
    overlap = CARD_LAYOUT.SMALL_SCREEN_OVERLAP;
  } else if (isLargeScreen && handSize <= MAX_HAND_SIZE) {
    overlap = CARD_LAYOUT.LARGE_SCREEN_OVERLAP;
  }

  const effectiveCardWidth = cardW + overlap;
  const totalHandWidth = cardW + Math.max(0, handSize - 1) * effectiveCardWidth;

  // The hand row is centered inside its section (flex:1) which sits next to
  // the 21-pile section (~90 px + gap).  The whole PlayerAreaHorizontal is
  // centered on screen, so the hand center ≈ screenWidth/2 shifted right
  // by half the pile-section width.
  const gap = isSmallScreen
    ? SPACING.MAIN_ROW_GAP_SMALL
    : isLargeScreen
    ? SPACING.MAIN_ROW_GAP_LARGE
    : SPACING.MAIN_ROW_GAP_DEFAULT;
  const pileOffset = (90 + gap) / 2;
  const handCenterX = screenWidth / 2 + pileOffset;
  const handStartX = handCenterX - totalHandWidth / 2;
  const cardX = handStartX + sourceIndex * effectiveCardWidth;

  let cardY: number;
  switch (playerPosition) {
    case 'top':    cardY = 100;  break;
    case 'bottom': cardY = screenHeight - 220; break;
    case 'left':   cardY = screenHeight / 2 - CARD_DIMENSIONS.HEIGHT / 2; break;
    case 'right':  cardY = screenHeight / 2 - CARD_DIMENSIONS.HEIGHT / 2; break;
    default:       cardY = screenHeight - 220;
  }

  return { x: cardX, y: cardY };
}

interface GameBoardProps {
  gameEngine: UseGameEngineReturn;
  onNewGame: () => void;
}

const getScreenDimensions = () => {
  try {
    return Dimensions.get('window');
  } catch (e) {
    return { width: 800, height: 600 };
  }
};

const getResponsiveStyles = (screenWidth: number, screenHeight: number) => {
  const isSmallScreen = screenWidth < 375;
  const isLargeScreen = screenWidth >= 768;
  const isDesktop = screenWidth >= 992;

  const minCenterWidth = isSmallScreen ? 70 : isLargeScreen ? 200 : 80;
  const totalPadding = isSmallScreen ? 8 : 12;
  const availableForSides = Math.max(0, screenWidth - minCenterWidth - totalPadding);
  const sideWidth = Math.max(
    isSmallScreen ? 100 : 130,
    Math.min(300, Math.floor(availableForSides / 2))
  );

  return {
    isSmallScreen,
    isLargeScreen,
    isDesktop,
    sideWidth,
    paddingVertical: isSmallScreen ? 2 : 4,
    paddingHorizontal: isSmallScreen ? 2 : 4,
    centerPaddingHorizontal: isSmallScreen ? 2 : 4,
  };
};

export function GameBoard({ gameEngine, onNewGame }: GameBoardProps) {
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [tutorialVisible, setTutorialVisible] = useState(false);
  const [language, setLanguage] = useState<Language>('he');
  const [soundMuted, setSoundMuted] = useState(isMuted());
  const [currentVolume, setCurrentVolume] = useState(getVolume());
  const [volumePopupVisible, setVolumePopupVisible] = useState(false);
  const [sliderTrackWidth, setSliderTrackWidth] = useState(0);
  const volumeHideTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const previewThrottleRef = React.useRef<number>(0);
  const middleRowRef = React.useRef<View>(null);
  const [middleRowHeight, setMiddleRowHeight] = useState(() => {
    const dims = getScreenDimensions();
    return Math.max(150, dims.height - 500);
  });

  // Turn pulse animation
  const turnPulseAnim = React.useRef(new Animated.Value(1)).current;

  useEffect(() => {
    loadLanguagePreference().then(lang => setLanguage(lang));
    loadMutePreference().then(muted => {
      setMuted(muted);
      setSoundMuted(muted);
    });
    loadVolumePreference().then(vol => {
      setVolume(vol);
      setCurrentVolume(vol);
    });
    loadReduceMotion().then(rm => setReduceMotion(rm));
    loadThemePreference().then(theme => setActiveTheme(theme as ThemePresetName));
  }, []);

  const t = translations[language];

  const screenDims = React.useMemo(() => getScreenDimensions(), []);
  const screenWidth = screenDims.width;
  const screenHeight = screenDims.height;
  const responsive = React.useMemo(() => getResponsiveStyles(screenWidth, screenHeight), [screenWidth, screenHeight]);
  const styles = React.useMemo(() => getStyles(screenWidth, screenHeight, responsive.sideWidth, responsive.isDesktop), [screenWidth, screenHeight, responsive.sideWidth, responsive.isDesktop]);

  const handleMiddleRowLayout = useCallback((e: LayoutChangeEvent) => {
    const { height } = e.nativeEvent.layout;
    if (height > 0) setMiddleRowHeight(height);
  }, []);

  const {
    players,
    currentPlayer,
    currentPlayerIndex,
    centerPiles,
    stockPileSize,
    cardsPlayedThisTurn,
    canEndCurrentTurn,
    isGameStarted,
    isGameOver,
    winner,
    lastEvent,
    selectedCard,
    selectCard,
    clearSelection,
    playSelectedToCenter,
    playSelectedToStorage,
    playDirectToCenter,
    playDirectToStorage,
    endCurrentTurn,
    resetGame,
    updatePlayerNameAndAvatar,
  } = gameEngine;

  // Pulse animation on turn change
  useEffect(() => {
    if (!isGameStarted || isGameOver) return;
    turnPulseAnim.setValue(1.15);
    Animated.spring(turnPulseAnim, {
      toValue: 1,
      friction: 4,
      useNativeDriver: true,
    }).start();
  }, [currentPlayerIndex, isGameStarted, isGameOver, turnPulseAnim]);

  const handleCloseModal = React.useCallback(() => {
    resetGame();
    onNewGame();
  }, [resetGame, onNewGame]);

  React.useEffect(() => {
    if (isGameOver && Platform.OS !== 'web') {
      const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
        handleCloseModal();
        return true;
      });
      return () => backHandler.remove();
    }
  }, [isGameOver, handleCloseModal]);

  const player1 = players[0] || null;
  const player2 = players[1] || null;
  const player3 = players[2] || null;
  const player4 = players[3] || null;

  const stockRef = React.useRef<View | null>(null);
  const handSizeBeforePlayRef = React.useRef<number>(0);
  const { cardsToAnimate, isAnimating, onAnimationComplete } = useStockToHandAnimation(lastEvent);

  const getNewlyDrawnCardsForPlayer = React.useCallback((playerIndex: number): Card[] => {
    if (lastEvent?.type === 'HAND_REFILLED' && lastEvent.player.playerNumber === players[playerIndex]?.playerNumber) {
      return lastEvent.cards || [];
    }
    return [];
  }, [lastEvent, players]);

  const getPlayerPosition = (playerIndex: number): 'top' | 'bottom' | 'left' | 'right' => {
    if (playerIndex === 0) return 'top';
    if (playerIndex === 1) return 'bottom';
    if (playerIndex === 2) return 'left';
    return 'right';
  };

  const handleSelectCard = (card: Card, source: CardSource, sourceIndex: number) => {
    if (selectedCard?.card.id === card.id) {
      clearSelection();
    } else {
      selectCard(card, source, sourceIndex);
    }
  };

  const snapshotHandSize = useCallback(() => {
    handSizeBeforePlayRef.current = currentPlayer?.hand.length ?? 0;
  }, [currentPlayer]);

  const wrappedPlaySelectedToCenter = useCallback((pileIndex: number) => {
    snapshotHandSize();
    playSelectedToCenter(pileIndex);
  }, [playSelectedToCenter, snapshotHandSize]);

  const handleCardDragEnd = useCallback((card: Card, source: CardSource, sourceIndex: number, dx: number, dy: number, moveX: number, moveY: number) => {
    const distance = Math.sqrt(dx * dx + dy * dy);
    if (distance < 20) return;

    snapshotHandSize();

    const tryPlayToCenter = (): boolean => {
      for (let i = 0; i < centerPiles.length; i++) {
        if (playDirectToCenter(source, sourceIndex, i)) return true;
      }
      return false;
    };

    const tryPlayToStorage = (): boolean => {
      const storageSlotWidth = CARD_DIMENSIONS.COMPACT_WIDTH + SPACING.GAP_SMALL;
      const totalStorageWidth = STORAGE_STACKS * storageSlotWidth;
      const storageStartX = (screenDims.width - totalStorageWidth) / 2;
      const relativeX = moveX - storageStartX;
      const storageIndex = Math.max(0, Math.min(STORAGE_STACKS - 1, Math.floor(relativeX / storageSlotWidth)));
      return playDirectToStorage(source, sourceIndex, storageIndex);
    };

    // Storage and personal pile cards can only be played to center piles
    if (source === CardSource.STORAGE || source === CardSource.PERSONAL_PILE) {
      tryPlayToCenter();
      return;
    }

    // For hand cards, use drag direction to determine intent.
    // Player 0 (top): center is below, storage is between hand and center.
    //   Long downward drag (dy > 150) = center intent, shorter = storage.
    // Player 1 (bottom): center is above, storage is below hand.
    //   Any upward drag (dy < -30) = center intent, downward/horizontal = storage.
    const centerIntent = currentPlayerIndex === 0 ? dy > 150 : dy < -30;

    if (centerIntent) {
      if (!tryPlayToCenter()) tryPlayToStorage();
    } else {
      if (!tryPlayToStorage()) tryPlayToCenter();
    }
  }, [playDirectToCenter, playDirectToStorage, centerPiles, screenDims, currentPlayerIndex, snapshotHandSize]);

  const handleToggleMute = useCallback(() => {
    const newMuted = !soundMuted;
    setSoundMuted(newMuted);
    setMuted(newMuted);
  }, [soundMuted]);

  const showVolumePopup = useCallback(() => {
    if (volumeHideTimeoutRef.current) {
      clearTimeout(volumeHideTimeoutRef.current);
      volumeHideTimeoutRef.current = null;
    }
    setVolumePopupVisible(true);
  }, []);

  const scheduleHideVolumePopup = useCallback(() => {
    volumeHideTimeoutRef.current = setTimeout(() => {
      setVolumePopupVisible(false);
    }, 400);
  }, []);

  const handleVolumeSlider = useCallback((e: GestureResponderEvent) => {
    if (sliderTrackWidth <= 0) return;
    const locationX = Math.max(0, Math.min(e.nativeEvent.locationX, sliderTrackWidth));
    const newVolume = Math.round((locationX / sliderTrackWidth) * 100) / 100;
    setCurrentVolume(newVolume);
    setVolume(newVolume);
    if (newVolume > 0 && soundMuted) {
      setSoundMuted(false);
      setMuted(false);
    }
    const now = Date.now();
    if (now - previewThrottleRef.current > 250) {
      previewThrottleRef.current = now;
      playVolumePreview();
    }
  }, [sliderTrackWidth, soundMuted]);

  const completedPileIndex = lastEvent?.type === 'PILE_COMPLETED' ? lastEvent.pileIndex : null;

  const [cardPlayAnim, setCardPlayAnim] = React.useState<{
    card: Card;
    playerPosition: 'top' | 'bottom' | 'left' | 'right';
    sourceX?: number;
    sourceY?: number;
    key: number;
  } | null>(null);
  const cardPlayAnimKey = React.useRef(0);

  React.useEffect(() => {
    if (lastEvent?.type === 'CARD_PLAYED' && lastEvent.destination.startsWith('Center')) {
      cardPlayAnimKey.current += 1;
      const playerPos = getPlayerPosition(currentPlayerIndex);

      let srcX: number | undefined;
      let srcY: number | undefined;

      if (lastEvent.source === CardSource.HAND) {
        const handSize = handSizeBeforePlayRef.current || (currentPlayer?.hand.length ?? 0) + 1;
        const pos = estimateHandCardPosition(
          lastEvent.sourceIndex,
          handSize,
          playerPos,
          screenWidth,
          screenHeight,
        );
        srcX = pos.x;
        srcY = pos.y;
      }

      setCardPlayAnim({
        card: lastEvent.card,
        playerPosition: playerPos,
        sourceX: srcX,
        sourceY: srcY,
        key: cardPlayAnimKey.current,
      });
    }
  }, [lastEvent, currentPlayerIndex, currentPlayer, screenWidth, screenHeight]);

  const handleCardPlayAnimComplete = React.useCallback(() => {
    setCardPlayAnim(null);
  }, []);

  const rawErrorMessage = lastEvent?.type === 'INVALID_MOVE' ? lastEvent.message : null;
  const errorMessage = rawErrorMessage ? translateError(rawErrorMessage, language) : null;
  const [showError, setShowError] = React.useState(false);

  React.useEffect(() => {
    if (errorMessage) setShowError(true);
  }, [errorMessage]);

  // Check if current player is AI (disable manual controls)
  const isCurrentPlayerAI = currentPlayer?.isAI ?? false;

  if (!isGameStarted || players.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>{language === 'he' ? 'מתחיל משחק...' : 'Starting game...'}</Text>
        </View>
      </View>
    );
  }

  const currentPlayerData = currentPlayer ? { name: currentPlayer.name, avatar: currentPlayer.avatar } : undefined;

  return (
    <View style={styles.container}>
      {/* Settings Button */}
      <TouchableOpacity
        style={styles.settingsButton}
        onPress={() => setSettingsVisible(true)}
        accessibilityRole="button"
        accessibilityLabel="Open settings"
      >
        <Text style={styles.settingsButtonText}>⚙️</Text>
      </TouchableOpacity>

      {/* Sound Control */}
      <View
        style={styles.soundControlWrapper}
        {...(Platform.OS === 'web' ? {
          onMouseEnter: showVolumePopup,
          onMouseLeave: scheduleHideVolumePopup,
        } : {})}
      >
        <Pressable
          style={styles.muteButton}
          onPress={handleToggleMute}
          onLongPress={Platform.OS !== 'web' ? () => setVolumePopupVisible(v => !v) : undefined}
          accessibilityRole="button"
          accessibilityLabel={soundMuted ? 'Unmute' : 'Mute'}
        >
          <Text style={styles.settingsButtonText}>
            {soundMuted ? '🔇' : currentVolume > 0.5 ? '🔊' : currentVolume > 0 ? '🔉' : '🔈'}
          </Text>
        </Pressable>

        {volumePopupVisible && (
          <View style={styles.volumePopup}>
            <View
              style={styles.volumeSliderTrack}
              onLayout={(e) => setSliderTrackWidth(e.nativeEvent.layout.width)}
              onStartShouldSetResponder={() => true}
              onMoveShouldSetResponder={() => true}
              onResponderGrant={handleVolumeSlider}
              onResponderMove={handleVolumeSlider}
            >
              <View
                style={[
                  styles.volumeSliderFill,
                  { width: `${Math.round(currentVolume * 100)}%` },
                  soundMuted && styles.volumeSliderFillMuted,
                ]}
              />
              <View
                style={[
                  styles.volumeSliderThumb,
                  { left: `${Math.round(currentVolume * 100)}%` },
                ]}
              />
            </View>
            <Text style={styles.volumePercent}>
              {soundMuted ? '🔇' : `${Math.round(currentVolume * 100)}%`}
            </Text>
          </View>
        )}
      </View>

      {/* Tutorial Button */}
      <TouchableOpacity
        style={styles.tutorialButton}
        onPress={() => setTutorialVisible(true)}
        accessibilityRole="button"
        accessibilityLabel={language === 'he' ? 'איך משחקים?' : 'How to play'}
      >
        <Text style={styles.settingsButtonText}>❓</Text>
      </TouchableOpacity>

      <Tutorial visible={tutorialVisible} onClose={() => setTutorialVisible(false)} language={language} />

      <SettingsMenu
        visible={settingsVisible}
        onClose={() => setSettingsVisible(false)}
        currentName={currentPlayerData?.name}
        currentAvatar={currentPlayerData?.avatar}
        onSave={(name, avatar) => {
          if (currentPlayerIndex >= 0) updatePlayerNameAndAvatar(currentPlayerIndex, name, avatar);
        }}
      />

      <ErrorToast message={errorMessage} visible={showError} onDismiss={() => setShowError(false)} />

      <SafeAreaView style={styles.safeArea}>
        <View style={styles.gameLayout}>
          {/* TOP PLAYER */}
          {player1 && (
            <Animated.View
              style={[
                styles.topSection,
                currentPlayerIndex === 0 && { transform: [{ scale: turnPulseAnim }] },
              ]}
              key={`player-0-${player1.name}-${player1.avatar}`}
            >
              <PlayerArea
                player={player1}
                isCurrentPlayer={currentPlayerIndex === 0}
                selectedCard={currentPlayerIndex === 0 && !isCurrentPlayerAI ? selectedCard : null}
                onSelectCard={currentPlayerIndex === 0 && !isCurrentPlayerAI ? handleSelectCard : () => {}}
                onPlayToStorage={currentPlayerIndex === 0 && !isCurrentPlayerAI ? playSelectedToStorage : () => {}}
                showHandCards={currentPlayerIndex === 0}
                showStorageCards={true}
                compact={currentPlayerIndex !== 0}
                position="top"
                newlyDrawnCards={getNewlyDrawnCardsForPlayer(0)}
                onEndTurn={currentPlayerIndex === 0 && !isCurrentPlayerAI ? endCurrentTurn : undefined}
                canEndTurn={currentPlayerIndex === 0 && canEndCurrentTurn}
                onCancelSelection={currentPlayerIndex === 0 && !isCurrentPlayerAI ? clearSelection : undefined}
                hasSelection={currentPlayerIndex === 0 && !!selectedCard}
                onCardDragEnd={currentPlayerIndex === 0 && !isCurrentPlayerAI ? handleCardDragEnd : undefined}
              />
            </Animated.View>
          )}

          {/* MIDDLE ROW */}
          <View style={styles.middleRow} ref={middleRowRef} onLayout={handleMiddleRowLayout}>
            {/* Left side: player3 in 4-player mode, or empty spacer in 3-player mode */}
            {player3 && !player4 && <View style={styles.leftSection} />}
            {player3 && player4 && (
              <View style={styles.leftSection} key={`player-2-${player3.name}-${player3.avatar}`}>
                <PlayerArea
                  player={player3}
                  isCurrentPlayer={currentPlayerIndex === 2}
                  selectedCard={currentPlayerIndex === 2 && !isCurrentPlayerAI ? selectedCard : null}
                  onSelectCard={currentPlayerIndex === 2 && !isCurrentPlayerAI ? handleSelectCard : () => {}}
                  onPlayToStorage={currentPlayerIndex === 2 && !isCurrentPlayerAI ? playSelectedToStorage : () => {}}
                  showHandCards={currentPlayerIndex === 2}
                  showStorageCards={true}
                  compact={currentPlayerIndex !== 2}
                  position="left"
                  newlyDrawnCards={getNewlyDrawnCardsForPlayer(2)}
                  containerWidth={responsive.sideWidth}
                  containerHeight={middleRowHeight}
                  onEndTurn={currentPlayerIndex === 2 && !isCurrentPlayerAI ? endCurrentTurn : undefined}
                  canEndTurn={currentPlayerIndex === 2 && canEndCurrentTurn}
                  onCancelSelection={currentPlayerIndex === 2 && !isCurrentPlayerAI ? clearSelection : undefined}
                  hasSelection={currentPlayerIndex === 2 && !!selectedCard}
                />
              </View>
            )}

            <View style={styles.centerSection}>
              {gameEngine.turnTimeRemaining != null && !isCurrentPlayerAI && (
                <View style={[styles.timerContainer, gameEngine.turnTimeRemaining <= 5 && styles.timerContainerUrgent]}>
                  <Text style={[styles.timerText, gameEngine.turnTimeRemaining <= 5 && styles.timerTextUrgent]}>
                    {gameEngine.turnTimeRemaining}s
                  </Text>
                </View>
              )}
              <CenterArea
                centerPiles={centerPiles}
                stockPileSize={stockPileSize}
                selectedCard={!isCurrentPlayerAI ? selectedCard : null}
                onPlayToCenter={!isCurrentPlayerAI ? wrappedPlaySelectedToCenter : () => {}}
                currentPlayerName={currentPlayer?.name || ''}
                cardsPlayedThisTurn={cardsPlayedThisTurn}
                stockRef={stockRef}
                isAITurn={isCurrentPlayerAI}
                completedPileIndex={completedPileIndex}
              />
              {isCurrentPlayerAI && (
                <View style={styles.aiIndicator}>
                  <Text style={styles.aiIndicatorText}>
                    {language === 'he' ? `${currentPlayer?.name} חושב...` : `${currentPlayer?.name} is thinking...`}
                  </Text>
                </View>
              )}
            </View>

            {/* Right side: player4 in 4-player mode, or player3 in 3-player mode */}
            {(player4 || (player3 && !player4)) && (
              <View style={styles.rightSection} key={player4 ? `player-3-${player4.name}-${player4.avatar}` : `player-2-${player3!.name}-${player3!.avatar}`}>
                <PlayerArea
                  player={player4 || player3!}
                  isCurrentPlayer={player4 ? currentPlayerIndex === 3 : currentPlayerIndex === 2}
                  selectedCard={player4
                    ? (currentPlayerIndex === 3 && !isCurrentPlayerAI ? selectedCard : null)
                    : (currentPlayerIndex === 2 && !isCurrentPlayerAI ? selectedCard : null)}
                  onSelectCard={player4
                    ? (currentPlayerIndex === 3 && !isCurrentPlayerAI ? handleSelectCard : () => {})
                    : (currentPlayerIndex === 2 && !isCurrentPlayerAI ? handleSelectCard : () => {})}
                  onPlayToStorage={player4
                    ? (currentPlayerIndex === 3 && !isCurrentPlayerAI ? playSelectedToStorage : () => {})
                    : (currentPlayerIndex === 2 && !isCurrentPlayerAI ? playSelectedToStorage : () => {})}
                  showHandCards={player4 ? currentPlayerIndex === 3 : currentPlayerIndex === 2}
                  showStorageCards={true}
                  compact={player4 ? currentPlayerIndex !== 3 : currentPlayerIndex !== 2}
                  position="right"
                  newlyDrawnCards={player4 ? getNewlyDrawnCardsForPlayer(3) : getNewlyDrawnCardsForPlayer(2)}
                  containerWidth={responsive.sideWidth}
                  containerHeight={middleRowHeight}
                  onEndTurn={player4
                    ? (currentPlayerIndex === 3 && !isCurrentPlayerAI ? endCurrentTurn : undefined)
                    : (currentPlayerIndex === 2 && !isCurrentPlayerAI ? endCurrentTurn : undefined)}
                  canEndTurn={player4 ? currentPlayerIndex === 3 && canEndCurrentTurn : currentPlayerIndex === 2 && canEndCurrentTurn}
                  onCancelSelection={player4
                    ? (currentPlayerIndex === 3 && !isCurrentPlayerAI ? clearSelection : undefined)
                    : (currentPlayerIndex === 2 && !isCurrentPlayerAI ? clearSelection : undefined)}
                  hasSelection={player4 ? currentPlayerIndex === 3 && !!selectedCard : currentPlayerIndex === 2 && !!selectedCard}
                />
              </View>
            )}
          </View>

          {errorMessage && (
            <View style={styles.messageBox}>
              <Text style={styles.messageText}>{errorMessage}</Text>
            </View>
          )}

          {/* BOTTOM PLAYER */}
          {player2 && (
            <Animated.View
              style={[
                styles.bottomSection,
                currentPlayerIndex === 1 && { transform: [{ scale: turnPulseAnim }] },
              ]}
              key={`player-1-${player2.name}-${player2.avatar}`}
            >
              <PlayerArea
                player={player2}
                isCurrentPlayer={currentPlayerIndex === 1}
                selectedCard={currentPlayerIndex === 1 && !isCurrentPlayerAI ? selectedCard : null}
                onSelectCard={currentPlayerIndex === 1 && !isCurrentPlayerAI ? handleSelectCard : () => {}}
                onPlayToStorage={currentPlayerIndex === 1 && !isCurrentPlayerAI ? playSelectedToStorage : () => {}}
                showHandCards={currentPlayerIndex === 1}
                showStorageCards={true}
                compact={currentPlayerIndex !== 1}
                position="bottom"
                newlyDrawnCards={getNewlyDrawnCardsForPlayer(1)}
                onEndTurn={currentPlayerIndex === 1 && !isCurrentPlayerAI ? endCurrentTurn : undefined}
                canEndTurn={currentPlayerIndex === 1 && canEndCurrentTurn}
                onCancelSelection={currentPlayerIndex === 1 && !isCurrentPlayerAI ? clearSelection : undefined}
                hasSelection={currentPlayerIndex === 1 && !!selectedCard}
                onCardDragEnd={currentPlayerIndex === 1 && !isCurrentPlayerAI ? handleCardDragEnd : undefined}
              />
            </Animated.View>
          )}

        </View>
      </SafeAreaView>

      {/* Card Play Animation */}
      {cardPlayAnim && (
        <CardPlayAnimation
          key={cardPlayAnim.key}
          card={cardPlayAnim.card}
          playerPosition={cardPlayAnim.playerPosition}
          sourceX={cardPlayAnim.sourceX}
          sourceY={cardPlayAnim.sourceY}
          onComplete={handleCardPlayAnimComplete}
        />
      )}

      {/* Stock to Hand Animation */}
      {isAnimating && currentPlayer && (
        <StockToHandAnimation
          cardsToAnimate={cardsToAnimate}
          stockRef={stockRef}
          playerPosition={getPlayerPosition(currentPlayerIndex)}
          onAnimationComplete={onAnimationComplete}
        />
      )}

      {/* Confetti only when the human player wins */}
      <ConfettiAnimation visible={isGameOver && !!winner && !winner.isAI} />

      {/* Game Over Modal */}
      <Modal visible={isGameOver} transparent animationType="fade" onRequestClose={handleCloseModal}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={handleCloseModal}>
          <TouchableOpacity
            style={[styles.modalContent, !winner?.isAI && styles.modalContentWin]}
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            {winner && !winner.isAI ? (
              <>
                <Text style={styles.youWonTitle} accessibilityRole="header">{t.youWon}</Text>
                <TouchableOpacity
                  style={styles.playAgainButton}
                  onPress={handleCloseModal}
                  accessibilityRole="button"
                  accessibilityLabel={language === 'he' ? 'שחק שוב' : 'Play again'}
                >
                  <Text style={styles.newGameButtonText}>{t.playAgain}</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={styles.modalTitle} accessibilityRole="header">{t.gameOver}</Text>
                <Text style={styles.winnerText}>
                  {winner?.name} {t.wins}
                </Text>
                <TouchableOpacity
                  style={styles.newGameButton}
                  onPress={handleCloseModal}
                  accessibilityRole="button"
                  accessibilityLabel={language === 'he' ? 'התחל משחק חדש' : 'Start new game'}
                >
                  <Text style={styles.newGameButtonText}>{t.newGame}</Text>
                </TouchableOpacity>
              </>
            )}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const getStyles = (screenWidth: number, screenHeight: number, sideWidth: number, isDesktop: boolean) => {
  const responsive = getResponsiveStyles(screenWidth, screenHeight);

  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    safeArea: {
      flex: 1,
    },
    gameLayout: {
      flex: 1,
      flexDirection: 'column',
      justifyContent: 'space-between',
      paddingBottom: 10,
    },
    settingsButton: {
      position: 'absolute',
      top: 50,
      left: 16,
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.secondary,
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1000,
      borderWidth: 2,
      borderColor: colors.border,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 4,
      elevation: 8,
    },
    soundControlWrapper: {
      position: 'absolute',
      top: 50,
      left: 64,
      zIndex: 1001,
    },
    muteButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.secondary,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 2,
      borderColor: colors.border,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 4,
      elevation: 8,
      ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
    } as any,
    volumePopup: {
      position: 'absolute',
      top: 46,
      left: -8,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.secondary,
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderWidth: 2,
      borderColor: colors.border,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.4,
      shadowRadius: 8,
      elevation: 12,
      gap: 10,
      width: 200,
    },
    volumeSliderTrack: {
      flex: 1,
      height: 8,
      borderRadius: 4,
      backgroundColor: `${colors.muted}88`,
      justifyContent: 'center',
      overflow: 'visible' as const,
      ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
    } as any,
    volumeSliderFill: {
      position: 'absolute',
      left: 0,
      top: 0,
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.gold,
    },
    volumeSliderFillMuted: {
      backgroundColor: colors.mutedForeground,
    },
    volumeSliderThumb: {
      position: 'absolute',
      top: -4,
      width: 16,
      height: 16,
      borderRadius: 8,
      backgroundColor: colors.gold,
      marginLeft: -8,
      borderWidth: 2,
      borderColor: colors.background,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.3,
      shadowRadius: 2,
      elevation: 4,
    },
    volumePercent: {
      color: colors.mutedForeground,
      fontSize: 12,
      fontWeight: '600',
      minWidth: 36,
      textAlign: 'right',
    },
    tutorialButton: {
      position: 'absolute',
      top: 50,
      left: 112,
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.secondary,
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1000,
      borderWidth: 2,
      borderColor: colors.border,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 4,
      elevation: 8,
    },
    settingsButtonText: {
      fontSize: 20,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    loadingText: {
      color: colors.foreground,
      fontSize: 18,
      fontWeight: '500',
    },
    topSection: {
      alignItems: 'center',
      paddingVertical: responsive.paddingVertical,
      paddingHorizontal: responsive.paddingHorizontal,
    },
    middleRow: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: responsive.paddingHorizontal,
      minHeight: 150,
      ...(isDesktop ? { zIndex: 1, overflow: 'visible' as const } : {}),
    },
    leftSection: isDesktop
      ? {
          width: 500,
          justifyContent: 'center' as const,
          alignItems: 'center' as const,
          ...(screenWidth <= 1900 ? { position: 'relative' as const, left: 200 } : {}),
        }
      : { width: sideWidth, justifyContent: 'center' as const, alignItems: 'center' as const },
    centerSection: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      minWidth: 0,
      paddingHorizontal: responsive.centerPaddingHorizontal,
    },
    rightSection: isDesktop
      ? {
          width: 500,
          justifyContent: 'center' as const,
          alignItems: 'center' as const,
          ...(screenWidth <= 1900 ? { position: 'relative' as const, right: 200 } : {}),
        }
      : { width: sideWidth, justifyContent: 'center' as const, alignItems: 'center' as const },
    bottomSection: {
      alignItems: 'center',
      paddingVertical: responsive.paddingVertical,
      paddingHorizontal: responsive.paddingHorizontal,
    },
    messageBox: {
      backgroundColor: colors.accent,
      padding: 8,
      marginHorizontal: 10,
      marginVertical: 3,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.goldLight,
    },
    messageText: {
      color: colors.primaryForeground,
      fontSize: 12,
      textAlign: 'center',
      fontWeight: '500',
    },
    actionButtons: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: 12,
      paddingVertical: 8,
    },
    button: {
      backgroundColor: colors.primary,
      paddingHorizontal: 20,
      paddingVertical: 10,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.goldLight,
      shadowColor: colors.gold,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 4,
      elevation: 4,
    },
    buttonDisabled: {
      backgroundColor: colors.muted,
      borderColor: colors.mutedForeground,
      opacity: 0.5,
    },
    cancelButton: {
      backgroundColor: colors.destructive,
      borderColor: colors.destructive,
    },
    buttonText: {
      color: colors.primaryForeground,
      fontSize: 14,
      fontWeight: 'bold',
    },
    timerContainer: {
      backgroundColor: colors.secondary,
      paddingHorizontal: 16,
      paddingVertical: 6,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      alignSelf: 'center',
      marginBottom: 4,
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
    aiIndicator: {
      backgroundColor: colors.secondary,
      paddingHorizontal: 20,
      paddingVertical: 10,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      marginTop: 8,
    },
    aiIndicatorText: {
      color: colors.mutedForeground,
      fontSize: 14,
      fontStyle: 'italic',
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    modalContent: {
      backgroundColor: colors.background,
      borderRadius: 20,
      padding: 40,
      alignItems: 'center',
      borderWidth: 2,
      borderColor: colors.gold,
      shadowColor: colors.gold,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.4,
      shadowRadius: 20,
      elevation: 20,
    },
    modalContentWin: {
      borderColor: '#4CAF50',
      shadowColor: '#4CAF50',
    },
    modalTitle: {
      fontSize: 32,
      fontWeight: 'bold',
      color: colors.gold,
      marginBottom: 15,
    },
    youWonTitle: {
      fontSize: 36,
      fontWeight: 'bold',
      color: '#4CAF50',
      marginBottom: 30,
      textAlign: 'center',
    },
    winnerText: {
      fontSize: 24,
      color: colors.foreground,
      marginBottom: 30,
      fontWeight: '600',
    },
    newGameButton: {
      backgroundColor: colors.gold,
      paddingHorizontal: 40,
      paddingVertical: 15,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.goldLight,
      shadowColor: colors.gold,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.4,
      shadowRadius: 8,
      elevation: 8,
    },
    playAgainButton: {
      backgroundColor: '#4CAF50',
      paddingHorizontal: 40,
      paddingVertical: 15,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: '#66BB6A',
      shadowColor: '#4CAF50',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.4,
      shadowRadius: 8,
      elevation: 8,
    },
    newGameButtonText: {
      color: colors.background,
      fontSize: 20,
      fontWeight: 'bold',
    },
  });
};

export default GameBoard;
