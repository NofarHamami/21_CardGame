package model;

import java.util.Stack;

/**
 * Represents one of the 4 center piles where cards are played.
 * Piles start with Ace and end with Queen.
 * King acts as a wild card and can be placed at any time (including to start a pile).
 */
public class CenterPile {
    private Stack<Card> cards;
    private int expectedNextValue; // Tracks expected value (handles King wild cards)

    public CenterPile() {
        cards = new Stack<>();
        expectedNextValue = 1; // Expecting Ace to start
    }

    /**
     * Checks if a card can be placed on this pile.
     * @param card The card to check
     * @return true if the card can be placed
     */
    public boolean canPlace(Card card) {
        // If pile is complete (has Queen or reached end), can't add more
        if (isComplete()) {
            return false;
        }
        
        // King is wild - can be placed on ANY pile at ANY time (including to start)
        if (card.isKing()) {
            return true;
        }

        // If pile is empty, only Ace can start
        if (cards.isEmpty()) {
            return card.isAce();
        }

        // Card value must match expected next value
        return card.getValue() == expectedNextValue;
    }

    /**
     * Places a card on the pile.
     * @param card The card to place
     * @return true if successful, false if invalid placement
     */
    public boolean place(Card card) {
        if (!canPlace(card)) {
            return false;
        }

        cards.push(card);

        // Update expected next value
        if (card.isKing()) {
            // King acts as the expected value, so next value increments
            expectedNextValue++;
        } else {
            expectedNextValue = card.getValue() + 1;
        }

        return true;
    }

    /**
     * Returns the top card of the pile without removing it.
     * @return The top card, or null if pile is empty
     */
    public Card peek() {
        if (cards.isEmpty()) {
            return null;
        }
        return cards.peek();
    }

    /**
     * Returns true if the pile is complete (ends with Queen or value 12).
     */
    public boolean isComplete() {
        return expectedNextValue > 12; // Queen is 12, so next would be 13+
    }

    /**
     * Returns true if the pile is empty.
     */
    public boolean isEmpty() {
        return cards.isEmpty();
    }

    /**
     * Returns the number of cards in the pile.
     */
    public int size() {
        return cards.size();
    }

    /**
     * Returns the expected next card value for this pile.
     */
    public int getExpectedNextValue() {
        return expectedNextValue;
    }

    /**
     * Returns a string representation of the expected next card.
     */
    public String getExpectedNextRank() {
        if (isComplete()) {
            return "Complete";
        }
        for (Rank rank : Rank.values()) {
            if (rank.getValue() == expectedNextValue) {
                return rank.getSymbol();
            }
        }
        return "?";
    }

    /**
     * Clears the pile (for starting a new game or when pile is complete).
     */
    public void clear() {
        cards.clear();
        expectedNextValue = 1;
    }

    /**
     * Collects all cards from the pile and clears it.
     * Used when a pile is complete to return cards to stock.
     * @return List of all cards that were in the pile
     */
    public java.util.List<Card> collectAndClear() {
        java.util.List<Card> collected = new java.util.ArrayList<>(cards);
        clear();
        return collected;
    }

    @Override
    public String toString() {
        if (cards.isEmpty()) {
            return "[Empty - needs A]";
        }
        return "[" + peek() + " -> needs " + getExpectedNextRank() + "]";
    }
}
