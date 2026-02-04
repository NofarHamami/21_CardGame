package engine;

import model.*;
import java.util.ArrayList;
import java.util.List;

/**
 * Main game engine that manages the 21 card game logic.
 * Handles turn management, card placement, and win conditions.
 */
public class GameEngine {
    private List<Player> players;
    private CenterPile[] centerPiles;
    private Deck stockPile;
    private int currentPlayerIndex;
    private boolean gameStarted;
    private boolean gameOver;
    private Player winner;
    private int cardsPlayedThisTurn;
    private boolean playedToCenterThisTurn; // Once true, cannot play to storage
    
    public static final int NUM_CENTER_PILES = 4;
    public static final int MIN_PLAYERS = 2;
    public static final int MAX_PLAYERS = 4;

    // Card source for the selected card
    public enum CardSource {
        HAND,
        PERSONAL_PILE,
        STORAGE
    }

    // Listeners for game events
    private List<GameEventListener> listeners;

    public interface GameEventListener {
        void onGameStarted();
        void onTurnChanged(Player player);
        void onCardPlayed(Player player, Card card, String destination);
        void onHandRefilled(Player player, int cardsDrawn);
        void onPileCompleted(int pileIndex, int cardsReturned);
        void onGameOver(Player winner);
        void onInvalidMove(String message);
    }

    public GameEngine() {
        players = new ArrayList<>();
        centerPiles = new CenterPile[NUM_CENTER_PILES];
        for (int i = 0; i < NUM_CENTER_PILES; i++) {
            centerPiles[i] = new CenterPile();
        }
        listeners = new ArrayList<>();
        gameStarted = false;
        gameOver = false;
    }

    public void addListener(GameEventListener listener) {
        listeners.add(listener);
    }

    public void removeListener(GameEventListener listener) {
        listeners.remove(listener);
    }

    // ============ Game Setup ============

    /**
     * Sets up a new game with the specified number of players.
     * @param numPlayers Number of players (2-4)
     */
    public void setupGame(int numPlayers) {
        if (numPlayers < MIN_PLAYERS || numPlayers > MAX_PLAYERS) {
            throw new IllegalArgumentException("Number of players must be between " + 
                MIN_PLAYERS + " and " + MAX_PLAYERS);
        }

        // Reset state
        players.clear();
        for (CenterPile pile : centerPiles) {
            pile.clear();
        }
        gameStarted = false;
        gameOver = false;
        winner = null;
        currentPlayerIndex = 0;
        cardsPlayedThisTurn = 0;
        playedToCenterThisTurn = false;

        // Create players
        for (int i = 0; i < numPlayers; i++) {
            players.add(new Player("Player " + (i + 1), i + 1));
        }

        // Create and shuffle deck(s)
        // We need: 5 hand + 21 pile = 26 cards per player
        // Plus cards for the stock pile for drawing during the game
        // Use enough decks to ensure sufficient stock pile (3 decks = 156 cards)
        int decksNeeded = 3;
        stockPile = Deck.createMultipleDecks(decksNeeded);
        stockPile.shuffle();

        // Deal cards to players
        for (Player player : players) {
            List<Card> handCards = stockPile.draw(Player.MAX_HAND_SIZE);
            List<Card> pileCards = stockPile.draw(Player.PERSONAL_PILE_SIZE);
            player.setupInitialCards(handCards, pileCards);
        }
        gameStarted = true;
        notifyGameStarted();
        notifyTurnChanged();
    }

    // ============ Game Actions ============

