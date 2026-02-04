package gui;

import model.Card;
import model.CenterPile;
import model.Rank;
import model.Suit;

import javax.swing.*;
import javax.swing.border.TitledBorder;
import java.awt.*;
import java.awt.event.MouseAdapter;
import java.awt.event.MouseEvent;
import java.util.Random;

/**
 * Panel displaying the center of the table:
 * - Scattered deck pile (like cards thrown on table)
 * - 4 center piles for playing cards
 * - Message area for game events
 */
public class CenterPanel extends JPanel {
    private CenterPile[] centerPiles;
    private CardPanel[] pileCards;
    private JLabel[] pileLabels;
    private JLabel stockPileLabel;
    private JLabel messageLabel;
    private JPanel messagePanel;
    private CenterPileClickListener clickListener;
    private int stockCount = 0;
    
    // Pre-generated random rotations for scattered cards
    private double[] cardRotations;
    private int[] cardOffsetX;
    private int[] cardOffsetY;
    private static final int SCATTERED_CARDS = 20;

    public interface CenterPileClickListener {
        void onCenterPileClicked(int pileIndex);
    }

    public CenterPanel() {
        this.pileCards = new CardPanel[4];
        this.pileLabels = new JLabel[4];
        generateScatteredCardPositions();
        setupUI();
    }
    
    private void generateScatteredCardPositions() {
        Random rand = new Random(42); // Fixed seed for consistent look
        cardRotations = new double[SCATTERED_CARDS];
        cardOffsetX = new int[SCATTERED_CARDS];
        cardOffsetY = new int[SCATTERED_CARDS];
        
        for (int i = 0; i < SCATTERED_CARDS; i++) {
            cardRotations[i] = (rand.nextDouble() - 0.5) * Math.PI / 3; // -30 to +30 degrees
            cardOffsetX[i] = rand.nextInt(100) - 50;
            cardOffsetY[i] = rand.nextInt(60) - 30;
        }
    }

    private void setupUI() {
        setLayout(new BorderLayout(10, 10));
        setBackground(new Color(34, 139, 34)); // Forest green - match table
        setBorder(BorderFactory.createEmptyBorder(10, 10, 10, 10));

        // Center area with scattered deck
        JPanel centerArea = new JPanel(new BorderLayout(20, 10));
        centerArea.setOpaque(false);
        
        // Scattered deck pile in the center (drawn as messy pile)
        JPanel scatteredDeck = createScatteredDeckPanel();
        centerArea.add(scatteredDeck, BorderLayout.CENTER);
        
        add(centerArea, BorderLayout.CENTER);
        
        // Message area at bottom
        messagePanel = new JPanel(new FlowLayout(FlowLayout.CENTER));
        messagePanel.setBackground(new Color(255, 255, 150)); // Yellow message box
        messagePanel.setBorder(BorderFactory.createCompoundBorder(
            BorderFactory.createLineBorder(new Color(200, 180, 100), 2),
            BorderFactory.createEmptyBorder(5, 15, 5, 15)
        ));
        
        messageLabel = new JLabel("Welcome to the game!");
        messageLabel.setFont(new Font("Arial", Font.PLAIN, 14));
        messageLabel.setForeground(Color.BLACK);
        messagePanel.add(messageLabel);
        
        add(messagePanel, BorderLayout.SOUTH);
    }

