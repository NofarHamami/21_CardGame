/**
 * Theme colors extracted from Lovable design
 * All colors are in HSL format matching the original design system
 */

// Convert HSL to hex for React Native
const hslToHex = (h: number, s: number, l: number): string => {
  l /= 100;
  const a = (s * Math.min(l, 1 - l)) / 100;
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color)
      .toString(16)
      .padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
};

export const colors = {
  // Background colors (felt table) - blended match to logo background
  background: '#0a3d1f', // blended between logo edge and center colors
  felt: '#0a3d1f',
  feltDark: '#042c15', // darker felt matching logo edges
  feltLight: '#0f4a28', // lighter felt

  // Foreground/text colors
  foreground: hslToHex(45, 100, 96), // --foreground: 45 100% 96%
  
  // Card colors
  card: hslToHex(45, 30, 96), // --card: 45 30% 96%
  cardForeground: hslToHex(0, 0, 10), // --card-foreground: 0 0% 10%
  cardRed: hslToHex(0, 75, 50), // --card-red: 0 75% 50%
  cardBlack: hslToHex(0, 0, 15), // --card-black: 0 0% 15%

  // Primary/Gold colors
  primary: hslToHex(45, 90, 55), // --primary: 45 90% 55%
  primaryForeground: hslToHex(0, 0, 10), // --primary-foreground: 0 0% 10%
  gold: hslToHex(45, 90, 55), // --gold: 45 90% 55%
  goldLight: hslToHex(45, 95, 70), // --gold-light: 45 95% 70%

  // Secondary colors
  secondary: hslToHex(150, 40, 30), // --secondary: slightly lighter than background
  secondaryForeground: hslToHex(45, 100, 96), // --secondary-foreground: 45 100% 96%

  // Accent colors
  accent: hslToHex(45, 85, 50), // --accent: 45 85% 50%
  accentForeground: hslToHex(0, 0, 10), // --accent-foreground: 0 0% 10%

  // Muted colors
  muted: hslToHex(150, 35, 28), // --muted: muted green
  mutedForeground: hslToHex(145, 20, 60), // --muted-foreground: 145 20% 60%

  // Border colors
  border: hslToHex(150, 35, 33), // --border: subtle border green

  // Success color
  success: hslToHex(142, 70, 45), // --success: 142 70% 45%

  // Destructive/Error colors
  destructive: hslToHex(0, 84.2, 60.2), // --destructive: 0 84.2% 60.2%
  destructiveForeground: hslToHex(0, 0, 100), // --destructive-foreground: 0 0% 100%

  // Popover colors
  popover: hslToHex(150, 45, 26), // --popover: popover green
  popoverForeground: hslToHex(45, 100, 96), // --popover-foreground: 45 100% 96%
};

// Opacity helpers
export const opacity = {
  '10': '1A',
  '20': '33',
  '30': '4D',
  '40': '66',
  '50': '80',
  '60': '99',
  '70': 'B3',
  '80': 'CC',
  '90': 'E6',
};

// Helper function to add opacity to hex color
export const withOpacity = (color: string, opacity: string): string => {
  return `${color}${opacity}`;
};

// Spacing scale (matching Tailwind defaults)
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  '4xl': 40,
};

// Border radius
export const borderRadius = {
  sm: 4,
  md: 6,
  lg: 8,
  xl: 12,
  '2xl': 16,
  full: 9999,
};

// Typography
export const typography = {
  xs: { fontSize: 10 },
  sm: { fontSize: 12 },
  base: { fontSize: 14 },
  lg: { fontSize: 16 },
  xl: { fontSize: 18 },
  '2xl': { fontSize: 20 },
  '3xl': { fontSize: 24 },
  '4xl': { fontSize: 32 },
};
