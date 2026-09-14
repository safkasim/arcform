/**
 * Semantic design tokens for the mobile app.
 *
 * These tokens mirror the naming conventions used in web artifacts (index.css)
 * so that multi-artifact projects share a cohesive visual identity.
 *
 * Replace the placeholder values below with values that match the project's
 * brand. If a sibling web artifact exists, read its index.css and convert the
 * HSL values to hex so both artifacts use the same palette.
 *
 * To add dark mode, add a `dark` key with the same token names.
 * The useColors() hook will automatically pick it up.
 */

const palette = {
  text: '#ffffff',
  tint: '#ffffff',
  background: '#000000',
  foreground: '#ffffff',
  card: '#0a0a0a',
  cardForeground: '#ffffff',
  primary: '#ffffff',
  primaryForeground: '#000000',
  secondary: '#141414',
  secondaryForeground: '#ffffff',
  muted: '#1a1a1a',
  mutedForeground: '#8c8c8c',
  accent: '#262626',
  accentForeground: '#ffffff',
  destructive: '#ffffff',
  destructiveForeground: '#000000',
  border: '#333333',
  input: '#333333',
  success: '#d9ff70',
};

const colors = {
  light: {
    ...palette,
  },
  dark: {
    ...palette,
  },
  radius: 16,
};

export default colors;
