/**
 * Theme colors extracted from Lovable design
 * Supports multiple theme presets.
 */

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

export interface ThemeColors {
  background: string;
  felt: string;
  feltDark: string;
  feltLight: string;
  foreground: string;
  card: string;
  cardForeground: string;
  cardRed: string;
  cardBlack: string;
  primary: string;
  primaryForeground: string;
  gold: string;
  goldLight: string;
  secondary: string;
  secondaryForeground: string;
  accent: string;
  accentForeground: string;
  muted: string;
  mutedForeground: string;
  border: string;
  success: string;
  destructive: string;
  destructiveForeground: string;
  popover: string;
  popoverForeground: string;
}

const classicTheme: ThemeColors = {
  background: '#0a3d1f',
  felt: '#0a3d1f',
  feltDark: '#042c15',
  feltLight: '#0f4a28',
  foreground: hslToHex(45, 100, 96),
  card: hslToHex(45, 30, 96),
  cardForeground: hslToHex(0, 0, 10),
  cardRed: hslToHex(0, 75, 50),
  cardBlack: hslToHex(0, 0, 15),
  primary: hslToHex(45, 90, 55),
  primaryForeground: hslToHex(0, 0, 10),
  gold: hslToHex(45, 90, 55),
  goldLight: hslToHex(45, 95, 70),
  secondary: hslToHex(150, 40, 30),
  secondaryForeground: hslToHex(45, 100, 96),
  accent: hslToHex(45, 85, 50),
  accentForeground: hslToHex(0, 0, 10),
  muted: hslToHex(150, 35, 28),
  mutedForeground: hslToHex(145, 20, 60),
  border: hslToHex(150, 35, 33),
  success: hslToHex(142, 70, 45),
  destructive: hslToHex(0, 84.2, 60.2),
  destructiveForeground: hslToHex(0, 0, 100),
  popover: hslToHex(150, 45, 26),
  popoverForeground: hslToHex(45, 100, 96),
};

const blueTheme: ThemeColors = {
  background: '#0d1b3e',
  felt: '#0d1b3e',
  feltDark: '#070f24',
  feltLight: '#142550',
  foreground: hslToHex(210, 100, 96),
  card: hslToHex(45, 30, 96),
  cardForeground: hslToHex(0, 0, 10),
  cardRed: hslToHex(0, 75, 50),
  cardBlack: hslToHex(0, 0, 15),
  primary: hslToHex(210, 80, 55),
  primaryForeground: hslToHex(0, 0, 100),
  gold: hslToHex(45, 90, 55),
  goldLight: hslToHex(45, 95, 70),
  secondary: hslToHex(220, 40, 30),
  secondaryForeground: hslToHex(210, 100, 96),
  accent: hslToHex(210, 80, 60),
  accentForeground: hslToHex(0, 0, 100),
  muted: hslToHex(220, 35, 25),
  mutedForeground: hslToHex(215, 20, 60),
  border: hslToHex(220, 35, 33),
  success: hslToHex(142, 70, 45),
  destructive: hslToHex(0, 84.2, 60.2),
  destructiveForeground: hslToHex(0, 0, 100),
  popover: hslToHex(220, 45, 22),
  popoverForeground: hslToHex(210, 100, 96),
};

const purpleTheme: ThemeColors = {
  background: '#1a0d2e',
  felt: '#1a0d2e',
  feltDark: '#0f0619',
  feltLight: '#251540',
  foreground: hslToHex(270, 100, 96),
  card: hslToHex(45, 30, 96),
  cardForeground: hslToHex(0, 0, 10),
  cardRed: hslToHex(0, 75, 50),
  cardBlack: hslToHex(0, 0, 15),
  primary: hslToHex(270, 70, 55),
  primaryForeground: hslToHex(0, 0, 100),
  gold: hslToHex(45, 90, 55),
  goldLight: hslToHex(45, 95, 70),
  secondary: hslToHex(270, 35, 28),
  secondaryForeground: hslToHex(270, 100, 96),
  accent: hslToHex(270, 70, 60),
  accentForeground: hslToHex(0, 0, 100),
  muted: hslToHex(270, 30, 25),
  mutedForeground: hslToHex(270, 20, 60),
  border: hslToHex(270, 30, 33),
  success: hslToHex(142, 70, 45),
  destructive: hslToHex(0, 84.2, 60.2),
  destructiveForeground: hslToHex(0, 0, 100),
  popover: hslToHex(270, 40, 22),
  popoverForeground: hslToHex(270, 100, 96),
};

const redTheme: ThemeColors = {
  background: '#2e0d0d',
  felt: '#2e0d0d',
  feltDark: '#1a0606',
  feltLight: '#3d1515',
  foreground: hslToHex(0, 100, 96),
  card: hslToHex(45, 30, 96),
  cardForeground: hslToHex(0, 0, 10),
  cardRed: hslToHex(0, 75, 50),
  cardBlack: hslToHex(0, 0, 15),
  primary: hslToHex(0, 70, 50),
  primaryForeground: hslToHex(0, 0, 100),
  gold: hslToHex(45, 90, 55),
  goldLight: hslToHex(45, 95, 70),
  secondary: hslToHex(0, 35, 25),
  secondaryForeground: hslToHex(0, 100, 96),
  accent: hslToHex(0, 70, 55),
  accentForeground: hslToHex(0, 0, 100),
  muted: hslToHex(0, 30, 22),
  mutedForeground: hslToHex(0, 20, 60),
  border: hslToHex(0, 30, 30),
  success: hslToHex(142, 70, 45),
  destructive: hslToHex(0, 84.2, 60.2),
  destructiveForeground: hslToHex(0, 0, 100),
  popover: hslToHex(0, 40, 20),
  popoverForeground: hslToHex(0, 100, 96),
};

export const themePresets = {
  classic: classicTheme,
  blue: blueTheme,
  purple: purpleTheme,
  red: redTheme,
} as const;

export type ThemePresetName = keyof typeof themePresets;

let _activeTheme: ThemePresetName = 'classic';

export function setActiveTheme(theme: ThemePresetName) {
  _activeTheme = theme;
  Object.assign(colors, themePresets[theme]);
}

export function getActiveTheme(): ThemePresetName {
  return _activeTheme;
}

// Mutable colors object that components import
export const colors: ThemeColors = { ...classicTheme };

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

export const withOpacity = (color: string, opacity: string): string => {
  return `${color}${opacity}`;
};

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

export const borderRadius = {
  sm: 4,
  md: 6,
  lg: 8,
  xl: 12,
  '2xl': 16,
  full: 9999,
};

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
