export type RootStackParamList = {
  Home: undefined;
  PlayerSetup: { gameMode: 'practice' | 'private' | 'random'; numPlayers: number };
  Game: {
    numPlayers: number;
    playerName?: string;
    playerAvatar?: string;
    gameMode?: 'practice' | 'private' | 'random';
    resumeState?: string;
    aiDifficulty?: 'easy' | 'medium' | 'hard';
    timedMode?: boolean;
  };
  Scoreboard: {
    players: Array<{ name: string; avatar?: string; score: number; cardsRemaining: number }>;
    turnsPlayed: number;
    gameMode?: string;
    numPlayers: number;
    aiDifficulty?: 'easy' | 'medium' | 'hard';
  };
  WaitingRoom: { gameMode: 'random'; numPlayers: number; playerName: string; playerAvatar: string };
  Stats: undefined;
};
