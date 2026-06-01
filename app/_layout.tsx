import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { COLORS } from '../constants';
import { SheetDataContext, useSheetDataProvider } from '../hooks/useSheetData';

function AppLayout() {
  return (
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
  );
}

export default function RootLayout() {
  const sheetData = useSheetDataProvider();

  return (
    <SheetDataContext.Provider value={sheetData}>
      <StatusBar style="dark" />
      <AppLayout />
    </SheetDataContext.Provider>
  );
}
