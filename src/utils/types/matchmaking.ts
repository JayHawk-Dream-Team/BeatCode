export type QueueEntry = {
  id?: string;
  userId: string;
  displayName?: string;
  problemId?: string;
  createdAt?: any;
};

export type JoinResponse =
  | { queued: true; queueId: string }
  | { queued: false; matchId: string; opponent: { userId: string; displayName?: string } };
