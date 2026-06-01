import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SheetDataContext, useSheetDataProvider } from '../hooks/useSheetData';

export default function RootLayout() {
  const sheetData = useSheetDataProvider();
  return (
    <SheetDataContext.Provider value={sheetData}>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }} />
    </SheetDataContext.Provider>
  );
}
