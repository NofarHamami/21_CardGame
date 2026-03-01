import React from 'react';
import { Modal, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Player } from '../models';
import { colors } from '../theme/colors';

type Language = 'he' | 'en';

const translations = {
  he: {
    youWon: 'ניצחת!',
    wins: 'ניצח!',
    playAgain: 'שחק שוב',
  },
  en: {
    youWon: 'You Won!',
    wins: 'wins!',
    playAgain: 'Play Again',
  },
};

interface GameOverModalProps {
  visible: boolean;
  winner: Player | null;
  language: Language;
  turnsPlayed?: number;
  players?: Array<{ name: string; cardsRemaining: number }>;
  onClose: () => void;
  onRematch?: () => void;
}

export function GameOverModal({ visible, winner, language, onClose }: GameOverModalProps) {
  const t = translations[language];
  const humanWon = winner && !winner.isAI;

  const title = humanWon
    ? `🎉 ${t.youWon} 🎉`
    : `${winner?.avatar ?? ''} ${winner?.name ?? ''} ${t.wins}`;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity
          style={[styles.modalContent, humanWon && styles.modalContentWin]}
          activeOpacity={1}
          onPress={(e) => e.stopPropagation()}
          accessibilityRole="alert"
          accessibilityLabel={title}
        >
          <Text
            style={humanWon ? styles.youWonTitle : styles.modalTitle}
            accessibilityRole="header"
          >
            {title}
          </Text>

          <TouchableOpacity
            style={humanWon ? styles.playAgainButton : styles.playAgainButton}
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel={t.playAgain}
          >
            <Text style={styles.buttonText}>{t.playAgain}</Text>
          </TouchableOpacity>
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
    borderColor: colors.success,
    shadowColor: colors.success,
  },
  modalTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.gold,
    marginBottom: 20,
    textAlign: 'center',
  },
  youWonTitle: {
    fontSize: 30,
    fontWeight: 'bold',
    color: colors.success,
    marginBottom: 20,
    textAlign: 'center',
  },
  playAgainButton: {
    backgroundColor: colors.success,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.success,
    shadowColor: colors.success,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  buttonText: {
    color: colors.background,
    fontSize: 18,
    fontWeight: 'bold',
  },
});
