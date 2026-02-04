package gui;

import model.Card;
import model.Player;

import javax.swing.*;
import javax.swing.border.TitledBorder;
import java.awt.*;
import java.awt.event.MouseAdapter;
import java.awt.event.MouseEvent;
import java.awt.geom.Ellipse2D;
import java.util.List;

/**
 * Panel displaying a single player's area including:
 * - Player avatar and name
 * - Personal 21-pile (top card visible)
 * - Hand (5 cards)
 * - Storage (5 stacks)
 */
public class PlayerPanel extends JPanel {
    private Player player;
    private boolean isCurrentPlayer;
    private boolean isHumanPlayer; // true for "You" player at bottom
    private CardSelectionListener selectionListener;
    private boolean compactMode = false; // For side positions (left/right)
    private Position position = Position.BOTTOM; // Player's position on table
    
    // TESTING MODE: Set to true to show all players' hands face-up
    public static boolean SHOW_ALL_HANDS = true;
    
    // Avatar colors for different players
    private static final Color[] AVATAR_COLORS = {
        new Color(255, 200, 150), // You - peachy skin tone
        new Color(139, 90, 43),   // Mike - brown
        new Color(255, 220, 180), // Bill - light skin
        new Color(255, 200, 150)  // Lisa - peachy
    };
    
    public enum Position {
        BOTTOM, // Human player
        LEFT,
        TOP,
        RIGHT
    }
    
    // Sub-panels
    private JPanel pilePanel;
    private JPanel handPanel;
    private JPanel storagePanel;
    private JPanel avatarPanel;
    
    // Card displays
    private CardPanel pileTopCard;
    private CardPanel[] handCards;
    private CardPanel[] storageCards;
    private JLabel pileCountLabel;
    private JLabel[] storageCountLabels;
    private JLabel nameLabel;
    
    // Selection state
    private int selectedHandIndex = -1;
    private int selectedStorageIndex = -1;
    private boolean personalPileSelected = false;

    public interface CardSelectionListener {
        void onHandCardSelected(int playerIndex, int cardIndex);
        void onPersonalPileSelected(int playerIndex);
        void onStorageSelected(int playerIndex, int stackIndex);
        void onStorageCardPlayRequest(int playerIndex, int stackIndex);
    }

    public PlayerPanel(Player player) {
        this.player = player;
        this.isCurrentPlayer = false;
        this.isHumanPlayer = (player.getPlayerNumber() == 1); // Player 1 is human
        this.handCards = new CardPanel[Player.MAX_HAND_SIZE];
        this.storageCards = new CardPanel[Player.STORAGE_STACKS];
        this.storageCountLabels = new JLabel[Player.STORAGE_STACKS];
        
        setupUI();
    }
    
    public void setPosition(Position pos) {
        this.position = pos;
        this.isHumanPlayer = (pos == Position.BOTTOM);
    }

    private void setupUI() {
        setLayout(new BorderLayout(10, 5));
        setBackground(new Color(0, 128, 0)); // Green background
        setBorder(BorderFactory.createEmptyBorder(5, 10, 5, 10));

        // Left side: 21-pile (bigger)
        pilePanel = createPilePanel();
        add(pilePanel, BorderLayout.WEST);

        // Center: Hand cards and Storage stacked vertically
        JPanel centerPanel = new JPanel();
        centerPanel.setLayout(new BoxLayout(centerPanel, BoxLayout.Y_AXIS));
        centerPanel.setOpaque(false);
        
        // Hand cards (overlapping fan style)
        handPanel = createHandPanel();
        centerPanel.add(handPanel);
        
        centerPanel.add(Box.createVerticalStrut(5));
        
        // Storage below hand
        storagePanel = createStoragePanel();
        centerPanel.add(storagePanel);
        
        add(centerPanel, BorderLayout.CENTER);
        
        // Right side: Avatar
        avatarPanel = createAvatarPanel();
        add(avatarPanel, BorderLayout.EAST);
    }

