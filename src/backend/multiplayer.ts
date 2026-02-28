import { Server, Socket } from "socket.io";
import { Server as HttpServer } from "http";

interface Player {
  socketId: string;
  username: string;
}

interface Room {
  id: string;
  players: Player[];
  problemId: string;
  startTime: number;
  finished: boolean;
}

const matchmakingQueue: Player[] = [];
const rooms: Map<string, Room> = new Map();

export function initializeMultiplayer(httpServer: HttpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: "*", // change for production
    },
  });

  io.on("connection", (socket: Socket) => {
    console.log(`User connected: ${socket.id}`);

    // User clicks "Multiplayer"
    socket.on("startMatchmaking", (username: string) => {
      console.log(`${username} entered matchmaking`);

      const player: Player = {
        socketId: socket.id,
        username,
      };

      matchmakingQueue.push(player);
      tryMatch(io);
    });

    // Optional: User cancels matchmaking
    socket.on("cancelMatchmaking", () => {
      removeFromQueue(socket.id);
      console.log(`User ${socket.id} left matchmaking`);
    });

    // Submission event (ONLY end game if correct)
    socket.on("submitCorrectSolution", ({ roomId }) => {
      const room = rooms.get(roomId);
      if (!room || room.finished) return;

      room.finished = true;

      io.to(roomId).emit("gameOver", {
        winner: socket.id,
        finishedAt: Date.now(),
      });

      rooms.delete(roomId);
    });

    // Handle disconnect
    socket.on("disconnect", () => {
      removeFromQueue(socket.id);
      handleDisconnect(io, socket.id);
    });
  });
}

function tryMatch(io: Server) {
  if (matchmakingQueue.length < 2) return;

  const player1 = matchmakingQueue.shift()!;
  const player2 = matchmakingQueue.shift()!;

  const roomId = `room-${Date.now()}`;
  const problemId = getRandomProblem();

  const room: Room = {
    id: roomId,
    players: [player1, player2],
    problemId,
    startTime: Date.now(),
    finished: false,
  };

  rooms.set(roomId, room);

  const sockets = io.sockets.sockets;

  sockets.get(player1.socketId)?.join(roomId);
  sockets.get(player2.socketId)?.join(roomId);

  io.to(roomId).emit("matchFound", {
    roomId,
    problemId,
  });
}

function removeFromQueue(socketId: string) {
  const index = matchmakingQueue.findIndex(p => p.socketId === socketId);
  if (index !== -1) {
    matchmakingQueue.splice(index, 1);
  }
}

function handleDisconnect(io: Server, socketId: string) {
  for (const [roomId, room] of rooms.entries()) {
    if (room.players.some(p => p.socketId === socketId)) {
      io.to(roomId).emit("opponentDisconnected");
      rooms.delete(roomId);
      break;
    }
  }
}

function getRandomProblem(): string {
  const problems = [
    "two-sum",
    "reverse-linked-list",
    "valid-parentheses",
  ];

  return problems[Math.floor(Math.random() * problems.length)];
}