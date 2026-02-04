package model;

import java.util.ArrayList;
import java.util.List;
import java.util.Stack;

/**
 * Represents a player in the 21 card game.
 * Each player has:
 * - A hand of up to 5 cards
 * - A personal 21-card pile (goal is to empty this)
 * - 5 storage stacks (LIFO - only top card accessible)
 */
public class Player {
    private final String name;
    private final int playerNumber;
    private List<Card> hand;
    private Stack<Card> personalPile; // The 21-card pile to empty
    private List<Stack<Card>> storage; // 5 storage stacks
    
    public static final int MAX_HAND_SIZE = 5;
    public static final int PERSONAL_PILE_SIZE = 21;
    public static final int STORAGE_STACKS = 5;

    public Player(String name, int playerNumber) {
        this.name = name;
        this.playerNumber = playerNumber;
        this.hand = new ArrayList<>();
        this.personalPile = new Stack<>();
        this.storage = new ArrayList<>();
        for (int i = 0; i < STORAGE_STACKS; i++) {
            storage.add(new Stack<>());
        }
    }

    /**
     * Sets up the player's initial cards.
     * @param handCards 5 cards for the hand
     * @param pileCards 21 cards for the personal pile
     */
    public void setupInitialCards(List<Card> handCards, List<Card> pileCards) {
        hand.clear();
        hand.addAll(handCards);
        
        personalPile.clear();
        // Add cards in reverse so the first card in the list is on top
        for (int i = pileCards.size() - 1; i >= 0; i--) {
            personalPile.push(pileCards.get(i));
        }
    }

    public String getName() {
        return name;
    }

    public int getPlayerNumber() {
        return playerNumber;
    }

    // ============ Hand Methods ============

    public List<Card> getHand() {
        return new ArrayList<>(hand);
    }

    public int getHandSize() {
        return hand.size();
    }

    public Card getHandCard(int index) {
        if (index >= 0 && index < hand.size()) {
            return hand.get(index);
        }
        return null;
    }

    public Card removeFromHand(int index) {
        if (index >= 0 && index < hand.size()) {
            return hand.remove(index);
        }
        return null;
    }

    public Card removeFromHand(Card card) {
        if (hand.remove(card)) {
            return card;
        }
        return null;
    }

    public void addToHand(Card card) {
        hand.add(card);
    }

    public void addToHand(List<Card> cards) {
        hand.addAll(cards);
    }

    public boolean isHandEmpty() {
        return hand.isEmpty();
    }

    public boolean isHandFull() {
        return hand.size() >= MAX_HAND_SIZE;
    }

    public int cardsNeededToFillHand() {
        return Math.max(0, MAX_HAND_SIZE - hand.size());
    }

    // ============ Personal 21-Pile Methods ============

    public Card getPersonalPileTop() {
        if (personalPile.isEmpty()) {
            return null;
        }
        return personalPile.peek();
    }

    public Card removeFromPersonalPile() {
        if (personalPile.isEmpty()) {
            return null;
        }
        return personalPile.pop();
    }

    public int getPersonalPileSize() {
        return personalPile.size();
    }

    public boolean isPersonalPileEmpty() {
        return personalPile.isEmpty();
    }

    /**
     * Returns true if this player has won (personal 21-pile is empty).
     */
    public boolean hasWon() {
        return personalPile.isEmpty();
    }

    // ============ Storage Methods ============

    public Stack<Card> getStorageStack(int index) {
        if (index >= 0 && index < STORAGE_STACKS) {
            return storage.get(index);
        }
        return null;
    }

    public Card getStorageTop(int stackIndex) {
        if (stackIndex >= 0 && stackIndex < STORAGE_STACKS) {
            Stack<Card> stack = storage.get(stackIndex);
            if (!stack.isEmpty()) {
                return stack.peek();
            }
        }
        return null;
    }

    public Card removeFromStorage(int stackIndex) {
        if (stackIndex >= 0 && stackIndex < STORAGE_STACKS) {
            Stack<Card> stack = storage.get(stackIndex);
            if (!stack.isEmpty()) {
                return stack.pop();
            }
        }
        return null;
    }

    public void addToStorage(int stackIndex, Card card) {
        if (stackIndex >= 0 && stackIndex < STORAGE_STACKS) {
            storage.get(stackIndex).push(card);
        }
    }

    public boolean isStorageStackEmpty(int stackIndex) {
        if (stackIndex >= 0 && stackIndex < STORAGE_STACKS) {
            return storage.get(stackIndex).isEmpty();
        }
        return true;
    }

    public int getStorageStackSize(int stackIndex) {
        if (stackIndex >= 0 && stackIndex < STORAGE_STACKS) {
            return storage.get(stackIndex).size();
        }
        return 0;
    }

    /**
     * Returns the total number of cards in all storage stacks.
     */
    public int getTotalStorageCards() {
        int total = 0;
        for (Stack<Card> stack : storage) {
            total += stack.size();
        }
        return total;
    }

    /**
     * Clears all player data for a new game.
     */
    public void reset() {
        hand.clear();
        personalPile.clear();
        for (Stack<Card> stack : storage) {
            stack.clear();
        }
    }

    @Override
    public String toString() {
        return name + " (Hand: " + hand.size() + ", Pile: " + personalPile.size() + 
               ", Storage: " + getTotalStorageCards() + ")";
    }
}
