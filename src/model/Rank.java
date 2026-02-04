package model;

/**
 * Represents the ranks of cards from Ace to King.
 * Ace = 1, 2-10 = face value, Jack = 11, Queen = 12, King = 13 (wild/joker)
 */
public enum Rank {
    ACE(1, "A"),
    TWO(2, "2"),
    THREE(3, "3"),
    FOUR(4, "4"),
    FIVE(5, "5"),
    SIX(6, "6"),
    SEVEN(7, "7"),
    EIGHT(8, "8"),
    NINE(9, "9"),
    TEN(10, "10"),
    JACK(11, "J"),
    QUEEN(12, "Q"),
    KING(13, "K");

    private final int value;
    private final String symbol;

    Rank(int value, String symbol) {
        this.value = value;
        this.symbol = symbol;
    }

    public int getValue() {
        return value;
    }

    public String getSymbol() {
        return symbol;
    }

    public boolean isKing() {
        return this == KING;
    }

    public boolean isAce() {
        return this == ACE;
    }

    public boolean isQueen() {
        return this == QUEEN;
    }

    /**
     * Gets the next rank in sequence (for center pile validation).
     * Returns null if this is Queen (end of pile) or King (wild).
     */
    public Rank getNext() {
        if (this == QUEEN || this == KING) {
            return null;
        }
        return values()[this.ordinal() + 1];
    }

    @Override
    public String toString() {
        return symbol;
    }
}