    private JPanel createAvatarPanel() {
        JPanel panel = new JPanel(new BorderLayout(0, 5));
        panel.setOpaque(false);
        panel.setPreferredSize(new Dimension(80, 100));
        
        // Avatar icon (drawn circle with face)
        JPanel avatar = new JPanel() {
            @Override
            protected void paintComponent(Graphics g) {
                super.paintComponent(g);
                Graphics2D g2 = (Graphics2D) g.create();
                g2.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
                
                int size = Math.min(getWidth(), getHeight()) - 10;
                int x = (getWidth() - size) / 2;
                int y = 5;
                
                // Face circle (skin color based on player)
                int colorIndex = (player.getPlayerNumber() - 1) % AVATAR_COLORS.length;
                g2.setColor(AVATAR_COLORS[colorIndex]);
                g2.fillOval(x, y, size, size);
                
                // Border
                g2.setColor(new Color(100, 70, 40));
                g2.setStroke(new BasicStroke(2));
                g2.drawOval(x, y, size, size);
                
                // Eyes
                g2.setColor(Color.BLACK);
                int eyeY = y + size / 3;
                int eyeSize = size / 8;
                g2.fillOval(x + size / 3 - eyeSize / 2, eyeY, eyeSize, eyeSize);
                g2.fillOval(x + 2 * size / 3 - eyeSize / 2, eyeY, eyeSize, eyeSize);
                
                // Smile
                g2.setStroke(new BasicStroke(2));
                g2.drawArc(x + size / 4, y + size / 3, size / 2, size / 3, 200, 140);
                
                // Hair for some players
                if (player.getPlayerNumber() == 2) { // Mike - has mustache
                    g2.setColor(new Color(60, 40, 20));
                    g2.fillRect(x + size / 3, y + size * 2 / 3 - 3, size / 3, 6);
                } else if (player.getPlayerNumber() == 3) { // Bill - has hair on top
                    g2.setColor(new Color(60, 40, 20));
                    g2.fillArc(x, y - 5, size, size / 2, 0, 180);
                } else if (player.getPlayerNumber() == 4) { // Lisa - has long hair
                    g2.setColor(new Color(180, 140, 60));
                    g2.fillArc(x - 5, y, size / 4, size, 90, 180);
                    g2.fillArc(x + size - size / 4 + 5, y, size / 4, size, 270, 180);
                }
                
                g2.dispose();
            }
            
            @Override
            public Dimension getPreferredSize() {
                return new Dimension(60, 60);
            }
        };
        avatar.setOpaque(false);
        panel.add(avatar, BorderLayout.CENTER);
        
        // Name label
        String displayName = isHumanPlayer ? "You" : player.getName();
        nameLabel = new JLabel(displayName, SwingConstants.CENTER);
        nameLabel.setFont(new Font("Arial", Font.BOLD, 12));
        nameLabel.setForeground(Color.WHITE);
        panel.add(nameLabel, BorderLayout.SOUTH);
        
        return panel;
    }

    private JPanel createPilePanel() {
        JPanel panel = new JPanel(new BorderLayout(0, 5));
        panel.setOpaque(false);
        
        // Make the 21-pile card bigger than other cards
        pileTopCard = new CardPanel();
        pileTopCard.setPreferredSize(new Dimension(100, 140));
        pileTopCard.setMinimumSize(new Dimension(100, 140));
        pileTopCard.addMouseListener(new MouseAdapter() {
            @Override
            public void mouseClicked(MouseEvent e) {
                if (isCurrentPlayer && player.getPersonalPileTop() != null && selectionListener != null) {
                    selectionListener.onPersonalPileSelected(player.getPlayerNumber() - 1);
                }
            }
        });
        panel.add(pileTopCard, BorderLayout.CENTER);
        
        pileCountLabel = new JLabel("21 pile", SwingConstants.CENTER);
        pileCountLabel.setFont(new Font("Arial", Font.BOLD, 12));
        pileCountLabel.setForeground(Color.WHITE);
        panel.add(pileCountLabel, BorderLayout.SOUTH);
        
        return panel;
    }

