# Lovable UI Integration Guide

This directory is for UI components exported from Lovable.

## How to Integrate Lovable UI

### Option 1: Copy Component Files
1. Export your design from Lovable (usually as React components)
2. Copy the component files into this `ui/` directory
3. Adapt web components to React Native:
   - Replace `div` → `View`
   - Replace `span`/`p` → `Text`
   - Replace `className` → `style` prop
   - Replace CSS files → StyleSheet.create() or inline styles
   - Replace `onClick` → `onPress` for TouchableOpacity/Pressable

### Option 2: Manual Integration
1. Copy component code from Lovable
2. Create new files in this directory
3. Adapt styling to use React Native StyleSheet or inline styles

### Option 3: Styling Only
If you only want the visual design:
1. Extract colors, spacing, typography from Lovable
2. Update your existing components' styles
3. Create a theme file with design tokens

## Notes
- Lovable typically exports web React components
- This project uses React Native, so components need adaptation
- Focus on visual styling: colors, spacing, typography, layout
- Keep your existing component logic, just update the UI
