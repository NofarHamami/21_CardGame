package gui;

import engine.GameEngine;
import model.Player;

import javax.swing.*;
import java.awt.*;
import java.util.ArrayList;
import java.util.List;

/**
 * Main game window that displays the game board.
 */
public class GameWindow extends JFrame {
    private GameEngine engine;
    private GameController controller;
    
    // Panels
    private CenterPanel centerPanel;
    private List<PlayerPanel> playerPanels;
    private JPanel playersContainer;
    private JLabel statusLabel;
    private JButton endTurnButton;
    private JButton newGameButton;

    public GameWindow() {
        engine = new GameEngine();
        playerPanels = new ArrayList<>();
        
        setupWindow();
        setupMenuBar();
        setupUI();
        
        controller = new GameController(engine, this);
        centerPanel.setClickListener(controller);
        
        // Show player selection dialog
        SwingUtilities.invokeLater(this::showNewGameDialog);
    }

    private void setupWindow() {
        setTitle("21 Card Game");
        setDefaultCloseOperation(JFrame.EXIT_ON_CLOSE);
        setMinimumSize(new Dimension(900, 700));
        setPreferredSize(new Dimension(1200, 800));
        getContentPane().setBackground(new Color(60, 60, 60));
    }

    private void setupMenuBar() {
        JMenuBar menuBar = new JMenuBar();
        
        JMenu gameMenu = new JMenu("Game");
        
        JMenuItem newGameItem = new JMenuItem("New Game");
        newGameItem.addActionListener(e -> showNewGameDialog());
        gameMenu.add(newGameItem);
        
        gameMenu.addSeparator();
        
        JMenuItem exitItem = new JMenuItem("Exit");
        exitItem.addActionListener(e -> System.exit(0));
        gameMenu.add(exitItem);
        
        menuBar.add(gameMenu);
        
        JMenu helpMenu = new JMenu("Help");
        
        JMenuItem rulesItem = new JMenuItem("Rules");
        rulesItem.addActionListener(e -> showRulesDialog());
        helpMenu.add(rulesItem);
        
        menuBar.add(helpMenu);
        
        setJMenuBar(menuBar);
    }

    private void setupUI() {
        setLayout(new BorderLayout(0, 0));
        
        // Main game table - green felt background
        JPanel tablePanel = new JPanel(new BorderLayout(5, 5));
        tablePanel.setBackground(new Color(34, 139, 34)); // Forest green
        tablePanel.setBorder(BorderFactory.createEmptyBorder(10, 10, 10, 10));
        
        // Players container - will hold players positioned around the table
        playersContainer = new JPanel(new BorderLayout(5, 5));
        playersContainer.setOpaque(false);
        
        // Center panel in the middle
        centerPanel = new CenterPanel();
        playersContainer.add(centerPanel, BorderLayout.CENTER);
        
        tablePanel.add(playersContainer, BorderLayout.CENTER);
        
        add(tablePanel, BorderLayout.CENTER);
        
        // Bottom panel - controls
        JPanel controlPanel = new JPanel(new FlowLayout(FlowLayout.CENTER, 20, 10));
        controlPanel.setBackground(new Color(50, 50, 50));
        controlPanel.setBorder(BorderFactory.createEmptyBorder(5, 10, 5, 10));
        
        endTurnButton = new JButton("End Turn");
        endTurnButton.setFont(new Font("Arial", Font.BOLD, 14));
        endTurnButton.setPreferredSize(new Dimension(120, 35));
        endTurnButton.addActionListener(e -> {
            if (controller != null) controller.endTurn();
        });
        controlPanel.add(endTurnButton);
        
        newGameButton = new JButton("New Game");
        newGameButton.setFont(new Font("Arial", Font.BOLD, 14));
        newGameButton.setPreferredSize(new Dimension(120, 35));
        newGameButton.addActionListener(e -> showNewGameDialog());
        controlPanel.add(newGameButton);
        
        statusLabel = new JLabel("Welcome to 21 Card Game!");
        statusLabel.setFont(new Font("Arial", Font.PLAIN, 14));
        statusLabel.setForeground(Color.WHITE);
        controlPanel.add(Box.createHorizontalStrut(30));
        controlPanel.add(statusLabel);
        
        add(controlPanel, BorderLayout.SOUTH);
    }

    private void showNewGameDialog() {
        String[] options = {"2 Players", "3 Players", "4 Players"};
        int choice = JOptionPane.showOptionDialog(
            this,
            "Select number of players:",
            "New Game",
            JOptionPane.DEFAULT_OPTION,
            JOptionPane.QUESTION_MESSAGE,
            null,
            options,
            options[0]
        );
        
        if (choice >= 0) {
            int numPlayers = choice + 2;
            startNewGame(numPlayers);
        }
    }

