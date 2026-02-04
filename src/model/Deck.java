package model;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Stack;

/**
 * Represents a deck of cards that can be shuffled and drawn from.
 */
public class Deck {
    private Stack<Card> cards;

    public Deck() {
        cards = new Stack<>();
    }

    /**
     * Creates a standard 52-card deck.
     */
    public static Deck createStandardDeck() {
        Deck deck = new Deck();
        for (Suit suit : Suit.values()) {
            for (Rank rank : Rank.values()) {
                deck.cards.push(new Card(suit, rank));
            }
        }
        return deck;
    }

    /**
     * Creates multiple standard decks combined.
     * @param numDecks Number of 52-card decks to combine
     */
    public static Deck createMultipleDecks(int numDecks) {
        Deck deck = new Deck();
        for (int i = 0; i < numDecks; i++) {
            for (Suit suit : Suit.values()) {
                for (Rank rank : Rank.values()) {
                    deck.cards.push(new Card(suit, rank));
                }
            }
        }
        return deck;
    }

    /**
     * Shuffles the deck randomly.
     */
    public void shuffle() {
        List<Card> cardList = new ArrayList<>(cards);
        Collections.shuffle(cardList);
        cards.clear();
        for (Card card : cardList) {
            cards.push(card);
        }
    }

    /**
     * Draws a card from the top of the deck.
     * @return The top card, or null if deck is empty
     */
    public Card draw() {
        if (cards.isEmpty()) {
            return null;
        }
        return cards.pop();
    }

    /**
     * Draws multiple cards from the deck.
     * @param count Number of cards to draw
     * @return List of drawn cards (may be less than count if deck runs out)
     */
    public List<Card> draw(int count) {
        List<Card> drawn = new ArrayList<>();
        for (int i = 0; i < count && !cards.isEmpty(); i++) {
            drawn.add(cards.pop());
        }
        return drawn;
    }

    /**
     * Returns the top card without removing it.
     * @return The top card, or null if deck is empty
     */
    public Card peek() {
        if (cards.isEmpty()) {
            return null;
        }
        return cards.peek();
    }

    /**
     * Adds a card to the top of the deck.
     */
    public void addCard(Card card) {
        cards.push(card);
    }

    /**
     * Adds multiple cards to the deck.
     */
    public void addCards(List<Card> cardsToAdd) {
        for (Card card : cardsToAdd) {
            cards.push(card);
        }
    }

    /**
     * Returns the number of cards remaining in the deck.
     */
    public int size() {
        return cards.size();
    }

    /**
     * Returns true if the deck is empty.
     */
    public boolean isEmpty() {
        return cards.isEmpty();
    }

    /**
     * Clears all cards from the deck.
     */
    public void clear() {
        cards.clear();
    }
}
