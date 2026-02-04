package model;

/**
 * Represents the four suits in a standard deck of cards.
 */
public enum Suit {
    HEARTS("♥", "Hearts"),
    DIAMONDS("♦", "Diamonds"),
    CLUBS("♣", "Clubs"),
    SPADES("♠", "Spades");

    private final String symbol;
    private final String name;

    Suit(String symbol, String name) {
        this.symbol = symbol;
        this.name = name;
    }

    public String getSymbol() {
        return symbol;
    }

    public String getName() {
        return name;
    }

    public boolean isRed() {
        return this == HEARTS || this == DIAMONDS;
    }

    @Override
    public String toString() {
        return symbol;
    }
}
