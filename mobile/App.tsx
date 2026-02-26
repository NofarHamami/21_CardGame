import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import { HomeScreen } from './src/screens/HomeScreen';
import { GameScreen } from './src/screens/GameScreen';
import { PlayerSetupScreen } from './src/screens/PlayerSetupScreen';
import { ScoreboardScreen } from './src/screens/ScoreboardScreen';
import { WaitingRoomScreen } from './src/screens/WaitingRoomScreen';
import { StatsScreen } from './src/screens/StatsScreen';

export type RootStackParamList = {
  Home: undefined;
  PlayerSetup: { gameMode: 'practice' | 'private' | 'random'; numPlayers: number };
  Game: { numPlayers: number; playerName?: string; playerAvatar?: string; gameMode?: 'practice' | 'private' | 'random'; resumeState?: string };
  Scoreboard: {
    players: Array<{ name: string; avatar?: string; score: number; cardsRemaining: number }>;
    turnsPlayed: number;
    gameMode?: string;
    numPlayers: number;
    aiDifficulty?: string;
  };
  WaitingRoom: { gameMode: 'random'; numPlayers: number; playerName: string; playerAvatar: string };
  Stats: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <NavigationContainer>
          <StatusBar style="light" />
          <Stack.Navigator
          initialRouteName="Home"
          screenOptions={{
            headerStyle: {
              backgroundColor: '#1F2937',
            },
            headerTintColor: '#FFFFFF',
            headerTitleStyle: {
              fontWeight: 'bold',
            },
            contentStyle: {
              backgroundColor: '#1F2937',
            },
          }}
        >
          <Stack.Screen
            name="Home"
            component={HomeScreen}
            options={{
              title: '21 Card Game',
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="PlayerSetup"
            component={PlayerSetupScreen}
            options={{
              title: 'הגדרת שחקן',
              headerBackTitle: 'חזור',
            }}
          />
          <Stack.Screen
            name="Game"
            component={GameScreen}
            options={{
              title: 'Playing',
              headerBackTitle: 'Menu',
            }}
          />
          <Stack.Screen
            name="Scoreboard"
            component={ScoreboardScreen}
            options={{
              title: 'טבלת ניקוד',
              headerBackVisible: false,
              gestureEnabled: false,
            }}
          />
          <Stack.Screen
            name="WaitingRoom"
            component={WaitingRoomScreen}
            options={{
              title: 'חדר המתנה',
              headerBackVisible: false,
              gestureEnabled: false,
            }}
          />
          <Stack.Screen
            name="Stats"
            component={StatsScreen}
            options={{
              title: 'Statistics',
              headerBackTitle: 'Back',
            }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </GestureHandlerRootView>
    </ErrorBoundary>
  );
}
