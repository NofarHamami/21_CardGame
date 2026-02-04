import gui.GameWindow;

import javax.swing.*;

/**
 * Main entry point for the 21 Card Game.
 */
public class Main {
    public static void main(String[] args) {
        // Set system look and feel for better appearance
        try {
            UIManager.setLookAndFeel(UIManager.getSystemLookAndFeelClassName());
        } catch (Exception e) {
            // Use default look and feel if system L&F is not available
            System.out.println("Using default look and feel");
        }

        // Create and show the game window on the Event Dispatch Thread
        SwingUtilities.invokeLater(() -> {
            GameWindow window = new GameWindow();
            window.pack();
            window.setLocationRelativeTo(null); // Center on screen
            window.setVisible(true);
        });
    }
}
