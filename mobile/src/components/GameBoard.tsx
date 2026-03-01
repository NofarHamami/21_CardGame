import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  BackHandler,
  Platform,
  LayoutChangeEvent,
  SafeAreaView,
  Animated,
  useWindowDimensions,
} from 'react-native';
import { Card, CardSource, Player, STORAGE_STACKS, getHandCard, getPersonalPileTop, getStorageTop } from '../models';
import { AIMove } from '../engine/AIPlayer';
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
import { GameToolbar } from './GameToolbar';
import { GameOverModal } from './GameOverModal';
import { loadLanguagePreference, loadMutePreference, loadVolumePreference, loadReduceMotion, loadThemePreference } from '../utils/storage';
import { isMuted, setMuted, getVolume, setVolume, playVolumePreview, setReduceMotion, isReduceMotionEnabled } from '../utils/sounds';
import { setActiveTheme, ThemePresetName } from '../theme/colors';
import { logger } from '../utils/logger';

type Language = 'he' | 'en';

const translations = {
  he: {
    endTurn: 'סיים תור',
    cancel: 'בטל',
  },
  en: {
    endTurn: 'End Turn',
    cancel: 'Cancel',
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

const FALLBACK_DIMENSIONS = { width: 800, height: 600 };

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
  const windowDims = useWindowDimensions();
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [tutorialVisible, setTutorialVisible] = useState(false);
  const [language, setLanguage] = useState<Language>('he');
  const [soundMuted, setSoundMuted] = useState(isMuted());
  const [currentVolume, setCurrentVolume] = useState(getVolume());
  const middleRowRef = React.useRef<View>(null);
  const [middleRowHeight, setMiddleRowHeight] = useState(() => {
    return Math.max(150, (windowDims?.height || FALLBACK_DIMENSIONS.height) - 500);
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

  const screenWidth = windowDims?.width || FALLBACK_DIMENSIONS.width;
  const screenHeight = windowDims?.height || FALLBACK_DIMENSIONS.height;
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
    getHint,
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
  const centerPileLayoutsRef = React.useRef<Array<{x: number; y: number; width: number; height: number}>>([]);

  const handlePileLayout = useCallback((index: number, layout: {x: number; y: number; width: number; height: number}) => {
    const layouts = [...centerPileLayoutsRef.current];
    layouts[index] = layout;
    centerPileLayoutsRef.current = layouts;
  }, []);
  const handSizeBeforePlayRef = React.useRef<number>(0);
  const selectedCardRef = React.useRef(selectedCard);
  selectedCardRef.current = selectedCard;
  const [isDragging, setIsDragging] = useState(false);
  const [draggingCard, setDraggingCard] = useState<Card | null>(null);
  const { cardsToAnimate, isAnimating, onAnimationComplete } = useStockToHandAnimation(lastEvent);

  const getNewlyDrawnCardsForPlayer = React.useCallback((playerIndex: number): Card[] => {
    if (lastEvent?.type === 'HAND_REFILLED' && lastEvent.player.playerNumber === players[playerIndex]?.playerNumber) {
      return lastEvent.cards || [];
    }
    return [];
  }, [lastEvent, players]);

  const getPlayerPosition = (playerIndex: number): 'top' | 'bottom' | 'left' | 'right' => {
    if (playerIndex === 0) return 'bottom';
    if (playerIndex === 1) return 'top';
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

  const handleCardDragStart = useCallback((card: Card) => {
    setIsDragging(true);
    setDraggingCard(card);
  }, []);

  const handleCardDragEnd = useCallback((card: Card, source: CardSource, sourceIndex: number, dx: number, dy: number, moveX: number, moveY: number) => {
    setIsDragging(false);
    setDraggingCard(null);
    const distance = Math.sqrt(dx * dx + dy * dy);
    if (distance < 40) {
      if (selectedCardRef.current?.card.id === card.id) {
        clearSelection();
      }
      return;
    }

    snapshotHandSize();

    const HIT_PADDING = 30;

    const scrollX = Platform.OS === 'web' ? (window.scrollX || window.pageXOffset || 0) : 0;
    const scrollY = Platform.OS === 'web' ? (window.scrollY || window.pageYOffset || 0) : 0;
    const vpX = moveX - scrollX;
    const vpY = moveY - scrollY;

    const findPileAtPointDOM = (): number | null => {
      if (Platform.OS !== 'web' || typeof document === 'undefined') return null;
      let bestPile: number | null = null;
      let bestDist = Infinity;
      for (let i = 0; i < centerPiles.length; i++) {
        const el = document.getElementById(`center-pile-${i}`);
        if (!el) continue;
        const rect = el.getBoundingClientRect();
        if (
          vpX >= rect.left - HIT_PADDING &&
          vpX <= rect.right + HIT_PADDING &&
          vpY >= rect.top - HIT_PADDING &&
          vpY <= rect.bottom + HIT_PADDING
        ) {
          const cx = (rect.left + rect.right) / 2;
          const cy = (rect.top + rect.bottom) / 2;
          const dist = (vpX - cx) ** 2 + (vpY - cy) ** 2;
          if (dist < bestDist) {
            bestDist = dist;
            bestPile = i;
          }
        }
      }
      return bestPile;
    };

    const findPileAtPointRef = (): number | null => {
      const pileLayouts = centerPileLayoutsRef.current;
      if (!pileLayouts || !pileLayouts.some(l => !!l)) return null;
      let bestPile: number | null = null;
      let bestDist = Infinity;
      for (let i = 0; i < pileLayouts.length; i++) {
        const layout = pileLayouts[i];
        if (!layout) continue;
        if (
          moveX >= layout.x - HIT_PADDING &&
          moveX <= layout.x + layout.width + HIT_PADDING &&
          moveY >= layout.y - HIT_PADDING &&
          moveY <= layout.y + layout.height + HIT_PADDING
        ) {
          const cx = layout.x + layout.width / 2;
          const cy = layout.y + layout.height / 2;
          const dist = (moveX - cx) ** 2 + (moveY - cy) ** 2;
          if (dist < bestDist) {
            bestDist = dist;
            bestPile = i;
          }
        }
      }
      return bestPile;
    };

    const findNearestPileDOM = (): number | null => {
      if (Platform.OS !== 'web' || typeof document === 'undefined') return null;
      let bestPile: number | null = null;
      let bestDist = Infinity;
      for (let i = 0; i < centerPiles.length; i++) {
        const el = document.getElementById(`center-pile-${i}`);
        if (!el) continue;
        const rect = el.getBoundingClientRect();
        const cx = (rect.left + rect.right) / 2;
        const cy = (rect.top + rect.bottom) / 2;
        const dist = (vpX - cx) ** 2 + (vpY - cy) ** 2;
        if (dist < bestDist) {
          bestDist = dist;
          bestPile = i;
        }
      }
      return bestPile;
    };

    const findStorageAtPointDOM = (): number | null => {
      if (Platform.OS !== 'web' || typeof document === 'undefined') return null;
      for (let i = 0; i < STORAGE_STACKS; i++) {
        const el = document.getElementById(`storage-slot-${i}`);
        if (!el) continue;
        const rect = el.getBoundingClientRect();
        if (
          vpX >= rect.left - HIT_PADDING &&
          vpX <= rect.right + HIT_PADDING &&
          vpY >= rect.top - HIT_PADDING &&
          vpY <= rect.bottom + HIT_PADDING
        ) {
          return i;
        }
      }
      return null;
    };

    const targetedPile = findPileAtPointDOM() ?? findPileAtPointRef();

    if (targetedPile !== null) {
      playDirectToCenter(source, sourceIndex, targetedPile);
      return;
    }

    const tryPlayToCenterNearest = (): boolean => {
      const nearest = findNearestPileDOM();
      if (nearest !== null) {
        return playDirectToCenter(source, sourceIndex, nearest);
      }
      for (let i = 0; i < centerPiles.length; i++) {
        if (playDirectToCenter(source, sourceIndex, i)) return true;
      }
      return false;
    };

    const tryPlayToStorage = (): boolean => {
      const storageSlotWidth = CARD_DIMENSIONS.COMPACT_WIDTH + SPACING.GAP_SMALL;
      const totalStorageWidth = STORAGE_STACKS * storageSlotWidth;
      const storageStartX = (screenWidth - totalStorageWidth) / 2;
      const relativeX = moveX - storageStartX;
      const storageIndex = Math.max(0, Math.min(STORAGE_STACKS - 1, Math.floor(relativeX / storageSlotWidth)));
      return playDirectToStorage(source, sourceIndex, storageIndex);
    };

    if (source === CardSource.STORAGE || source === CardSource.PERSONAL_PILE) {
      tryPlayToCenterNearest();
      return;
    }

    // Three-way intent for hand cards:
    //   1. Dropped on a storage slot → storage
    //   2. Clear vertical drag toward center → center
    //   3. Neither → cancel (card returns to hand)
    const targetedStorage = findStorageAtPointDOM();
    if (targetedStorage !== null) {
      playDirectToStorage(source, sourceIndex, targetedStorage);
      return;
    }

    const centerIntent = currentPlayerIndex === 0 ? dy < -60 : dy > 60;
    const storageIntent = currentPlayerIndex === 0 ? dy > 60 : dy < -60;

    if (centerIntent) {
      if (!tryPlayToCenterNearest()) tryPlayToStorage();
    } else if (storageIntent) {
      if (!tryPlayToStorage()) tryPlayToCenterNearest();
    } else {
      if (selectedCardRef.current?.card.id === card.id) {
        clearSelection();
      }
    }
  }, [playDirectToCenter, playDirectToStorage, centerPiles, screenWidth, screenHeight, currentPlayerIndex, snapshotHandSize, clearSelection]);

  const handleToggleMute = useCallback(() => {
    const newMuted = !soundMuted;
    setSoundMuted(newMuted);
    setMuted(newMuted);
  }, [soundMuted]);

  const handleVolumeChange = useCallback((newVolume: number) => {
    setCurrentVolume(newVolume);
    setVolume(newVolume);
    if (newVolume > 0 && soundMuted) {
      setSoundMuted(false);
      setMuted(false);
    }
    playVolumePreview();
  }, [soundMuted]);

  const handleHint = useCallback(() => {
    const hint = getHint();
    if (!hint || !currentPlayer) return;
    if (hint.type === 'endTurn') {
      endCurrentTurn();
      return;
    }
    if (hint.source === CardSource.HAND && hint.sourceIndex != null) {
      const card = getHandCard(currentPlayer, hint.sourceIndex);
      if (card) {
        selectCard(card, CardSource.HAND, hint.sourceIndex);
        if (hint.type === 'center' && hint.targetIndex != null) {
          setTimeout(() => playDirectToCenter(CardSource.HAND, hint.sourceIndex!, hint.targetIndex!), 400);
        } else if (hint.type === 'storage' && hint.targetIndex != null) {
          setTimeout(() => playDirectToStorage(CardSource.HAND, hint.sourceIndex!, hint.targetIndex!), 400);
        }
      }
    } else if (hint.source === CardSource.PERSONAL_PILE) {
      const card = getPersonalPileTop(currentPlayer);
      if (card) {
        selectCard(card, CardSource.PERSONAL_PILE, 0);
        if (hint.type === 'center' && hint.targetIndex != null) {
          setTimeout(() => playDirectToCenter(CardSource.PERSONAL_PILE, 0, hint.targetIndex!), 400);
        }
      }
    } else if (hint.source === CardSource.STORAGE && hint.sourceIndex != null) {
      const card = getStorageTop(currentPlayer, hint.sourceIndex);
      if (card) {
        selectCard(card, CardSource.STORAGE, hint.sourceIndex);
        if (hint.type === 'center' && hint.targetIndex != null) {
          setTimeout(() => playDirectToCenter(CardSource.STORAGE, hint.sourceIndex!, hint.targetIndex!), 400);
        }
      }
    }
  }, [getHint, currentPlayer, selectCard, endCurrentTurn, playDirectToCenter, playDirectToStorage]);

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

  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [invalidMoveCount, setInvalidMoveCount] = React.useState(0);
  const [invalidPileIndex, setInvalidPileIndex] = React.useState<number | null>(null);
  const errorTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => {
    if (lastEvent?.type === 'INVALID_MOVE') {
      const msg = translateError(lastEvent.message, language);
      setErrorMessage(msg);
      setInvalidMoveCount(c => c + 1);

      const pileMatch = lastEvent.message.match(/on pile (\d+)/);
      setInvalidPileIndex(pileMatch ? parseInt(pileMatch[1], 10) - 1 : null);

      if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
      errorTimerRef.current = setTimeout(() => {
        setErrorMessage(null);
        setInvalidPileIndex(null);
      }, 5000);
    }
  }, [lastEvent, language]);

  React.useEffect(() => {
    return () => {
      if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
    };
  }, []);

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
      <GameToolbar
        language={language}
        soundMuted={soundMuted}
        currentVolume={currentVolume}
        onToggleMute={handleToggleMute}
        onVolumeChange={handleVolumeChange}
        onOpenSettings={() => setSettingsVisible(true)}
        onOpenTutorial={() => setTutorialVisible(true)}
        onHint={!isCurrentPlayerAI ? handleHint : undefined}
        hintDisabled={isCurrentPlayerAI || isGameOver}
      />

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

      <SafeAreaView style={styles.safeArea}>
        <View style={styles.gameLayout}>
          {/* TOP PLAYER (opponent) */}
          {player2 && (
            <Animated.View
              style={[
                styles.topSection,
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
                position="top"
                newlyDrawnCards={getNewlyDrawnCardsForPlayer(1)}
                onEndTurn={currentPlayerIndex === 1 && !isCurrentPlayerAI ? endCurrentTurn : undefined}
                canEndTurn={currentPlayerIndex === 1 && canEndCurrentTurn}
                onCancelSelection={currentPlayerIndex === 1 && !isCurrentPlayerAI ? clearSelection : undefined}
                hasSelection={currentPlayerIndex === 1 && !!selectedCard}
                onCardDragEnd={currentPlayerIndex === 1 && !isCurrentPlayerAI ? handleCardDragEnd : undefined}
                onCardDragStart={currentPlayerIndex === 1 && !isCurrentPlayerAI ? handleCardDragStart : undefined}
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
                onPileLayout={handlePileLayout}
                draggingCard={isDragging ? draggingCard : null}
                invalidPileIndex={invalidPileIndex}
                invalidPileKey={invalidMoveCount}
              />
              <ErrorToast message={errorMessage} animKey={invalidMoveCount} />
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

          {/* BOTTOM PLAYER (human) */}
          {player1 && (
            <Animated.View
              style={[
                styles.bottomSection,
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
                position="bottom"
                newlyDrawnCards={getNewlyDrawnCardsForPlayer(0)}
                onEndTurn={currentPlayerIndex === 0 && !isCurrentPlayerAI ? endCurrentTurn : undefined}
                canEndTurn={currentPlayerIndex === 0 && canEndCurrentTurn}
                onCancelSelection={currentPlayerIndex === 0 && !isCurrentPlayerAI ? clearSelection : undefined}
                hasSelection={currentPlayerIndex === 0 && !!selectedCard}
                onCardDragEnd={currentPlayerIndex === 0 && !isCurrentPlayerAI ? handleCardDragEnd : undefined}
                onCardDragStart={currentPlayerIndex === 0 && !isCurrentPlayerAI ? handleCardDragStart : undefined}
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

      <GameOverModal
        visible={isGameOver}
        winner={winner}
        language={language}
        onClose={handleCloseModal}
      />
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
  });
};

export default GameBoard;
