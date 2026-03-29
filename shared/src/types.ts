export interface Player {
  id: number;
  name: string;
  nickname: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface Tournament {
  id: number;
  name: string;
  date: string;
  buyInAmount: number;
  buyInType: string;
  buyInPresets: string;
  topUpAmount: number;
  topUpChips: number;
  startingChips: number;
  status: string;
  currentLevel: number;
  timerSeconds: number;
  totalPrizePool: number;
  blindStructureId: number | null;
  createdAt: string;
  finishedAt: string | null;
  tables?: TournamentTable[];
  entries?: TournamentEntry[];
  transactions?: Transaction[];
  blindStructure?: BlindStructure;
}

export interface TournamentEntry {
  id: number;
  tournamentId: number;
  playerId: number;
  tableId: number | null;
  seatNumber: number | null;
  status: string;
  finishPosition: number | null;
  payout: number;
  createdAt: string;
  eliminatedAt: string | null;
  player?: Player;
  table?: TournamentTable;
}

export interface TournamentTable {
  id: number;
  tournamentId: number;
  tableNumber: number;
  tableName: string;
  maxSeats: number;
  isActive: boolean;
  entries?: TournamentEntry[];
}

export interface Transaction {
  id: number;
  tournamentId: number;
  playerId: number;
  type: string;
  amount: number;
  note: string | null;
  createdAt: string;
  player?: Player;
}

export interface BlindStructure {
  id: number;
  name: string;
  isDefault: boolean;
  levels?: BlindLevel[];
}

export interface BlindLevel {
  id: number;
  blindStructureId: number;
  level: number;
  smallBlind: number;
  bigBlind: number;
  ante: number;
  durationMinutes: number;
  isBreak: boolean;
}

export interface BalanceSuggestion {
  playerName: string;
  playerId: number;
  fromTableNumber: number;
  fromTableId: number;
  toTableNumber: number;
  toTableId: number;
  suggestedSeat: number;
}

export interface PlayerStats {
  playerId: number;
  playerName: string;
  gamesPlayed: number;
  wins: number;
  totalInvested: number;
  totalWon: number;
  roi: number;
}

export interface CreateTournamentDTO {
  name: string;
  buyInAmount: number;
  buyInType?: string;
  buyInPresets?: string;
  topUpAmount: number;
  topUpChips?: number;
  startingChips?: number;
  blindStructureId?: number;
}

export interface CreatePlayerDTO {
  name: string;
  nickname?: string;
}
