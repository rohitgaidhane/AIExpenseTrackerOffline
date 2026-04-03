import { Stack } from "expo-router";

import { DatabaseProvider } from "@/providers/database-provider";

export default function RootLayout() {
  return (
    <DatabaseProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
      </Stack>
    </DatabaseProvider>
  );
}
