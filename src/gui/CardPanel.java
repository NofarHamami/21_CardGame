package gui;

import model.Card;
import model.Rank;
import model.Suit;

import javax.swing.*;
import java.awt.*;
import java.awt.geom.RoundRectangle2D;

/**
 * A panel that renders a single playing card with a clean, realistic design.
 */
public class CardPanel extends JPanel {
    private Card card;
    private boolean faceUp;
    private boolean selected;
    private boolean highlighted;
    private boolean enabled;
    
    public static final int CARD_WIDTH = 70;
    public static final int CARD_HEIGHT = 100;
    private static final int CORNER_RADIUS = 8;
    
    // Colors
    private static final Color CARD_WHITE = new Color(255, 255, 255);
    private static final Color CARD_BORDER = new Color(180, 180, 180);
    private static final Color CARD_SHADOW = new Color(0, 0, 0, 30);
    private static final Color RED_COLOR = new Color(204, 0, 0);
    private static final Color BLACK_COLOR = new Color(20, 20, 20);
    private static final Color CARD_BACK_RED = new Color(180, 50, 50);
    private static final Color CARD_BACK_PATTERN = new Color(200, 70, 70);
    private static final Color CARD_BACK_DIAMOND = new Color(220, 90, 90);
    private static final Color SELECTED_BORDER = new Color(255, 180, 0);
    private static final Color HIGHLIGHT_BORDER = new Color(100, 200, 100);
    private static final Color EMPTY_SLOT = new Color(0, 80, 40, 100);
    private static final Color EMPTY_SLOT_BORDER = new Color(255, 255, 255, 80);

    public CardPanel() {
        this(null, false);
    }

    public CardPanel(Card card, boolean faceUp) {
        this.card = card;
        this.faceUp = faceUp;
        this.selected = false;
        this.highlighted = false;
        this.enabled = true;
        
        setPreferredSize(new Dimension(CARD_WIDTH, CARD_HEIGHT));
        setOpaque(false);
    }

    public void setCard(Card card) {
        this.card = card;
        repaint();
    }

    public Card getCard() {
        return card;
    }

    public void setFaceUp(boolean faceUp) {
        this.faceUp = faceUp;
        repaint();
    }

    public boolean isFaceUp() {
        return faceUp;
    }

    public void setSelected(boolean selected) {
        this.selected = selected;
        repaint();
    }

    public boolean isSelected() {
        return selected;
    }

    public void setHighlighted(boolean highlighted) {
        this.highlighted = highlighted;
        repaint();
    }

    public boolean isHighlighted() {
        return highlighted;
    }

    @Override
    public void setEnabled(boolean enabled) {
        this.enabled = enabled;
        super.setEnabled(enabled);
        repaint();
    }

    @Override
    protected void paintComponent(Graphics g) {
        super.paintComponent(g);
        Graphics2D g2 = (Graphics2D) g.create();
        g2.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
        g2.setRenderingHint(RenderingHints.KEY_TEXT_ANTIALIASING, RenderingHints.VALUE_TEXT_ANTIALIAS_LCD_HRGB);

        int width = getWidth();
        int height = getHeight();

        if (card == null) {
            drawEmptySlot(g2, width, height);
        } else if (faceUp) {
            drawCardFace(g2, width, height);
        } else {
            drawCardBack(g2, width, height);
        }

        // Draw selection/highlight border
        if (selected) {
            g2.setColor(SELECTED_BORDER);
            g2.setStroke(new BasicStroke(3));
            g2.draw(new RoundRectangle2D.Float(1, 1, width - 3, height - 3, CORNER_RADIUS, CORNER_RADIUS));
        } else if (highlighted) {
            g2.setColor(HIGHLIGHT_BORDER);
            g2.setStroke(new BasicStroke(2));
            g2.draw(new RoundRectangle2D.Float(1, 1, width - 3, height - 3, CORNER_RADIUS, CORNER_RADIUS));
        }

        // Dim if disabled
        if (!enabled) {
            g2.setColor(new Color(128, 128, 128, 80));
            g2.fill(new RoundRectangle2D.Float(0, 0, width, height, CORNER_RADIUS, CORNER_RADIUS));
        }

        g2.dispose();
    }

    private void drawEmptySlot(Graphics2D g2, int width, int height) {
        // Semi-transparent slot
        g2.setColor(EMPTY_SLOT);
        g2.fill(new RoundRectangle2D.Float(0, 0, width, height, CORNER_RADIUS, CORNER_RADIUS));
        
        // Dashed border
        g2.setColor(EMPTY_SLOT_BORDER);
        g2.setStroke(new BasicStroke(1.5f, BasicStroke.CAP_BUTT, BasicStroke.JOIN_BEVEL, 0, new float[]{4, 4}, 0));
        g2.draw(new RoundRectangle2D.Float(3, 3, width - 6, height - 6, CORNER_RADIUS - 2, CORNER_RADIUS - 2));
    }

