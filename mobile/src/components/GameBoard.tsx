import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Dimensions,
  BackHandler,
  Platform,
  LayoutChangeEvent,
  SafeAreaView,
} from 'react-native';
import { Card, CardSource, Player } from '../models';
import { UseGameEngineReturn } from '../hooks/useGameEngine';
import PlayerArea from './PlayerArea';
import CenterArea from './CenterArea';
import { ErrorToast } from './ErrorToast';
import { colors } from '../theme/colors';
import { useStockToHandAnimation } from '../hooks/useStockToHandAnimation';
import { StockToHandAnimation } from './StockToHandAnimation';
import { SettingsMenu } from './SettingsMenu';
import { loadLanguagePreference } from '../utils/storage';

type Language = 'he' | 'en';

const translations = {
  he: {
    endTurn: 'סיים תור',
    cancel: 'בטל',
    gameOver: 'המשחק נגמר!',
    wins: 'ניצח!',
    newGame: 'משחק חדש',
  },
  en: {
    endTurn: 'End Turn',
    cancel: 'Cancel',
    gameOver: 'Game Over!',
    wins: 'wins!',
    newGame: 'New Game',
  },
};

interface GameBoardProps {
  gameEngine: UseGameEngineReturn;
  onNewGame: () => void;
}

// Get screen dimensions with fallback for web
const getScreenDimensions = () => {
  try {
    return Dimensions.get('window');
  } catch (e) {
    // Fallback for web or if Dimensions fails
    return { width: 800, height: 600 };
  }
};

