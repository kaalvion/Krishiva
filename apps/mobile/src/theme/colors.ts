export const colors = {
  primary: '#2E7D32',
  primaryDark: '#1B5E20',
  primaryLight: '#4CAF50',
  primarySurface: '#E8F5E9',
  
  background: '#F8FAF8',
  card: '#FFFFFF',
  
  text: '#1C2826',
  textSecondary: '#5F7161',
  textMuted: '#8D9F87',
  textInverse: '#FFFFFF',
  
  border: '#E0E6E0',
  borderLight: '#EDF2ED',
  
  accent: '#F9A825',
  success: '#2E7D32',
  warning: '#EF6C00',
  error: '#D32F2F',
  errorSurface: '#FFEBEE',
  
  online: '#2E7D32',
  offline: '#8D9F87',
  
  shadow: '#000000',
} as const;

export type ThemeColors = typeof colors;
