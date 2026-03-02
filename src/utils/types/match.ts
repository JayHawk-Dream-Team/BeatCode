export type MatchPlayer = {
  userId: string;
  displayName?: string;
  joinedAt?: any;
};

export type MatchStatus = "waiting" | "starting" | "active" | "finished" | "cancelled";

export type Match = {
  id?: string;
  players: MatchPlayer[];
  problemId?: string;
  status: MatchStatus;
  winner?: string | null;
  createdAt?: any;
  updatedAt?: any;
};
