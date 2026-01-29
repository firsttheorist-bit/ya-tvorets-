// app/(tabs)/_layout.tsx

import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import React from 'react';
import { useAppLanguage } from '../LanguageContext';

export default function TabLayout() {
  const { language } = useAppLanguage();
  const isUa = language === 'ua';

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#2B2620',
        tabBarInactiveTintColor: '#9B8F7C',
        tabBarStyle: {
          backgroundColor: '#F3F0E8',
          borderTopColor: '#D9CCB8',
        },
        tabBarLabelStyle: {
          fontSize: 11,
        },
      }}
    >
      {/* Today / Главный экран */}
      <Tabs.Screen
        name="index"
        options={{
          title: isUa ? 'Сьогодні' : 'Today',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" size={size} color={color} />
          ),
        }}
      />

      {/* Журнал */}
      <Tabs.Screen
        name="journal"
        options={{
          title: isUa ? 'Щоденник' : 'Journal',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="book-outline" size={size} color={color} />
          ),
        }}
      />

      {/* Челенджі */}
      <Tabs.Screen
        name="challenges"
        options={{
          title: isUa ? 'Челенджі' : 'Challenges',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="flash-outline" size={size} color={color} />
          ),
        }}
      />

      {/* Новая вкладка: Шлях Творця */}
      <Tabs.Screen
        name="creatorPath"
        options={{
          title: isUa ? 'Шлях' : 'Path',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="map-outline" size={size} color={color} />
          ),
        }}
      />

      {/* Профіль */}
      <Tabs.Screen
        name="profile"
        options={{
          title: isUa ? 'Профіль' : 'Profile',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-outline" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
