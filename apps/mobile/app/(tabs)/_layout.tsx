import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Tabs } from 'expo-router';
import { Platform } from 'react-native';

const brickTint = '#C45C3E';
const mutedTint = '#A39B90';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: brickTint,
        tabBarInactiveTintColor: mutedTint,
        tabBarLabelStyle: {
          fontSize: 11,
          fontFamily: 'SourceSans3_600SemiBold',
          marginTop: 2,
        },
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopColor: '#EDE0CB',
          borderTopWidth: 1,
          height: Platform.OS === 'ios' ? 84 : 64,
          paddingTop: 10,
          paddingBottom: Platform.OS === 'ios' ? 26 : 10,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Aujourd'hui",
          tabBarIcon: ({ color, focused }) => (
            <FontAwesome name={focused ? 'home' : 'home'} size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Explorer',
          tabBarIcon: ({ color }) => <FontAwesome name="search" size={20} color={color} />,
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
          tabBarIcon: ({ color }) => <FontAwesome name="user-o" size={20} color={color} />,
        }}
      />
    </Tabs>
  );
}