    private JPanel createHandPanel() {
        // Use a custom panel that overlaps cards like a fan
        JPanel panel = new JPanel(null) { // null layout for manual positioning
            @Override
            public Dimension getPreferredSize() {
                // Width: first card full + overlap for rest
                int cardWidth = 60;
                int overlap = 22;
                int width = cardWidth + (Player.MAX_HAND_SIZE - 1) * overlap + 20;
                return new Dimension(width, 95);
            }
            
            @Override
            public Dimension getMinimumSize() {
                return getPreferredSize();
            }
            
            @Override
            public Dimension getMaximumSize() {
                Dimension pref = getPreferredSize();
                return new Dimension(Integer.MAX_VALUE, pref.height);
            }
            
            @Override
            public void doLayout() {
                int cardWidth = 60;
                int cardHeight = 85;
                int overlap = 22;
                int startX = 5;
                int y = 5;
                
                for (int i = 0; i < handCards.length; i++) {
                    if (handCards[i] != null) {
                        handCards[i].setBounds(startX + i * overlap, y, cardWidth, cardHeight);
                    }
                }
            }
        };
        panel.setOpaque(false);

        for (int i = 0; i < Player.MAX_HAND_SIZE; i++) {
            final int index = i;
            handCards[i] = new CardPanel();
            handCards[i].addMouseListener(new MouseAdapter() {
                @Override
                public void mouseClicked(MouseEvent e) {
                    if (isCurrentPlayer && handCards[index].getCard() != null && selectionListener != null) {
                        selectionListener.onHandCardSelected(player.getPlayerNumber() - 1, index);
                    }
                }
            });
            panel.add(handCards[i]);
        }
        
        return panel;
    }

    private JPanel createStoragePanel() {
        JPanel outerPanel = new JPanel(new BorderLayout());
        outerPanel.setOpaque(false);
        
        JLabel storageLabel = new JLabel("storage", SwingConstants.LEFT);
        storageLabel.setFont(new Font("Arial", Font.PLAIN, 10));
        storageLabel.setForeground(Color.WHITE);
        outerPanel.add(storageLabel, BorderLayout.NORTH);
        
        JPanel panel = new JPanel(new FlowLayout(FlowLayout.LEFT, 4, 2));
        panel.setOpaque(false);

        for (int i = 0; i < Player.STORAGE_STACKS; i++) {
            final int index = i;
            JPanel stackPanel = new JPanel(new BorderLayout(0, 1));
            stackPanel.setOpaque(false);
            
            storageCards[i] = new CardPanel();
            storageCards[i].setPreferredSize(new Dimension(45, 65));
            storageCards[i].addMouseListener(new MouseAdapter() {
                @Override
                public void mouseClicked(MouseEvent e) {
                    if (!isCurrentPlayer || selectionListener == null) return;
                    
                    if (e.getButton() == MouseEvent.BUTTON3 || e.isControlDown()) {
                        // Right-click or Ctrl+click: play from storage
                        if (player.getStorageTop(index) != null) {
                            selectionListener.onStorageCardPlayRequest(player.getPlayerNumber() - 1, index);
                        }
                    } else {
                        // Left-click: select as destination or select card to play
                        if (hasCardSelected()) {
                            // A card is selected, so this is a destination
                            selectionListener.onStorageSelected(player.getPlayerNumber() - 1, index);
                        } else if (player.getStorageTop(index) != null) {
                            // No card selected, select this storage card to play
                            selectionListener.onStorageCardPlayRequest(player.getPlayerNumber() - 1, index);
                        }
                    }
                }
            });
            stackPanel.add(storageCards[i], BorderLayout.CENTER);
            
            storageCountLabels[i] = new JLabel("0", SwingConstants.CENTER);
            storageCountLabels[i].setFont(new Font("Arial", Font.PLAIN, 8));
            storageCountLabels[i].setForeground(Color.WHITE);
            stackPanel.add(storageCountLabels[i], BorderLayout.SOUTH);
            
            panel.add(stackPanel);
        }
        
        outerPanel.add(panel, BorderLayout.CENTER);
        return outerPanel;
    }

