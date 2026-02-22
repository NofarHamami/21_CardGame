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
  Animated,
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
import { ConfettiAnimation } from './ConfettiAnimation';
import { loadLanguagePreference } from '../utils/storage';
import { isMuted, setMuted } from '../utils/sounds';
import { logger } from '../utils/logger';

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
  const [language, setLanguage] = useState<Language>('he');
  const [soundMuted, setSoundMuted] = useState(isMuted());
  const [middleRowHeight, setMiddleRowHeight] = useState(() => {
    const dims = getScreenDimensions();
    return Math.max(150, dims.height - 500);
  });

  // Turn pulse animation
  const turnPulseAnim = React.useRef(new Animated.Value(1)).current;

  useEffect(() => {
    loadLanguagePreference().then(lang => setLanguage(lang));
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

  const handleToggleMute = () => {
    const newMuted = !soundMuted;
    setSoundMuted(newMuted);
    setMuted(newMuted);
  };

  const errorMessage = lastEvent?.type === 'INVALID_MOVE' ? lastEvent.message : null;
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

      {/* Mute Button */}
      <TouchableOpacity
        style={styles.muteButton}
        onPress={handleToggleMute}
        accessibilityRole="button"
        accessibilityLabel={soundMuted ? 'Unmute' : 'Mute'}
      >
        <Text style={styles.settingsButtonText}>{soundMuted ? '🔇' : '🔊'}</Text>
      </TouchableOpacity>

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
              />
            </Animated.View>
          )}

          {/* MIDDLE ROW */}
          <View style={styles.middleRow} onLayout={handleMiddleRowLayout}>
            {player3 && (
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
                />
              </View>
            )}

            <View style={styles.centerSection}>
              <CenterArea
                centerPiles={centerPiles}
                stockPileSize={stockPileSize}
                selectedCard={!isCurrentPlayerAI ? selectedCard : null}
                onPlayToCenter={!isCurrentPlayerAI ? playSelectedToCenter : () => {}}
                currentPlayerName={currentPlayer?.name || ''}
                cardsPlayedThisTurn={cardsPlayedThisTurn}
                stockRef={stockRef}
                isAITurn={isCurrentPlayerAI}
              />
            </View>

            {player4 && (
              <View style={styles.rightSection} key={`player-3-${player4.name}-${player4.avatar}`}>
                <PlayerArea
                  player={player4}
                  isCurrentPlayer={currentPlayerIndex === 3}
                  selectedCard={currentPlayerIndex === 3 && !isCurrentPlayerAI ? selectedCard : null}
                  onSelectCard={currentPlayerIndex === 3 && !isCurrentPlayerAI ? handleSelectCard : () => {}}
                  onPlayToStorage={currentPlayerIndex === 3 && !isCurrentPlayerAI ? playSelectedToStorage : () => {}}
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
              />
            </Animated.View>
          )}

          {/* Action buttons - hidden during AI turns */}
          {currentPlayer && !isCurrentPlayerAI && (
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={[styles.button, !canEndCurrentTurn && styles.buttonDisabled]}
                onPress={endCurrentTurn}
                disabled={!canEndCurrentTurn}
                accessibilityRole="button"
                accessibilityLabel={language === 'he' ? 'סיים תור' : 'End turn'}
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
                >
                  <Text style={styles.buttonText}>{t.cancel}</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* AI thinking indicator */}
          {isCurrentPlayerAI && (
            <View style={styles.actionButtons}>
              <View style={styles.aiIndicator}>
                <Text style={styles.aiIndicatorText}>
                  {language === 'he' ? `${currentPlayer?.name} חושב...` : `${currentPlayer?.name} is thinking...`}
                </Text>
              </View>
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

      {/* Confetti on win */}
      <ConfettiAnimation visible={isGameOver && !!winner} />

      {/* Game Over Modal */}
      <Modal visible={isGameOver} transparent animationType="fade" onRequestClose={handleCloseModal}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={handleCloseModal}>
          <TouchableOpacity style={styles.modalContent} activeOpacity={1} onPress={(e) => e.stopPropagation()}>
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
    muteButton: {
      position: 'absolute',
      top: 50,
      left: 64,
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
    aiIndicator: {
      backgroundColor: colors.secondary,
      paddingHorizontal: 20,
      paddingVertical: 10,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
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