    private void drawCardFace(Graphics2D g2, int width, int height) {
        // Shadow
        g2.setColor(CARD_SHADOW);
        g2.fill(new RoundRectangle2D.Float(2, 2, width - 2, height - 2, CORNER_RADIUS, CORNER_RADIUS));
        
        // Card background
        g2.setColor(CARD_WHITE);
        g2.fill(new RoundRectangle2D.Float(0, 0, width - 2, height - 2, CORNER_RADIUS, CORNER_RADIUS));

        // Card border
        g2.setColor(CARD_BORDER);
        g2.setStroke(new BasicStroke(1));
        g2.draw(new RoundRectangle2D.Float(0, 0, width - 3, height - 3, CORNER_RADIUS, CORNER_RADIUS));

        // Card color (red or black)
        Color cardColor = card.isRed() ? RED_COLOR : BLACK_COLOR;
        g2.setColor(cardColor);

        String rankSymbol = card.getRank().getSymbol();
        String suitSymbol = getSuitSymbol(card.getSuit());

        // Fonts
        Font rankFont = new Font("Arial", Font.BOLD, 16);
        Font suitFont = new Font("Serif", Font.PLAIN, 14);
        Font centerSuitFont = new Font("Serif", Font.PLAIN, 32);
        
        // Top-left corner - Rank
        g2.setFont(rankFont);
        FontMetrics rankFm = g2.getFontMetrics();
        g2.drawString(rankSymbol, 5, rankFm.getAscent() + 2);
        
        // Top-left corner - Suit (below rank)
        g2.setFont(suitFont);
        FontMetrics suitFm = g2.getFontMetrics();
        int suitX = 5 + (rankFm.stringWidth(rankSymbol) - suitFm.stringWidth(suitSymbol)) / 2;
        g2.drawString(suitSymbol, Math.max(4, suitX), rankFm.getAscent() + suitFm.getAscent() + 2);

        // Bottom-right corner (rotated 180 degrees)
        Graphics2D g2Rotated = (Graphics2D) g2.create();
        g2Rotated.rotate(Math.PI, (width - 2) / 2.0, (height - 2) / 2.0);
        g2Rotated.setColor(cardColor);
        g2Rotated.setFont(rankFont);
        g2Rotated.drawString(rankSymbol, 5, rankFm.getAscent() + 2);
        g2Rotated.setFont(suitFont);
        g2Rotated.drawString(suitSymbol, Math.max(4, suitX), rankFm.getAscent() + suitFm.getAscent() + 2);
        g2Rotated.dispose();

        // Center - Large suit symbol
        g2.setFont(centerSuitFont);
        FontMetrics centerFm = g2.getFontMetrics();
        int centerX = ((width - 2) - centerFm.stringWidth(suitSymbol)) / 2;
        int centerY = ((height - 2) + centerFm.getAscent()) / 2 - 4;
        g2.drawString(suitSymbol, centerX, centerY);

        // Special indicator for King (wild card)
        if (card.getRank() == Rank.KING) {
            g2.setFont(new Font("Arial", Font.BOLD, 8));
            g2.setColor(new Color(100, 100, 100));
            FontMetrics wildFm = g2.getFontMetrics();
            String wildText = "WILD";
            int wildX = ((width - 2) - wildFm.stringWidth(wildText)) / 2;
            g2.drawString(wildText, wildX, height - 8);
        }
    }

    private void drawCardBack(Graphics2D g2, int width, int height) {
        // Shadow
        g2.setColor(CARD_SHADOW);
        g2.fill(new RoundRectangle2D.Float(2, 2, width - 2, height - 2, CORNER_RADIUS, CORNER_RADIUS));
        
        // Card background - red
        g2.setColor(CARD_BACK_RED);
        g2.fill(new RoundRectangle2D.Float(0, 0, width - 2, height - 2, CORNER_RADIUS, CORNER_RADIUS));

        // Inner border - white
        g2.setColor(Color.WHITE);
        g2.setStroke(new BasicStroke(2));
        g2.draw(new RoundRectangle2D.Float(4, 4, width - 10, height - 10, CORNER_RADIUS - 2, CORNER_RADIUS - 2));

        // Diamond lattice pattern (like the reference image)
        Shape oldClip = g2.getClip();
        g2.setClip(new RoundRectangle2D.Float(6, 6, width - 14, height - 14, CORNER_RADIUS - 3, CORNER_RADIUS - 3));
        
        // Draw diagonal lines forming diamond pattern
        g2.setColor(CARD_BACK_PATTERN);
        g2.setStroke(new BasicStroke(1.5f));
        int spacing = 12;
        for (int i = -height; i < width + height; i += spacing) {
            g2.drawLine(i, 0, i + height, height);
            g2.drawLine(i + height, 0, i, height);
        }
        
        // Draw small white diamond accents at intersections
        g2.setColor(Color.WHITE);
        for (int x = spacing / 2; x < width; x += spacing) {
            for (int y = spacing / 2; y < height; y += spacing) {
                int size = 3;
                int[] xPoints = {x, x + size, x, x - size};
                int[] yPoints = {y - size, y, y + size, y};
                g2.fillPolygon(xPoints, yPoints, 4);
            }
        }
        
        g2.setClip(oldClip);

        // Outer border
        g2.setColor(CARD_BORDER);
        g2.setStroke(new BasicStroke(1));
        g2.draw(new RoundRectangle2D.Float(0, 0, width - 3, height - 3, CORNER_RADIUS, CORNER_RADIUS));
    }

    private String getSuitSymbol(Suit suit) {
        switch (suit) {
            case HEARTS: return "\u2665";   // ♥
            case DIAMONDS: return "\u2666"; // ♦
            case CLUBS: return "\u2663";    // ♣
            case SPADES: return "\u2660";   // ♠
            default: return "?";
        }
    }

    /**
     * Creates a card panel for a placeholder/empty slot.
     */
    public static CardPanel createEmptySlot() {
        return new CardPanel(null, false);
    }

    /**
     * Creates a card panel for a face-up card.
     */
    public static CardPanel createFaceUp(Card card) {
        return new CardPanel(card, true);
    }

    /**
     * Creates a card panel for a face-down card.
     */
    public static CardPanel createFaceDown(Card card) {
        return new CardPanel(card, false);
    }
}
