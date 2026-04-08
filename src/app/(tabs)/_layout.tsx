import { Tabs } from "expo-router";

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ headerTitleAlign: "center" }}>
      <Tabs.Screen
        name="index"
        options={{ title: "Dashboard", tabBarLabel: "Dashboard" }}
      />
      <Tabs.Screen
        name="transactions"
        options={{ title: "Transactions", tabBarLabel: "Transactions" }}
      />
      <Tabs.Screen
        name="insights"
        options={{ title: "Insights", tabBarLabel: "Insights ✨" }}
      />
    </Tabs>
  );
}
