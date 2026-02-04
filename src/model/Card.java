package model;

/**
 * Represents a playing card with a suit and rank.
 */
public class Card {
    private final Suit suit;
    private final Rank rank;

    public Card(Suit suit, Rank rank) {
        this.suit = suit;
        this.rank = rank;
    }

    public Suit getSuit() {
        return suit;
    }

    public Rank getRank() {
        return rank;
    }

    public int getValue() {
        return rank.getValue();
    }

    /**
     * Returns true if this card is a King (wild/joker).
     */
    public boolean isKing() {
        return rank.isKing();
    }

    /**
     * Returns true if this card is an Ace (can start a center pile).
     */
    public boolean isAce() {
        return rank.isAce();
    }

    /**
     * Returns true if this card is a Queen (completes a center pile).
     */
    public boolean isQueen() {
        return rank.isQueen();
    }

    /**
     * Returns true if this card is red (Hearts or Diamonds).
     */
    public boolean isRed() {
        return suit.isRed();
    }

    /**
     * Checks if this card can be placed on top of another card in a center pile.
     * King is wild and can be placed on any pile at any time (including to start).
     * 
     * @param topCard The current top card of the pile (null if pile is empty)
     * @return true if this card can be placed
     */
    public boolean canPlaceOn(Card topCard) {
        // King is wild - can be placed on any pile at any time
        if (this.isKing()) {
            return true; // King can start a pile or continue any pile
        }
        
        // If pile is empty, only Ace can start
        if (topCard == null) {
            return this.isAce();
        }
        
        // If top card is King (acting as wild), check if this card follows the expected value
        // The King takes the value of the card it replaced
        if (topCard.isKing()) {
            // We need to track what value the King represents
            // This will be handled by CenterPile
            return true;
        }
        
        // Normal case: this card's value must be exactly one more than top card
        return this.getValue() == topCard.getValue() + 1;
    }

    @Override
    public String toString() {
        return rank.getSymbol() + suit.getSymbol();
    }

    @Override
    public boolean equals(Object obj) {
        if (this == obj) return true;
        if (obj == null || getClass() != obj.getClass()) return false;
        Card card = (Card) obj;
        return suit == card.suit && rank == card.rank;
    }

    @Override
    public int hashCode() {
        return 31 * suit.hashCode() + rank.hashCode();
    }
}