    public void setSelectionListener(CardSelectionListener listener) {
        this.selectionListener = listener;
    }

    public void setCurrentPlayer(boolean isCurrent) {
        this.isCurrentPlayer = isCurrent;
        updateBorder();
        updateCardStates();
    }

    private void updateBorder() {
        // Update border color based on current player status
        Color borderColor = isCurrentPlayer ? new Color(255, 215, 0) : new Color(0, 100, 0); // Gold for current
        int borderWidth = isCurrentPlayer ? 3 : 1;
        setBorder(BorderFactory.createCompoundBorder(
            BorderFactory.createLineBorder(borderColor, borderWidth),
            BorderFactory.createEmptyBorder(5, 10, 5, 10)
        ));
    }

    public void refresh() {
        // Update personal pile
        Card topCard = player.getPersonalPileTop();
        pileTopCard.setCard(topCard);
        pileTopCard.setFaceUp(topCard != null); // 21-pile top card is always face-up
        
        // Update pile label
        String pileText = player.getPersonalPileSize() + " pile";
        pileCountLabel.setText(pileText);

        // Hand visibility: human player always sees their cards
        // In testing mode (SHOW_ALL_HANDS = true): everyone sees all hands
        // In normal mode: only human player sees their cards face-up
        boolean showHandFaceUp = isHumanPlayer || SHOW_ALL_HANDS;

        // Update hand
        List<Card> hand = player.getHand();
        for (int i = 0; i < Player.MAX_HAND_SIZE; i++) {
            if (i < hand.size()) {
                handCards[i].setCard(hand.get(i));
                handCards[i].setFaceUp(showHandFaceUp);
            } else {
                handCards[i].setCard(null);
            }
        }

        // Update storage (storage is always visible to all players)
        for (int i = 0; i < Player.STORAGE_STACKS; i++) {
            Card storageTop = player.getStorageTop(i);
            storageCards[i].setCard(storageTop);
            storageCards[i].setFaceUp(storageTop != null);
            storageCountLabels[i].setText(String.valueOf(player.getStorageStackSize(i)));
        }

        updateCardStates();
        repaint();
    }

    private void updateCardStates() {
        // Enable/disable cards based on current player
        for (CardPanel card : handCards) {
            card.setEnabled(isCurrentPlayer);
        }
        pileTopCard.setEnabled(isCurrentPlayer);
        for (CardPanel card : storageCards) {
            card.setEnabled(isCurrentPlayer);
        }
    }

    public void setSelectedHandCard(int index) {
        clearSelection();
        if (index >= 0 && index < handCards.length) {
            selectedHandIndex = index;
            handCards[index].setSelected(true);
        }
    }

    public void setSelectedPersonalPile(boolean selected) {
        clearSelection();
        personalPileSelected = selected;
        pileTopCard.setSelected(selected);
    }

    public void setSelectedStorageCard(int index) {
        clearSelection();
        if (index >= 0 && index < storageCards.length) {
            selectedStorageIndex = index;
            storageCards[index].setSelected(true);
        }
    }

    public void clearSelection() {
        selectedHandIndex = -1;
        selectedStorageIndex = -1;
        personalPileSelected = false;
        
        for (CardPanel card : handCards) {
            card.setSelected(false);
        }
        pileTopCard.setSelected(false);
        for (CardPanel card : storageCards) {
            card.setSelected(false);
        }
    }

    public boolean hasCardSelected() {
        return selectedHandIndex >= 0 || selectedStorageIndex >= 0 || personalPileSelected;
    }

    public int getSelectedHandIndex() {
        return selectedHandIndex;
    }

    public int getSelectedStorageIndex() {
        return selectedStorageIndex;
    }