    private JPanel createScatteredDeckPanel() {
        JPanel panel = new JPanel(new BorderLayout(0, 5));
        panel.setOpaque(false);
        
        // Scattered deck drawn as messy pile of face-down cards
        JPanel deckPanel = new JPanel() {
            @Override
            protected void paintComponent(Graphics g) {
                super.paintComponent(g);
                Graphics2D g2 = (Graphics2D) g.create();
                g2.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
                
                int cardWidth = 55;
                int cardHeight = 80;
                int centerX = getWidth() / 2;
                int centerY = getHeight() / 2;
                
                // Draw scattered face-down cards
                int cardsToDraw = Math.min(SCATTERED_CARDS, stockCount / 5 + 5);
                for (int i = 0; i < cardsToDraw && i < SCATTERED_CARDS; i++) {
                    Graphics2D g2Card = (Graphics2D) g2.create();
                    
                    int x = centerX + cardOffsetX[i];
                    int y = centerY + cardOffsetY[i];
                    
                    g2Card.translate(x, y);
                    g2Card.rotate(cardRotations[i]);
                    
                    drawRedCardBack(g2Card, -cardWidth / 2, -cardHeight / 2, cardWidth, cardHeight);
                    
                    g2Card.dispose();
                }
                
                g2.dispose();
            }
            
            private void drawRedCardBack(Graphics2D g2, int x, int y, int width, int height) {
                // Shadow
                g2.setColor(new Color(0, 0, 0, 50));
                g2.fillRoundRect(x + 2, y + 2, width, height, 6, 6);
                
                // Card background - red
                g2.setColor(new Color(180, 50, 50));
                g2.fillRoundRect(x, y, width, height, 6, 6);
                
                // White inner border
                g2.setColor(Color.WHITE);
                g2.setStroke(new BasicStroke(1.5f));
                g2.drawRoundRect(x + 3, y + 3, width - 6, height - 6, 4, 4);
                
                // Diamond lattice pattern
                Shape oldClip = g2.getClip();
                g2.setClip(x + 4, y + 4, width - 8, height - 8);
                
                g2.setColor(new Color(200, 70, 70));
                g2.setStroke(new BasicStroke(1f));
                int spacing = 10;
                for (int i = x - height; i < x + width + height; i += spacing) {
                    g2.drawLine(i, y, i + height, y + height);
                    g2.drawLine(i + height, y, i, y + height);
                }
                
                // White diamond accents
                g2.setColor(Color.WHITE);
                for (int dx = x + spacing / 2; dx < x + width; dx += spacing) {
                    for (int dy = y + spacing / 2; dy < y + height; dy += spacing) {
                        int size = 2;
                        int[] xPoints = {dx, dx + size, dx, dx - size};
                        int[] yPoints = {dy - size, dy, dy + size, dy};
                        g2.fillPolygon(xPoints, yPoints, 4);
                    }
                }
                
                g2.setClip(oldClip);
                
                // Outer border
                g2.setColor(new Color(120, 120, 120));
                g2.setStroke(new BasicStroke(1));
                g2.drawRoundRect(x, y, width - 1, height - 1, 6, 6);
            }
            
            @Override
            public Dimension getPreferredSize() {
                return new Dimension(200, 180);
            }
        };
        deckPanel.setOpaque(false);
        panel.add(deckPanel, BorderLayout.CENTER);
        
        stockPileLabel = new JLabel("Stock: 0 cards", SwingConstants.CENTER);
        stockPileLabel.setForeground(Color.WHITE);
        stockPileLabel.setFont(new Font("Arial", Font.BOLD, 11));
        panel.add(stockPileLabel, BorderLayout.SOUTH);
        
        return panel;
    }

    public void setClickListener(CenterPileClickListener listener) {
        this.clickListener = listener;
    }

    public void setCenterPiles(CenterPile[] piles) {
        this.centerPiles = piles;
        
        // Create center pile cards if not already created
        if (pileCards[0] == null) {
            // We need to add the center piles to the UI
            // Remove and rebuild center area
            removeAll();
            setupUI();
            
            // Create a panel for center piles around the deck
            JPanel centerArea = (JPanel) getComponent(0);
            
            JPanel pilesRow = new JPanel(new FlowLayout(FlowLayout.CENTER, 10, 0));
            pilesRow.setOpaque(false);
            
            for (int i = 0; i < 4; i++) {
                JPanel pilePanel = createCenterPilePanel(i);
                pilesRow.add(pilePanel);
            }
            
            centerArea.add(pilesRow, BorderLayout.SOUTH);
        }
        
        refresh();
    }
    
    private JPanel createCenterPilePanel(int index) {
        JPanel panel = new JPanel(new BorderLayout(0, 3));
        panel.setOpaque(false);
        
        pileCards[index] = new CardPanel();
        pileCards[index].setPreferredSize(new Dimension(60, 85));
        pileCards[index].addMouseListener(new MouseAdapter() {
            @Override
            public void mouseClicked(MouseEvent e) {
                if (clickListener != null) {
                    clickListener.onCenterPileClicked(index);
                }
            }
            
            @Override
            public void mouseEntered(MouseEvent e) {
                pileCards[index].setHighlighted(true);
            }
            
            @Override
            public void mouseExited(MouseEvent e) {
                pileCards[index].setHighlighted(false);
            }
        });
        panel.add(pileCards[index], BorderLayout.CENTER);
        
        pileLabels[index] = new JLabel("Needs: A", SwingConstants.CENTER);
        pileLabels[index].setForeground(Color.WHITE);
        pileLabels[index].setFont(new Font("Arial", Font.PLAIN, 10));
        panel.add(pileLabels[index], BorderLayout.SOUTH);
        
        return panel;
    }

    public void setStockPileCount(int count) {
        this.stockCount = count;
        stockPileLabel.setText("Stock: " + count + " cards");
        repaint();
    }
    
    public void setMessage(String message) {
        messageLabel.setText(message);
        messagePanel.setVisible(message != null && !message.isEmpty());
    }

    public void refresh() {
        if (centerPiles == null) return;

        for (int i = 0; i < 4; i++) {
            if (pileCards[i] == null) continue;
            
            CenterPile pile = centerPiles[i];
            Card topCard = pile.peek();
            
            pileCards[i].setCard(topCard);
            pileCards[i].setFaceUp(topCard != null);
            
            if (pile.isComplete()) {
                pileLabels[i].setText("Complete!");
                pileLabels[i].setForeground(new Color(255, 215, 0)); // Gold
            } else {
                pileLabels[i].setText("Needs: " + pile.getExpectedNextRank());
                pileLabels[i].setForeground(Color.WHITE);
            }
        }
        repaint();
    }

    @Override
    public Dimension getPreferredSize() {
        return new Dimension(400, 280);
    }
    
    @Override
    public Dimension getMinimumSize() {
        return new Dimension(300, 220);
    }
}
