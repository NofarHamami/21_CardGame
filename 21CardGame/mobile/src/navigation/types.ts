export type GameMode = 'practice' | 'private' | 'random';

export type RootStackParamList = {
  Home: undefined;
  PlayerSetup: { gameMode: GameMode; numPlayers: number };
  Game: {
    numPlayers: number;
    playerName?: string;
    playerAvatar?: string;
    gameMode?: GameMode;
    resumeState?: string;
    aiDifficulty?: 'easy' | 'medium' | 'hard';
    timedMode?: boolean;
    roomCode?: string;
    playerId?: string;
  };
  Scoreboard: {
    players: Array<{ name: string; avatar?: string; score: number; cardsRemaining: number }>;
    turnsPlayed: number;
    gameMode?: string;
    numPlayers: number;
    aiDifficulty?: 'easy' | 'medium' | 'hard';
  };
  WaitingRoom: {
    gameMode: 'private' | 'random';
    numPlayers: number;
    playerName: string;
    playerAvatar: string;
    privateAction?: 'create' | 'join';
    joinCode?: string;
    timedMode?: boolean;
  };
  Stats: undefined;
};