    public boolean isPersonalPileSelected() {
        return personalPileSelected;
    }

    public Player getPlayer() {
        return player;
    }
    
    public void setCompactMode(boolean compact) {
        this.compactMode = compact;
        if (compact) {
            // Rebuild UI for compact/vertical layout
            removeAll();
            setupCompactUI();
            revalidate();
            repaint();
        }
    }
    
    private void setupCompactUI() {
        // Layout matching reference: 21-pile at top, storage on left, hand+avatar on right
        setLayout(new BorderLayout(8, 8));
        setBorder(BorderFactory.createEmptyBorder(10, 10, 10, 10));
        setBackground(new Color(0, 128, 0)); // Green like table
        
        // TOP: 21-pile card (face-up top card)
        JPanel topSection = new JPanel(new BorderLayout(0, 3));
        topSection.setOpaque(false);
        
        pileTopCard = new CardPanel();
        pileTopCard.setPreferredSize(new Dimension(70, 100));
        pileTopCard.addMouseListener(new MouseAdapter() {
            @Override
            public void mouseClicked(MouseEvent e) {
                if (isCurrentPlayer && player.getPersonalPileTop() != null && selectionListener != null) {
                    selectionListener.onPersonalPileSelected(player.getPlayerNumber() - 1);
                }
            }
        });
        
        JPanel pileWrapper = new JPanel(new FlowLayout(FlowLayout.CENTER, 0, 0));
        pileWrapper.setOpaque(false);
        pileWrapper.add(pileTopCard);
        topSection.add(pileWrapper, BorderLayout.CENTER);
        
        pileCountLabel = new JLabel("21 pile", SwingConstants.CENTER);
        pileCountLabel.setFont(new Font("Arial", Font.BOLD, 10));
        pileCountLabel.setForeground(Color.WHITE);
        topSection.add(pileCountLabel, BorderLayout.SOUTH);
        
        add(topSection, BorderLayout.NORTH);
        
        // CENTER: Storage on left, Hand+Avatar on right
        JPanel centerSection = new JPanel(new BorderLayout(10, 0));
        centerSection.setOpaque(false);
        
        // LEFT: Storage cards vertical with label
        JPanel storageSection = new JPanel(new BorderLayout(0, 3));
        storageSection.setOpaque(false);
        
        // "storage" label rotated vertically
        JLabel storageLabel = new JLabel("storage");
        storageLabel.setFont(new Font("Arial", Font.PLAIN, 9));
        storageLabel.setForeground(Color.WHITE);
        storageLabel.setHorizontalAlignment(SwingConstants.CENTER);
        storageSection.add(storageLabel, BorderLayout.NORTH);
        
        JPanel storageCards_panel = new JPanel();
        storageCards_panel.setLayout(new BoxLayout(storageCards_panel, BoxLayout.Y_AXIS));
        storageCards_panel.setOpaque(false);
        
        for (int i = 0; i < Player.STORAGE_STACKS; i++) {
            final int index = i;
            storageCards[i] = new CardPanel();
            storageCards[i].setPreferredSize(new Dimension(50, 70));
            storageCards[i].setMaximumSize(new Dimension(50, 70));
            storageCards[i].setAlignmentX(Component.CENTER_ALIGNMENT);
            storageCards[i].addMouseListener(new MouseAdapter() {
                @Override
                public void mouseClicked(MouseEvent e) {
                    if (!isCurrentPlayer || selectionListener == null) return;
                    if (hasCardSelected()) {
                        selectionListener.onStorageSelected(player.getPlayerNumber() - 1, index);
                    } else if (player.getStorageTop(index) != null) {
                        selectionListener.onStorageCardPlayRequest(player.getPlayerNumber() - 1, index);
                    }
                }
            });
            storageCards_panel.add(storageCards[i]);
            storageCards_panel.add(Box.createVerticalStrut(3));
            
            storageCountLabels[i] = new JLabel("");
            storageCountLabels[i].setVisible(false);
        }
        
        storageSection.add(storageCards_panel, BorderLayout.CENTER);
        centerSection.add(storageSection, BorderLayout.WEST);
        
        // RIGHT: Hand stack + Avatar
        JPanel rightSection = new JPanel(new BorderLayout(0, 10));
        rightSection.setOpaque(false);
        
        // Hand cards as overlapping stack
        JPanel handContainer = new JPanel() {
            @Override
            public Dimension getPreferredSize() {
                return new Dimension(80, 100);
            }
            
            @Override
            public void doLayout() {
                int cardWidth = 55;
                int cardHeight = 80;
                int overlapY = 15;
                int startX = (getWidth() - cardWidth) / 2;
                int startY = 0;
                
                for (int i = 0; i < handCards.length; i++) {
                    if (handCards[i] != null) {
                        handCards[i].setBounds(startX, startY + i * overlapY, cardWidth, cardHeight);
                    }
                }
            }
        };
        handContainer.setOpaque(false);
        handContainer.setLayout(null);
        
        for (int i = 0; i < Player.MAX_HAND_SIZE; i++) {
            final int index = i;
            handCards[i] = new CardPanel();
            handCards[i].addMouseListener(new MouseAdapter() {
                @Override
                public void mouseClicked(MouseEvent e) {
                    if (isCurrentPlayer && handCards[index].getCard() != null && selectionListener != null) {
                        selectionListener.onHandCardSelected(player.getPlayerNumber() - 1, index);
                    }
                }
            });
            handContainer.add(handCards[i]);
        }
        rightSection.add(handContainer, BorderLayout.CENTER);
        
        // Avatar and name at bottom
        JPanel avatarSection = new JPanel(new BorderLayout(0, 2));
        avatarSection.setOpaque(false);
        
        JPanel avatar = new JPanel() {
            @Override
            protected void paintComponent(Graphics g) {
                super.paintComponent(g);
                Graphics2D g2 = (Graphics2D) g.create();
                g2.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
                
                int size = 50;
                int x = (getWidth() - size) / 2;
                int y = 0;
                
                int colorIndex = (player.getPlayerNumber() - 1) % AVATAR_COLORS.length;
                g2.setColor(AVATAR_COLORS[colorIndex]);
                g2.fillOval(x, y, size, size);
                g2.setColor(new Color(100, 70, 40));
                g2.setStroke(new BasicStroke(2));
                g2.drawOval(x, y, size, size);
                
                // Eyes
                g2.setColor(Color.BLACK);
                g2.fillOval(x + 15, y + 18, 6, 6);
                g2.fillOval(x + 29, y + 18, 6, 6);
                g2.setStroke(new BasicStroke(2));
                g2.drawArc(x + 15, y + 28, 20, 12, 200, 140);
                
                g2.dispose();
            }
            
            @Override
            public Dimension getPreferredSize() {
                return new Dimension(60, 55);
            }
        };
        avatar.setOpaque(false);
        avatarSection.add(avatar, BorderLayout.CENTER);
        
        nameLabel = new JLabel(player.getName(), SwingConstants.CENTER);
        nameLabel.setFont(new Font("Arial", Font.BOLD, 11));
        nameLabel.setForeground(Color.WHITE);
        avatarSection.add(nameLabel, BorderLayout.SOUTH);
        
        rightSection.add(avatarSection, BorderLayout.SOUTH);
        
        centerSection.add(rightSection, BorderLayout.CENTER);
        
        add(centerSection, BorderLayout.CENTER);
    }

    @Override
    public Dimension getPreferredSize() {
        if (compactMode) {
            return new Dimension(180, 550);
        }
        // 21-pile (100 wide) + hand/storage area (250 wide) + avatar (80) + padding
        return new Dimension(450, 260);
    }
    
    @Override
    public Dimension getMinimumSize() {
        if (compactMode) {
            return new Dimension(150, 450);
        }
        return new Dimension(380, 240);
    }
}
