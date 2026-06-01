import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { COLORS } from '../constants';

export default function RootLayout() {
  return (
    <>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: COLORS.white },
          headerShadowVisible: false,
          headerTitleStyle: {
            fontWeight: '500',
            fontSize: 16,
            color: COLORS.black,
          },
          headerTintColor: COLORS.black,
          contentStyle: { backgroundColor: COLORS.background },
        }}
      />
    </>
  );
}