    /**
     * Attempts to play a card from the current player to a center pile.
     * @param source Where the card is coming from (hand, personal pile, or storage)
     * @param sourceIndex Index within the source (hand index or storage stack index)
     * @param centerPileIndex Which center pile to play to (0-3)
     * @return true if successful
     */
    public boolean playToCenter(CardSource source, int sourceIndex, int centerPileIndex) {
        if (!gameStarted || gameOver) return false;

        Player player = getCurrentPlayer();
        Card card = getCardFromSource(player, source, sourceIndex);
        
        if (card == null) {
            notifyInvalidMove("No card at that position");
            return false;
        }

        if (centerPileIndex < 0 || centerPileIndex >= NUM_CENTER_PILES) {
            notifyInvalidMove("Invalid center pile");
            return false;
        }

        CenterPile pile = centerPiles[centerPileIndex];
        if (!pile.canPlace(card)) {
            notifyInvalidMove("Cannot place " + card + " on this pile (needs " + pile.getExpectedNextRank() + ")");
            return false;
        }

        // Remove card from source
        removeCardFromSource(player, source, sourceIndex);
        
        // Place on center pile
        pile.place(card);
        cardsPlayedThisTurn++;
        playedToCenterThisTurn = true; // Once played to center, cannot play to storage this turn
        
        notifyCardPlayed(player, card, "Center Pile " + (centerPileIndex + 1));

        // Check if pile is complete (reached Queen) - return cards to stock and shuffle
        if (pile.isComplete()) {
            List<Card> completedCards = pile.collectAndClear();
            stockPile.addCards(completedCards);
            stockPile.shuffle();
            notifyPileCompleted(centerPileIndex, completedCards.size());
        }

        // Check for win condition
        if (player.hasWon()) {
            endGame(player);
            return true;
        }

        // Check if hand is empty - refill and continue
        checkAndRefillHand(player);

        return true;
    }

    /**
     * Plays a card from the current player to their storage (ends turn).
     * Only cards from HAND can go to storage - not from 21-pile or other storage.
     * @param source Where the card is coming from (must be HAND)
     * @param sourceIndex Index within the hand
     * @param storageIndex Which storage stack to place on (0-4)
     * @return true if successful
     */
    public boolean playToStorage(CardSource source, int sourceIndex, int storageIndex) {
        if (!gameStarted || gameOver) return false;

        Player player = getCurrentPlayer();
        
        // Cannot play to storage if you've already played to a center pile this turn
        // EXCEPTION: If you have 5 cards in hand, you MUST be able to play to storage
        // (otherwise you'd be stuck - can't end turn with 5 cards)
        if (playedToCenterThisTurn && !player.isHandFull()) {
            notifyInvalidMove("Cannot play to storage after playing to center piles. End your turn or continue playing to center.");
            return false;
        }
        
        // Can only play from HAND to storage
        // Cannot play from 21-pile to storage (21-pile only goes to center piles)
        // Cannot move cards between storage stacks
        if (source == CardSource.STORAGE) {
            notifyInvalidMove("Cannot move cards between storage stacks");
            return false;
        }
        
        if (source == CardSource.PERSONAL_PILE) {
            notifyInvalidMove("Cards from your 21-pile can only be played to center piles, not storage");
            return false;
        }

        Card card = getCardFromSource(player, source, sourceIndex);
        
        if (card == null) {
            notifyInvalidMove("No card at that position");
            return false;
        }

        if (storageIndex < 0 || storageIndex >= Player.STORAGE_STACKS) {
            notifyInvalidMove("Invalid storage stack");
            return false;
        }

        // Remove card from source
        removeCardFromSource(player, source, sourceIndex);
        
        // Place in storage
        player.addToStorage(storageIndex, card);
        cardsPlayedThisTurn++;
        
        notifyCardPlayed(player, card, "Storage " + (storageIndex + 1));

        // Check for win condition (unlikely from storage, but check anyway)
        if (player.hasWon()) {
            endGame(player);
            return true;
        }

        // Playing to storage ends the turn immediately
        nextTurn();
        return true;
    }

    /**
     * Ends the current player's turn.
     * Requirements:
     * - Must have played at least 1 card
     * - Cannot have a full hand (5 cards) - must play or store at least one hand card
     * @return true if turn was ended
     */
    public boolean endTurn() {
        if (!gameStarted || gameOver) return false;

        Player player = getCurrentPlayer();
        
        if (cardsPlayedThisTurn == 0) {
            notifyInvalidMove("You must play at least 1 card before ending your turn");
            return false;
        }
        
        if (player.isHandFull()) {
            notifyInvalidMove("You cannot end your turn with 5 cards in hand. Play or store a card first.");
            return false;
        }

        nextTurn();
        return true;
    }

    /**
     * Checks if the current player can end their turn.
     * Must have played at least 1 card AND not have a full hand.
     */
    public boolean canEndTurn() {
        if (!gameStarted || gameOver) return false;
        Player player = getCurrentPlayer();
        return cardsPlayedThisTurn > 0 && !player.isHandFull();
    }

    // ============ Private Helper Methods ============

    private Card getCardFromSource(Player player, CardSource source, int index) {
        switch (source) {
            case HAND:
                return player.getHandCard(index);
            case PERSONAL_PILE:
                return player.getPersonalPileTop();
            case STORAGE:
                return player.getStorageTop(index);
            default:
                return null;
        }
    }

