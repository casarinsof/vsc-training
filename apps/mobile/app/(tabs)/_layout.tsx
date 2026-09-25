import { Ionicons } from "@expo/vector-icons";
import { colors } from "@vsc-training/design-tokens";
import { Tabs } from "expo-router";

const icons: Record<string, keyof typeof Ionicons.glyphMap> = {
  index: "home",
  programma: "barbell",
  progressi: "stats-chart",
  messaggi: "chatbubble-ellipses",
  profilo: "person"
};

export default function TabLayout() {
  return (
    <Tabs screenOptions={({ route }) => ({
      headerShown: false,
      tabBarActiveTintColor: colors.primary,
      tabBarInactiveTintColor: colors.textMuted,
      tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border, height: 82, paddingTop: 8 },
      tabBarLabelStyle: { fontSize: 10, fontWeight: "600", marginBottom: 8 },
      tabBarIcon: ({ color, size }) => <Ionicons name={icons[route.name] ?? "ellipse"} color={color} size={size} />
    })}>
      <Tabs.Screen name="index" options={{ title: "Oggi" }} />
      <Tabs.Screen name="programma" options={{ title: "Programma" }} />
      <Tabs.Screen name="progressi" options={{ title: "Progressi" }} />
      <Tabs.Screen name="messaggi" options={{ title: "Messaggi", tabBarBadge: 2 }} />
      <Tabs.Screen name="profilo" options={{ title: "Profilo" }} />
    </Tabs>
  );
}