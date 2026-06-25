export enum AppMode {
  SINGLE_SHEET_MATCHES = 'SINGLE_SHEET_MATCHES', // Each row is a match with players & phones
  SINGLE_SHEET_PLAYERS = 'SINGLE_SHEET_PLAYERS', // Each row is a player with match columns
  TWO_SHEETS_LINKED = 'TWO_SHEETS_LINKED',     // Separate Players and Matches tabs
}

export interface ColumnMapping {
  // Players Sheet Columns
  playerPhone: string;
  playerName: string;
  playerAge?: string;
  playerGroup?: string;
  playerId?: string;
  playerSbd?: string;
  playerParentName?: string;
  playerAddress?: string;
  playerSkill?: string;
  playerCustomFields?: string[]; // Extra columns to show in personal info

  // Matches Sheet Columns
  matchRound?: string;
  matchTime?: string;
  matchGroup?: string;
  matchCourt?: string;
  matchPlayer1Name?: string;
  matchPlayer1Phone?: string;
  matchPlayer2Name?: string;
  matchPlayer2Phone?: string;
  matchStatus?: string;
  matchResult?: string;
  matchCustomFields?: string[]; // Extra columns to show in match details
}

export interface SpreadsheetConfig {
  spreadsheetId: string;
  playersTabName: string;
  matchesTabName: string;
  mode: AppMode;
  mapping: ColumnMapping;
  tournamentName: string;
  organizerName: string;
  adminPassword?: string;
  bannerUrl?: string;
  footerText?: string;
  manualPlayersCount?: string;
  manualRoundsCount?: string;
  manualCompletedMatchesCount?: string;
  tournamentIcon?: string;
}

export interface PlayerInfo {
  id: string;
  name: string;
  phone: string;
  age?: string;
  group?: string;
  customData: Record<string, string>;
}

export interface MatchInfo {
  id: string;
  round?: string;
  time?: string;
  group?: string;
  court?: string;
  player1Name: string;
  player1Phone?: string;
  player2Name: string;
  player2Phone?: string;
  status?: string;
  result?: string;
  customData: Record<string, string>;
}

export interface SearchResult {
  player: PlayerInfo;
  matches: MatchInfo[];
}