    private void startNewGame(int numPlayers) {
        // Clear existing player panels
        playersContainer.removeAll();
        playerPanels.clear();
        
        // Keep center panel and position players around the table
        playersContainer.setLayout(new BorderLayout(10, 10));
        
        // Start the game
        engine.setupGame(numPlayers);
        
        // Create player panels and position them around the table
        // Player 1 is always at bottom (main player / "You")
        // Other players are positioned clockwise
        
        if (numPlayers == 2) {
            // 2 players: bottom and top
            createPlayerPanel(0, BorderLayout.SOUTH, PlayerPanel.Position.BOTTOM);
            createPlayerPanel(1, BorderLayout.NORTH, PlayerPanel.Position.TOP);
        } else if (numPlayers == 3) {
            // 3 players: bottom, left, right
            createPlayerPanel(0, BorderLayout.SOUTH, PlayerPanel.Position.BOTTOM);
            createPlayerPanel(1, BorderLayout.WEST, PlayerPanel.Position.LEFT);
            createPlayerPanel(2, BorderLayout.EAST, PlayerPanel.Position.RIGHT);
        } else if (numPlayers == 4) {
            // 4 players: bottom, left, top, right (clockwise)
            createPlayerPanel(0, BorderLayout.SOUTH, PlayerPanel.Position.BOTTOM);
            createPlayerPanel(1, BorderLayout.WEST, PlayerPanel.Position.LEFT);
            createPlayerPanel(2, BorderLayout.NORTH, PlayerPanel.Position.TOP);
            createPlayerPanel(3, BorderLayout.EAST, PlayerPanel.Position.RIGHT);
        }
        
        // Add center panel in the middle
        playersContainer.add(centerPanel, BorderLayout.CENTER);
        
        // Setup center panel
        centerPanel.setCenterPiles(engine.getCenterPiles());
        centerPanel.setClickListener(controller);
        centerPanel.setMessage("Game started! " + engine.getPlayer(0).getName() + "'s turn.");
        
        refreshDisplay();
        
        playersContainer.revalidate();
        playersContainer.repaint();
    }
    
    private void createPlayerPanel(int playerIndex, String position, PlayerPanel.Position tablePosition) {
        Player player = engine.getPlayer(playerIndex);
        PlayerPanel panel = new PlayerPanel(player);
        panel.setPosition(tablePosition);
        panel.setSelectionListener(controller);
        
        // For side positions (WEST/EAST), use compact layout
        if (position.equals(BorderLayout.WEST) || position.equals(BorderLayout.EAST)) {
            panel.setCompactMode(true);
        }
        
        playerPanels.add(panel);
        playersContainer.add(panel, position);
    }
    
    public CenterPanel getCenterPanel() {
        return centerPanel;
    }

    public void refreshDisplay() {
        // Update current player highlighting
        int currentIndex = engine.getCurrentPlayerIndex();
        for (int i = 0; i < playerPanels.size(); i++) {
            PlayerPanel panel = playerPanels.get(i);
            panel.setCurrentPlayer(i == currentIndex);
            panel.refresh();
        }
        
        // Update center panel
        centerPanel.setStockPileCount(engine.getStockPileSize());
        centerPanel.refresh();
        
        // Update end turn button state
        endTurnButton.setEnabled(engine.canEndTurn());
    }

    public void showMessage(String message) {
        statusLabel.setText(message);
    }

    public void showWinDialog(Player winner) {
        int choice = JOptionPane.showConfirmDialog(
            this,
            winner.getName() + " wins the game!\n\nWould you like to play again?",
            "Game Over",
            JOptionPane.YES_NO_OPTION,
            JOptionPane.INFORMATION_MESSAGE
        );
        
        if (choice == JOptionPane.YES_OPTION) {
            showNewGameDialog();
        }
    }

    public void showRulesDialog() {
        String rules = "21 CARD GAME RULES\n" +
            "==================\n\n" +
            "SETUP:\n" +
            "- Each player gets 5 cards in hand and 21 cards in their personal pile\n" +
            "- Only the top card of the 21-pile is visible\n\n" +
            "GOAL:\n" +
            "- Be the first to empty your 21-card pile\n\n" +
            "CENTER PILES:\n" +
            "- 4 piles in the center\n" +
            "- Cards are played in sequence: A, 2, 3, 4, 5, 6, 7, 8, 9, 10, J, Q\n" +
            "- King is WILD and can replace ANY card (including Ace to start a pile)\n\n" +
            "YOUR TURN:\n" +
            "1. Refill your hand to 5 cards from the stock pile\n" +
            "2. You MUST play at least 1 card before ending your turn\n" +
            "3. Play cards from: Hand, 21-pile top, or Storage tops\n" +
            "4. Play to: Center piles (continue turn) or Storage (ends turn)\n" +
            "5. If hand becomes empty, draw 5 more and continue\n\n" +
            "STORAGE:\n" +
            "- 5 stacks per player\n" +
            "- Can only use top card of each stack\n" +
            "- Playing to storage ends your turn\n\n" +
            "HOW TO PLAY:\n" +
            "- Click a card to select it\n" +
            "- Click a center pile to play there\n" +
            "- Click a storage stack to place there (ends turn)\n" +
            "- Click 'End Turn' when done (after playing at least 1 card)";
        
        JTextArea textArea = new JTextArea(rules);
        textArea.setEditable(false);
        textArea.setFont(new Font("Monospaced", Font.PLAIN, 12));
        
        JScrollPane scrollPane = new JScrollPane(textArea);
        scrollPane.setPreferredSize(new Dimension(500, 400));
        
        JOptionPane.showMessageDialog(this, scrollPane, "Game Rules", JOptionPane.INFORMATION_MESSAGE);
    }

    public PlayerPanel getPlayerPanel(int index) {
        if (index >= 0 && index < playerPanels.size()) {
            return playerPanels.get(index);
        }
        return null;
    }

    public static void main(String[] args) {
        try {
            UIManager.setLookAndFeel(UIManager.getSystemLookAndFeelClassName());
        } catch (Exception e) {
            // Use default look and feel
        }
        
        SwingUtilities.invokeLater(() -> {
            GameWindow window = new GameWindow();
            window.pack();
            window.setLocationRelativeTo(null);
            window.setVisible(true);
        });
    }
}
