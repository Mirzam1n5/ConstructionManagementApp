import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ThemeContext, usePersistedTheme, DARK, LIGHT } from '../hooks/useTheme';

export default function RootLayout() {
  const [isDark, setIsDark] = usePersistedTheme();
  const D = isDark ? DARK : LIGHT;
  const toggleTheme = () => setIsDark(v => !v);

  return (
    <ThemeContext.Provider value={{ D, isDark, toggleTheme }}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: D.panel },
          headerShadowVisible: false,
          headerTitleStyle: {
            fontWeight: '700',
            fontSize: 15,
            color: D.text,
          },
          headerTintColor: D.text,
          contentStyle: { backgroundColor: D.bg },
        }}
      />
    </ThemeContext.Provider>
  );
}