    private void removeCardFromSource(Player player, CardSource source, int index) {
        switch (source) {
            case HAND:
                player.removeFromHand(index);
                break;
            case PERSONAL_PILE:
                player.removeFromPersonalPile();
                break;
            case STORAGE:
                player.removeFromStorage(index);
                break;
        }
    }

    private void checkAndRefillHand(Player player) {
        if (player.isHandEmpty() && !stockPile.isEmpty()) {
            int cardsToDraw = Math.min(Player.MAX_HAND_SIZE, stockPile.size());
            List<Card> drawnCards = stockPile.draw(cardsToDraw);
            player.addToHand(drawnCards);
            notifyHandRefilled(player, drawnCards.size());
        }
    }

    private void nextTurn() {
        // Move to next player
        currentPlayerIndex = (currentPlayerIndex + 1) % players.size();
        cardsPlayedThisTurn = 0;
        playedToCenterThisTurn = false; // Reset for new turn
        
        // Refill current player's hand to 5 at the start of their turn
        refillCurrentPlayerHand();

        notifyTurnChanged();
    }
    
    /**
     * Refills the current player's hand to 5 cards from the stock pile.
     * Called at the start of each turn.
     */
    private void refillCurrentPlayerHand() {
        Player player = getCurrentPlayer();
        if (player == null || stockPile == null) return;
        
        int neededCards = player.cardsNeededToFillHand();
        if (neededCards > 0 && !stockPile.isEmpty()) {
            int cardsToDraw = Math.min(neededCards, stockPile.size());
            List<Card> drawnCards = stockPile.draw(cardsToDraw);
            if (!drawnCards.isEmpty()) {
                player.addToHand(drawnCards);
                notifyHandRefilled(player, drawnCards.size());
            }
        }
    }

    private void endGame(Player winningPlayer) {
        gameOver = true;
        winner = winningPlayer;
        notifyGameOver(winningPlayer);
    }

    // ============ Notification Methods ============

    private void notifyGameStarted() {
        for (GameEventListener listener : listeners) {
            listener.onGameStarted();
        }
    }

    private void notifyTurnChanged() {
        for (GameEventListener listener : listeners) {
            listener.onTurnChanged(getCurrentPlayer());
        }
    }

    private void notifyCardPlayed(Player player, Card card, String destination) {
        for (GameEventListener listener : listeners) {
            listener.onCardPlayed(player, card, destination);
        }
    }

    private void notifyHandRefilled(Player player, int cardsDrawn) {
        for (GameEventListener listener : listeners) {
            listener.onHandRefilled(player, cardsDrawn);
        }
    }

    private void notifyPileCompleted(int pileIndex, int cardsReturned) {
        for (GameEventListener listener : listeners) {
            listener.onPileCompleted(pileIndex, cardsReturned);
        }
    }

    private void notifyGameOver(Player winner) {
        for (GameEventListener listener : listeners) {
            listener.onGameOver(winner);
        }
    }

    private void notifyInvalidMove(String message) {
        for (GameEventListener listener : listeners) {
            listener.onInvalidMove(message);
        }
    }

    // ============ Getters ============

    public Player getCurrentPlayer() {
        if (players.isEmpty()) return null;
        return players.get(currentPlayerIndex);
    }

    public int getCurrentPlayerIndex() {
        return currentPlayerIndex;
    }

    public List<Player> getPlayers() {
        return new ArrayList<>(players);
    }

    public Player getPlayer(int index) {
        if (index >= 0 && index < players.size()) {
            return players.get(index);
        }
        return null;
    }

    public CenterPile getCenterPile(int index) {
        if (index >= 0 && index < NUM_CENTER_PILES) {
            return centerPiles[index];
        }
        return null;
    }

    public CenterPile[] getCenterPiles() {
        return centerPiles;
    }

    public Deck getStockPile() {
        return stockPile;
    }

    public int getStockPileSize() {
        return stockPile != null ? stockPile.size() : 0;
    }

    public boolean isGameStarted() {
        return gameStarted;
    }

    public boolean isGameOver() {
        return gameOver;
    }

    public Player getWinner() {
        return winner;
    }

    public int getCardsPlayedThisTurn() {
        return cardsPlayedThisTurn;
    }

    public int getNumPlayers() {
        return players.size();
    }
}
