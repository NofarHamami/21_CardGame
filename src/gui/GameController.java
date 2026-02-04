package gui;

import engine.GameEngine;
import engine.GameEngine.CardSource;
import model.Card;
import model.Player;

import javax.swing.*;

/**
 * Controller that connects the GUI with the game engine.
 * Handles user interactions and updates the view.
 */
public class GameController implements 
        GameEngine.GameEventListener,
        PlayerPanel.CardSelectionListener,
        CenterPanel.CenterPileClickListener {
    
    private GameEngine engine;
    private GameWindow window;
    
    // Current selection state
    private int selectedPlayerIndex = -1;
    private CardSource selectedSource = null;
    private int selectedSourceIndex = -1;

    public GameController(GameEngine engine, GameWindow window) {
        this.engine = engine;
        this.window = window;
        
        engine.addListener(this);
    }

    // ============ CardSelectionListener Implementation ============

    @Override
    public void onHandCardSelected(int playerIndex, int cardIndex) {
        if (playerIndex != engine.getCurrentPlayerIndex()) return;
        
        // Toggle selection or select new card
        if (selectedPlayerIndex == playerIndex && 
            selectedSource == CardSource.HAND && 
            selectedSourceIndex == cardIndex) {
            // Clicking same card - deselect
            clearSelection();
        } else {
            // Select this card
            selectCard(playerIndex, CardSource.HAND, cardIndex);
        }
        window.refreshDisplay();
    }

    @Override
    public void onPersonalPileSelected(int playerIndex) {
        if (playerIndex != engine.getCurrentPlayerIndex()) return;
        
        // Toggle selection
        if (selectedPlayerIndex == playerIndex && selectedSource == CardSource.PERSONAL_PILE) {
            clearSelection();
        } else {
            selectCard(playerIndex, CardSource.PERSONAL_PILE, 0);
        }
        window.refreshDisplay();
    }

    @Override
    public void onStorageSelected(int playerIndex, int stackIndex) {
        if (playerIndex != engine.getCurrentPlayerIndex()) return;
        
        // If a card is selected, try to play it to this storage
        if (hasSelection()) {
            boolean success = engine.playToStorage(selectedSource, selectedSourceIndex, stackIndex);
            if (success) {
                clearSelection();
            }
            window.refreshDisplay();
        }
    }

    @Override
    public void onStorageCardPlayRequest(int playerIndex, int stackIndex) {
        if (playerIndex != engine.getCurrentPlayerIndex()) return;
        
        // Select the storage card for playing
        if (selectedPlayerIndex == playerIndex && 
            selectedSource == CardSource.STORAGE && 
            selectedSourceIndex == stackIndex) {
            clearSelection();
        } else {
            selectCard(playerIndex, CardSource.STORAGE, stackIndex);
        }
        window.refreshDisplay();
    }

    // ============ CenterPileClickListener Implementation ============

    @Override
    public void onCenterPileClicked(int pileIndex) {
        if (!hasSelection()) {
            window.showMessage("Select a card first, then click a center pile to play it.");
            return;
        }
        
        boolean success = engine.playToCenter(selectedSource, selectedSourceIndex, pileIndex);
        if (success) {
            clearSelection();
        }
        window.refreshDisplay();
    }

    // ============ GameEventListener Implementation ============

    @Override
    public void onGameStarted() {
        String msg = "Game started! " + engine.getCurrentPlayer().getName() + "'s turn.";
        window.showMessage(msg);
        window.getCenterPanel().setMessage(msg);
        window.refreshDisplay();
    }

    @Override
    public void onTurnChanged(Player player) {
        clearSelection();
        String msg = player.getName() + "'s turn. Play at least 1 card.";
        window.showMessage(msg);
        window.getCenterPanel().setMessage(msg);
        window.refreshDisplay();
    }

    @Override
    public void onCardPlayed(Player player, Card card, String destination) {
        String msg = player.getName() + " played " + card + " to " + destination;
        window.showMessage(msg);
        window.getCenterPanel().setMessage(msg);
        window.refreshDisplay();
    }

    @Override
    public void onHandRefilled(Player player, int cardsDrawn) {
        String msg = player.getName() + " drew " + cardsDrawn + " cards.";
        window.showMessage(msg);
        window.getCenterPanel().setMessage(msg);
        window.refreshDisplay();
    }

    @Override
    public void onPileCompleted(int pileIndex, int cardsReturned) {
        String msg = "Pile " + (pileIndex + 1) + " completed! " + cardsReturned + " cards returned to stock.";
        window.showMessage(msg);
        window.getCenterPanel().setMessage(msg);
        window.refreshDisplay();
    }

    @Override
    public void onGameOver(Player winner) {
        String msg = winner.getName() + " WINS!";
        window.showMessage(msg);
        window.getCenterPanel().setMessage(msg);
        window.showWinDialog(winner);
    }

    @Override
    public void onInvalidMove(String message) {
        String msg = "Invalid: " + message;
        window.showMessage(msg);
        window.getCenterPanel().setMessage(msg);
    }

    // ============ Selection Management ============

    private void selectCard(int playerIndex, CardSource source, int sourceIndex) {
        clearSelection();
        selectedPlayerIndex = playerIndex;
        selectedSource = source;
        selectedSourceIndex = sourceIndex;
        
        // Update visual selection in player panel
        PlayerPanel panel = window.getPlayerPanel(playerIndex);
        if (panel != null) {
            switch (source) {
                case HAND:
                    panel.setSelectedHandCard(sourceIndex);
                    break;
                case PERSONAL_PILE:
                    panel.setSelectedPersonalPile(true);
                    break;
                case STORAGE:
                    panel.setSelectedStorageCard(sourceIndex);
                    break;
            }
        }
    }

    private void clearSelection() {
        selectedPlayerIndex = -1;
        selectedSource = null;
        selectedSourceIndex = -1;
        
        // Clear visual selection in all player panels
        for (int i = 0; i < engine.getNumPlayers(); i++) {
            PlayerPanel panel = window.getPlayerPanel(i);
            if (panel != null) {
                panel.clearSelection();
            }
        }
    }

    private boolean hasSelection() {
        return selectedSource != null && selectedPlayerIndex >= 0;
    }

    // ============ Actions ============

    public void endTurn() {
        if (engine.canEndTurn()) {
            engine.endTurn();
        } else {
            window.showMessage("You must play at least 1 card before ending your turn.");
        }
    }

    public void startNewGame(int numPlayers) {
        clearSelection();
        engine.setupGame(numPlayers);
    }
}