// Responsive breakpoints - calculated inside component
const getResponsiveStyles = (screenWidth: number, screenHeight: number) => {
  const isSmallScreen = screenWidth < 375; // iPhone SE, small phones
  const isLargeScreen = screenWidth >= 768; // Tablets
  const isDesktop = screenWidth >= 992; // Desktop
  
  // Side section width for left/right players (used only for non-desktop)
  // Maximize side player size: give them as much width as possible
  // Center piles can wrap/stack vertically when space is tight
  const minCenterWidth = isSmallScreen ? 70 : isLargeScreen ? 200 : 80;
  const totalPadding = isSmallScreen ? 8 : 12;
  const availableForSides = Math.max(0, screenWidth - minCenterWidth - totalPadding);
  // Each side gets half the remaining space, capped at 300px max
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

/**
 * Main game board - players arranged around the center table
 * Player 1 & 2: top/bottom (horizontal layout)
 * Player 3 & 4: left/right (vertical layout)
 */
export function GameBoard({ gameEngine, onNewGame }: GameBoardProps) {
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [language, setLanguage] = useState<Language>('he');
  // Initialize with an estimate to avoid flash on first render
  const [middleRowHeight, setMiddleRowHeight] = useState(() => {
    const dims = getScreenDimensions();
    // Estimate: screen height minus top/bottom players, action buttons, safe area
    return Math.max(150, dims.height - 500);
  });

  useEffect(() => {
    loadLanguagePreference().then(lang => {
      setLanguage(lang);
    });
  }, []);

  const t = translations[language];
  
  // Get screen dimensions inside component (after React Native is initialized)
  const screenDims = React.useMemo(() => getScreenDimensions(), []);
  const screenWidth = screenDims.width;
  const screenHeight = screenDims.height;
  
  // Responsive values
  const responsive = React.useMemo(() => getResponsiveStyles(screenWidth, screenHeight), [screenWidth, screenHeight]);
  
  // Memoize styles to avoid recreating on every render
  const styles = React.useMemo(() => getStyles(screenWidth, screenHeight, responsive.sideWidth, responsive.isDesktop), [screenWidth, screenHeight, responsive.sideWidth, responsive.isDesktop]);

  // Handle middle row layout measurement
  const handleMiddleRowLayout = useCallback((e: LayoutChangeEvent) => {
    const { height } = e.nativeEvent.layout;
    if (height > 0) {
      setMiddleRowHeight(height);
    }
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
    endCurrentTurn,
    resetGame,
    updatePlayerNameAndAvatar,
  } = gameEngine;

  // Close modal handler
  const handleCloseModal = React.useCallback(() => {
    resetGame();
    onNewGame();
  }, [resetGame, onNewGame]);

  // Handle back button press to close modal (mobile only)
  React.useEffect(() => {
    if (isGameOver && Platform.OS !== 'web') {
      const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
        handleCloseModal();
        return true; // Prevent default back behavior
      });
      return () => backHandler.remove();
    }
  }, [isGameOver, handleCloseModal]);

  // Fixed face-to-face arrangement:
  // Player 1 ↔ Player 2 (top ↔ bottom)
  // Player 3 ↔ Player 4 (left ↔ right)
  const player1 = players[0] || null; // Top
  const player2 = players[1] || null; // Bottom
  const player3 = players[2] || null; // Left
  const player4 = players[3] || null; // Right

  // Stock-to-hand animation
  const stockRef = React.useRef<View | null>(null);
  const {
    cardsToAnimate,
    isAnimating,
    onAnimationComplete,
  } = useStockToHandAnimation(lastEvent);

  // Determine which player's cards were just drawn
  const getNewlyDrawnCardsForPlayer = React.useCallback((playerIndex: number): Card[] => {
    if (lastEvent?.type === 'HAND_REFILLED' && lastEvent.player.playerNumber === players[playerIndex]?.playerNumber) {
      const drawnCards = lastEvent.cards || [];
      console.log(`GameBoard: getNewlyDrawnCardsForPlayer - Player ${playerIndex} (${players[playerIndex]?.name}) drew ${drawnCards.length} cards:`, drawnCards.map(c => `${c.rank}${c.suit}`));
      return drawnCards;
    }
    return [];
  }, [lastEvent, players]);

  // Determine player position for animation direction
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

  const errorMessage = lastEvent?.type === 'INVALID_MOVE' ? lastEvent.message : null;
  const [showError, setShowError] = React.useState(false);

  React.useEffect(() => {
    if (errorMessage) {
      setShowError(true);
    }
  }, [errorMessage]);

  // Debug: Log when current player changes
  React.useEffect(() => {
    console.log('GameBoard: currentPlayer changed to', currentPlayer?.name, 'index:', currentPlayerIndex);
  }, [currentPlayer, currentPlayerIndex]);

  // Don't render if game hasn't started or no players
  if (!isGameStarted || players.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>{language === 'he' ? 'מתחיל משחק...' : 'Starting game...'}</Text>
        </View>
      </View>
    );
  }

  const currentPlayerData = currentPlayer ? {
    name: currentPlayer.name,
    avatar: currentPlayer.avatar,
  } : undefined;

  return (
    <View style={styles.container}>
      {/* Settings Button */}
      <TouchableOpacity
        style={styles.settingsButton}
        onPress={() => setSettingsVisible(true)}
        accessibilityRole="button"
        accessibilityLabel="Open settings"
        accessibilityHint="Open player settings to change name or avatar"
      >
        <Text style={styles.settingsButtonText}>⚙️</Text>
      </TouchableOpacity>

      {/* Settings Menu */}
      <SettingsMenu
        visible={settingsVisible}
        onClose={() => setSettingsVisible(false)}
        currentName={currentPlayerData?.name}
        currentAvatar={currentPlayerData?.avatar}
        onSave={(name, avatar) => {
          if (currentPlayerIndex >= 0) {
            updatePlayerNameAndAvatar(currentPlayerIndex, name, avatar);
          }
        }}
      />

      <ErrorToast
        message={errorMessage}
        visible={showError}
        onDismiss={() => setShowError(false)}
      />

      <SafeAreaView style={styles.safeArea}>
        {/* GAME LAYOUT: Flex column filling the screen */}
        <View style={styles.gameLayout}>
          {/* TOP PLAYER (Player 1 - horizontal, faces down) */}
          {player1 && (
            <View style={styles.topSection} key={`player-0-${player1.name}-${player1.avatar}`}>
              <PlayerArea
                player={player1}
                isCurrentPlayer={currentPlayerIndex === 0}
                selectedCard={currentPlayerIndex === 0 ? selectedCard : null}
                onSelectCard={currentPlayerIndex === 0 ? handleSelectCard : () => {}}
                onPlayToStorage={currentPlayerIndex === 0 ? playSelectedToStorage : () => {}}
                showHandCards={currentPlayerIndex === 0}
                showStorageCards={true}
                compact={currentPlayerIndex !== 0}
                position="top"
                newlyDrawnCards={getNewlyDrawnCardsForPlayer(0)}
              />
            </View>
          )}

          {/* MIDDLE ROW: Left Player - Center - Right Player */}
          <View 
            style={styles.middleRow}
            onLayout={handleMiddleRowLayout}
          >
            {/* LEFT PLAYER (Player 3 - rotated horizontal, faces right) */}
            {player3 && (
              <View 
                style={styles.leftSection} 
                key={`player-2-${player3.name}-${player3.avatar}`}
              >
                <PlayerArea
                  player={player3}
                  isCurrentPlayer={currentPlayerIndex === 2}
                  selectedCard={currentPlayerIndex === 2 ? selectedCard : null}
                  onSelectCard={currentPlayerIndex === 2 ? handleSelectCard : () => {}}
                  onPlayToStorage={currentPlayerIndex === 2 ? playSelectedToStorage : () => {}}
                  showHandCards={currentPlayerIndex === 2}
                  showStorageCards={true}
                  compact={currentPlayerIndex !== 2}
                  position="left"
                  newlyDrawnCards={getNewlyDrawnCardsForPlayer(2)}
                  containerWidth={responsive.sideWidth}
                  containerHeight={middleRowHeight}
                />
              </View>
            )}

            {/* CENTER - Piles and Stock */}
            <View style={styles.centerSection}>
              <CenterArea
                centerPiles={centerPiles}
                stockPileSize={stockPileSize}
                selectedCard={selectedCard}
                onPlayToCenter={playSelectedToCenter}
                currentPlayerName={currentPlayer?.name || ''}
                cardsPlayedThisTurn={cardsPlayedThisTurn}
                stockRef={stockRef}
              />
            </View>

            {/* RIGHT PLAYER (Player 4 - rotated horizontal, faces left) */}
            {player4 && (
              <View 
                style={styles.rightSection} 
                key={`player-3-${player4.name}-${player4.avatar}`}
              >
                <PlayerArea
                  player={player4}
                  isCurrentPlayer={currentPlayerIndex === 3}
                  selectedCard={currentPlayerIndex === 3 ? selectedCard : null}
                  onSelectCard={currentPlayerIndex === 3 ? handleSelectCard : () => {}}
                  onPlayToStorage={currentPlayerIndex === 3 ? playSelectedToStorage : () => {}}
                  showHandCards={currentPlayerIndex === 3}
                  showStorageCards={true}
                  compact={currentPlayerIndex !== 3}
                  position="right"
                  newlyDrawnCards={getNewlyDrawnCardsForPlayer(3)}
                  containerWidth={responsive.sideWidth}
                  containerHeight={middleRowHeight}
                />
              </View>
            )}
          </View>

          {/* Error message */}
          {errorMessage && (
            <View style={styles.messageBox}>
              <Text style={styles.messageText}>{errorMessage}</Text>
            </View>
          )}

          {/* BOTTOM PLAYER (Player 2 - horizontal, faces up) */}
          {player2 && (
            <View style={styles.bottomSection} key={`player-1-${player2.name}-${player2.avatar}`}>
              <PlayerArea
                player={player2}
                isCurrentPlayer={currentPlayerIndex === 1}
                selectedCard={currentPlayerIndex === 1 ? selectedCard : null}
                onSelectCard={currentPlayerIndex === 1 ? handleSelectCard : () => {}}
                onPlayToStorage={currentPlayerIndex === 1 ? playSelectedToStorage : () => {}}
                showHandCards={currentPlayerIndex === 1}
                showStorageCards={true}
                compact={currentPlayerIndex !== 1}
                position="bottom"
                newlyDrawnCards={getNewlyDrawnCardsForPlayer(1)}
              />
            </View>
          )}

          {/* Action buttons for current player - always at bottom */}
          {currentPlayer && (
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={[styles.button, !canEndCurrentTurn && styles.buttonDisabled]}
                onPress={endCurrentTurn}
                disabled={!canEndCurrentTurn}
                accessibilityRole="button"
                accessibilityLabel={language === 'he' ? 'סיים תור' : 'End turn'}
                accessibilityHint={language === 'he' 
                  ? canEndCurrentTurn ? 'סיים את התור שלך והעבר לשחקן הבא' : 'עליך לשחק לפחות קלף אחד לפני סיום התור'
                  : canEndCurrentTurn ? "End your turn and pass to next player" : "You must play at least one card before ending your turn"}
                accessibilityState={{ disabled: !canEndCurrentTurn }}
              >
                <Text style={styles.buttonText}>{t.endTurn}</Text>
              </TouchableOpacity>
              {selectedCard && (
                <TouchableOpacity
                  style={[styles.button, styles.cancelButton]}
                  onPress={clearSelection}
                  accessibilityRole="button"
                  accessibilityLabel={language === 'he' ? 'בטל בחירה' : 'Cancel selection'}
                  accessibilityHint={language === 'he' ? 'בטל את הבחירה הנוכחית' : 'Deselect the currently selected card'}
                >
                  <Text style={styles.buttonText}>{t.cancel}</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      </SafeAreaView>

      {/* Stock to Hand Animation */}
      {isAnimating && currentPlayer && (
        <StockToHandAnimation
          cardsToAnimate={cardsToAnimate}
          stockRef={stockRef}
          playerPosition={getPlayerPosition(currentPlayerIndex)}
          onAnimationComplete={onAnimationComplete}
        />
      )}

      {/* Game Over Modal */}
      <Modal 
        visible={isGameOver} 
        transparent 
        animationType="fade"
        onRequestClose={handleCloseModal}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1}
          onPress={handleCloseModal}
        >
          <TouchableOpacity 
            style={styles.modalContent} 
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            <Text style={styles.modalTitle} accessibilityRole="header">{t.gameOver}</Text>
            <Text style={styles.winnerText} accessibilityRole="text" accessibilityLabel={language === 'he' ? `${winner?.name} ניצח` : `${winner?.name} wins`}>
              {winner?.name} {t.wins}
            </Text>
            <TouchableOpacity
              style={styles.newGameButton}
              onPress={handleCloseModal}
              accessibilityRole="button"
              accessibilityLabel={language === 'he' ? 'התחל משחק חדש' : 'Start new game'}
              accessibilityHint={language === 'he' ? 'סגור את הדיאלוג וחזור למסך הבית כדי להתחיל משחק חדש' : 'Close this dialog and return to the home screen to start a new game'}
            >
              <Text style={styles.newGameButtonText}>{t.newGame}</Text>
            </TouchableOpacity>
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
      backgroundColor: colors.background, // Felt green background
    },
    safeArea: {
      flex: 1,
    },
    gameLayout: {
      flex: 1,
      flexDirection: 'column',
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
      ? { justifyContent: 'center' as const, alignItems: 'center' as const }
      : { width: sideWidth, height: '100%' as const, justifyContent: 'center' as const, alignItems: 'center' as const },
    centerSection: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      minWidth: 0,
      paddingHorizontal: responsive.centerPaddingHorizontal,
    },
    rightSection: isDesktop
      ? { justifyContent: 'center' as const, alignItems: 'center' as const }
      : { width: sideWidth, height: '100%' as const, justifyContent: 'center' as const, alignItems: 'center' as const },
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
    modalTitle: {
      fontSize: 32,
      fontWeight: 'bold',
      color: colors.gold,
      marginBottom: 15,
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
    newGameButtonText: {
      color: colors.background,
      fontSize: 20,
      fontWeight: 'bold',
    },
  });
};

export default GameBoard;
