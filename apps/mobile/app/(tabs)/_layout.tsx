import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Tabs } from 'expo-router';

const brickTint = '#C45C3E';
const mutedTint = '#7A7369';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: brickTint,
        tabBarInactiveTintColor: mutedTint,
        headerStyle: { backgroundColor: '#FBF8F4' },
        headerTitleStyle: { color: '#1F1C19', fontWeight: '600' },
        tabBarStyle: { backgroundColor: '#FBF8F4' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Aujourd'hui",
          tabBarIcon: ({ color }) => <FontAwesome name="sun-o" size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Explorer',
          tabBarIcon: ({ color }) => <FontAwesome name="search" size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="map"
        options={{
          title: 'Carte',
          tabBarIcon: ({ color }) => <FontAwesome name="map-marker" size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="for-me"
        options={{
          title: 'Pour moi',
          tabBarIcon: ({ color }) => <FontAwesome name="heart-o" size={22} color={color} />,
        }}
      />
    </Tabs>
  );
}
