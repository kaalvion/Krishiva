export const colors = {
  // Brand Precision Agriculture tokens (Lime & Forest Green theme)
  primary: '#C6E85A', // Brand Primary (Lime)
  primaryDark: '#1E2A1E', // Brand Dark (Forest Green)
  primaryLight: '#D9F284',
  primarySurface: '#f3f4f2', // Surface Container (Off-white)

  background: '#f9faf8', // Scaffold Background
  card: '#ffffff', // Surface (Cards)
  surface: '#ffffff',
  surfaceContainer: '#f3f4f2', // Surface Container (Off-white)

  text: '#191c1b', // Brand Text Dark
  textSecondary: '#556253', // Brand Text Secondary
  textMuted: '#70796E',
  textInverse: '#1E2A1E', // Dark text on Lime button

  border: '#E1E4DF',
  borderLight: '#EDF0EB',

  accent: '#C6E85A',
  success: '#2E7D32',
  warning: '#EF6C00', // Warning
  error: '#ba1a1a', // Error/Offline
  errorSurface: '#FFDAD6',

  online: '#2E7D32',
  offline: '#ba1a1a', // Error/Offline

  shadow: '#1E2A1E',
} as const;

export type ThemeColors = typeof colors;
