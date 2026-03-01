import React from 'react';
import { View, Modal, TouchableOpacity, Text, StyleSheet, Share, Platform } from 'react-native';
import { Player } from '../models';
import { colors } from '../theme/colors';

type Language = 'he' | 'en';

const translations = {
  he: {
    gameOver: 'המשחק נגמר!',
    youWon: 'ניצחת!',
    wins: 'ניצח!',
    newGame: 'משחק חדש',
    playAgain: 'שחק שוב',
    share: 'שתף',
  },
  en: {
    gameOver: 'Game Over!',
    youWon: 'You Won!',
    wins: 'wins!',
    newGame: 'New Game',
    playAgain: 'Play Again',
    share: 'Share',
  },
};

interface GameOverModalProps {
  visible: boolean;
  winner: Player | null;
  language: Language;
  onClose: () => void;
}

export function GameOverModal({ visible, winner, language, onClose }: GameOverModalProps) {
  const t = translations[language];
  const humanWon = winner && !winner.isAI;

  const handleShare = async () => {
    if (!winner) return;
    const message = language === 'he'
      ? `21 Card Game\n${winner.name} ${t.wins}`
      : `21 Card Game\n${winner.name} ${t.wins}`;

    try {
      await Share.share({ message });
    } catch {
      // Share not available or cancelled
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity
          style={[styles.modalContent, humanWon && styles.modalContentWin]}
          activeOpacity={1}
          onPress={(e) => e.stopPropagation()}
          accessibilityRole="alert"
          accessibilityLabel={
            humanWon
              ? (language === 'he' ? 'ניצחת!' : 'You Won!')
              : `${winner?.name} ${t.wins}`
          }
        >
          {/* Title */}
          <Text
            style={humanWon ? styles.youWonTitle : styles.modalTitle}
            accessibilityRole="header"
          >
            {humanWon ? `🎉 ${t.youWon} 🎉` : t.gameOver}
          </Text>

          {!humanWon && winner && (
            <Text style={styles.winnerText} accessibilityRole="text">
              {winner.avatar} {winner.name} {t.wins}
            </Text>
          )}

          {/* Actions */}
          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={humanWon ? styles.playAgainButton : styles.newGameButton}
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel={humanWon ? t.playAgain : t.newGame}
            >
              <Text style={styles.buttonText}>{humanWon ? t.playAgain : t.newGame}</Text>
            </TouchableOpacity>

            {Platform.OS !== 'web' && (
              <TouchableOpacity
                style={styles.shareButton}
                onPress={handleShare}
                accessibilityRole="button"
                accessibilityLabel={t.share}
              >
                <Text style={styles.shareButtonText}>{t.share}</Text>
              </TouchableOpacity>
            )}
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: colors.background,
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.gold,
    shadowColor: colors.gold,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 20,
    minWidth: 280,
    maxWidth: 360,
  },
  modalContentWin: {
    borderColor: '#4CAF50',
    shadowColor: '#4CAF50',
  },
  modalTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.gold,
    marginBottom: 8,
    textAlign: 'center',
  },
  youWonTitle: {
    fontSize: 30,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 12,
    textAlign: 'center',
  },
  winnerText: {
    fontSize: 20,
    color: colors.foreground,
    marginBottom: 16,
    fontWeight: '600',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  newGameButton: {
    backgroundColor: colors.gold,
    paddingHorizontal: 32,
    paddingVertical: 14,
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
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#66BB6A',
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  shareButton: {
    backgroundColor: colors.secondary,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  shareButtonText: {
    color: colors.foreground,
    fontSize: 16,
    fontWeight: '600',
  },
  buttonText: {
    color: colors.background,
    fontSize: 18,
    fontWeight: 'bold',
  },
});
