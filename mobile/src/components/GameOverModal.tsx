import React from 'react';
import { View, Modal, TouchableOpacity, Text, StyleSheet, Share, Platform } from 'react-native';
import { Player, getPersonalPileSize } from '../models';
import { colors } from '../theme/colors';

type Language = 'he' | 'en';

const translations = {
  he: {
    gameOver: 'המשחק נגמר!',
    youWon: 'ניצחת!',
    wins: 'ניצח!',
    newGame: 'משחק חדש',
    playAgain: 'שחק שוב',
    results: 'תוצאות',
    cardsLeft: 'קלפים נותרו',
    share: 'שתף',
    rank: 'מקום',
  },
  en: {
    gameOver: 'Game Over!',
    youWon: 'You Won!',
    wins: 'wins!',
    newGame: 'New Game',
    playAgain: 'Play Again',
    results: 'Results',
    cardsLeft: 'cards left',
    share: 'Share',
    rank: 'Rank',
  },
};

interface GameOverModalProps {
  visible: boolean;
  winner: Player | null;
  language: Language;
  onClose: () => void;
  players?: Player[];
  turnCount?: number;
}

function getRankEmoji(rank: number): string {
  switch (rank) {
    case 1: return '🥇';
    case 2: return '🥈';
    case 3: return '🥉';
    default: return `#${rank}`;
  }
}

export function GameOverModal({ visible, winner, language, onClose, players, turnCount }: GameOverModalProps) {
  const t = translations[language];
  const humanWon = winner && !winner.isAI;

  const sortedPlayers = React.useMemo(() => {
    if (!players || players.length === 0) return [];
    return [...players].sort((a, b) => {
      if (winner && a.playerNumber === winner.playerNumber) return -1;
      if (winner && b.playerNumber === winner.playerNumber) return 1;
      return getPersonalPileSize(a) - getPersonalPileSize(b);
    });
  }, [players, winner]);

  const handleShare = async () => {
    if (!winner) return;
    const rankLines = sortedPlayers.map((p, i) => {
      const pileLeft = getPersonalPileSize(p);
      return `${getRankEmoji(i + 1)} ${p.name}: ${pileLeft} ${t.cardsLeft}`;
    }).join('\n');

    const message = language === 'he'
      ? `21 Card Game\n${winner.name} ${t.wins}\n\n${rankLines}${turnCount ? `\n\nתורות: ${turnCount}` : ''}`
      : `21 Card Game\n${winner.name} ${t.wins}\n\n${rankLines}${turnCount ? `\n\nTurns: ${turnCount}` : ''}`;

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

          {/* Results Table */}
          {sortedPlayers.length > 0 && (
            <View style={styles.resultsContainer}>
              <Text style={styles.resultsTitle}>{t.results}</Text>
              {sortedPlayers.map((player, index) => {
                const pileLeft = getPersonalPileSize(player);
                const isWinner = winner && player.playerNumber === winner.playerNumber;
                return (
                  <View
                    key={player.playerNumber}
                    style={[styles.resultRow, isWinner && styles.resultRowWinner]}
                    accessibilityLabel={`${getRankEmoji(index + 1)} ${player.name}: ${pileLeft} ${t.cardsLeft}`}
                  >
                    <Text style={styles.resultRank}>{getRankEmoji(index + 1)}</Text>
                    <Text style={styles.resultAvatar}>{player.avatar || '😎'}</Text>
                    <Text style={[styles.resultName, isWinner && styles.resultNameWinner]} numberOfLines={1}>
                      {player.name}
                    </Text>
                    <Text style={[styles.resultCards, isWinner && styles.resultCardsWinner]}>
                      {pileLeft} {t.cardsLeft}
                    </Text>
                  </View>
                );
              })}
              {turnCount != null && turnCount > 0 && (
                <Text style={styles.turnCount}>
                  {language === 'he' ? `${turnCount} תורות` : `${turnCount} turns`}
                </Text>
              )}
            </View>
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
  resultsContainer: {
    width: '100%',
    backgroundColor: `${colors.secondary}88`,
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  resultsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.mutedForeground,
    textAlign: 'center',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 4,
    borderRadius: 8,
    gap: 8,
  },
  resultRowWinner: {
    backgroundColor: `${colors.gold}22`,
  },
  resultRank: {
    fontSize: 18,
    width: 30,
    textAlign: 'center',
  },
  resultAvatar: {
    fontSize: 20,
    width: 28,
    textAlign: 'center',
  },
  resultName: {
    flex: 1,
    fontSize: 14,
    color: colors.foreground,
    fontWeight: '500',
  },
  resultNameWinner: {
    fontWeight: 'bold',
    color: colors.gold,
  },
  resultCards: {
    fontSize: 12,
    color: colors.mutedForeground,
  },
  resultCardsWinner: {
    color: colors.gold,
    fontWeight: '600',
  },
  turnCount: {
    fontSize: 12,
    color: colors.mutedForeground,
    textAlign: 'center',
    marginTop: 8,
    fontStyle: 'italic',
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
