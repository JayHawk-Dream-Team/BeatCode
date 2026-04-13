// Written by Carlos with help from Claude
/**
 * Artifact:             state.ts (API route: /api/tournaments/[tournamentId]/state)
 * Description:          Core tournament engine. Returns tournament state and lazily
 *                       evaluates match outcomes, round advancement, timeout forfeits,
 *                       and champion determination. Uses Firestore transactions with
 *                       currentRound guard for idempotent advancement.
 *
 * Programmer:           Carlos Mbendera
 * Date Created:         2026-04-12
 * Revisions:            N/A
 *
 * Preconditions:        Tournament document must exist in Firestore.
 * Acceptable Input:     GET with valid tournamentId. No auth required (spectator-friendly).
 * Unacceptable Input:   Non-GET method, invalid tournamentId.
 *
 * Postconditions:       Returns full tournament state. May finalize matches, advance
 *                       rounds, or crown champion as side effects.
 * Return Values:        JSON with full tournament document data.
 *
 * Error/Exception Conditions:
 *                       400 for bad tournamentId. 404 for tournament not found.
 *                       405 for non-GET method. 500 for Firestore failures.
 * Side Effects:         May write to match documents (finalize winners) and tournament
 *                       document (advance rounds, set champion).
 * Invariants:           currentRound guard prevents duplicate advancement.
 *                       Write side effects are idempotent.
 * Known Faults:         None.
 */

import type { NextApiRequest, NextApiResponse } from "next";
import { doc, getDoc, runTransaction, serverTimestamp } from "firebase/firestore";
import { firestore } from "@/firebase/firebase";
import { toNumberMap, getStartedAtMs, getElapsedMs, computeWinner } from "@/utils/matchHelpers";
import {
	selectProblemForRound,
	getDifficultyForRound,
	getTotalRounds,
	createTournamentMatch,
} from "@/utils/tournamentHelpers";
import type { Tournament, TournamentMatchup, TournamentRound } from "@/utils/types/tournament";

const DEFAULT_TIME_LIMIT_MS = 30 * 60 * 1000; // 30 minutes
const WRITE_COOLDOWN_MS = 3000; // Soft rate-limit: skip advancement if recently updated

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
	if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

	const { tournamentId } = req.query;
	if (!tournamentId || typeof tournamentId !== "string") {
		return res.status(400).json({ error: "Missing tournamentId" });
	}

	try {
		const tournamentRef = doc(firestore, "tournaments", tournamentId);
		const snap = await getDoc(tournamentRef);
		if (!snap.exists()) return res.status(404).json({ error: "Tournament not found" });

		const data = snap.data() as Tournament;

		// For non-active tournaments, return as-is
		if (data.status !== "active") {
			return res.status(200).json({ id: snap.id, ...data });
		}

		// Write amplification guard: skip if updated recently
		const lastUpdatedMs = data.updatedAt?.toMillis?.() || 0;
		const sinceLastUpdate = Date.now() - lastUpdatedMs;
		if (sinceLastUpdate < WRITE_COOLDOWN_MS) {
			return res.status(200).json({ id: snap.id, ...data });
		}

		// Run advancement logic inside a transaction
		let updatedData: any = null;

		await runTransaction(firestore, async (transaction) => {
			const txSnap = await transaction.get(tournamentRef);
			if (!txSnap.exists()) throw new Error("NOT_FOUND");

			const txData = txSnap.data() as Tournament;
			if (txData.status !== "active") {
				updatedData = { id: txSnap.id, ...txData };
				return;
			}

			const currentRound = txData.currentRound;
			const round = txData.rounds[currentRound];
			if (!round) {
				updatedData = { id: txSnap.id, ...txData };
				return;
			}

			const timeLimitMs = txData.timeLimitMs || DEFAULT_TIME_LIMIT_MS;
			const nowMs = Date.now();
			let roundModified = false;
			const updatedMatchups = [...round.matchups];

			// Check each active matchup in the current round
			for (let i = 0; i < updatedMatchups.length; i++) {
				const matchup = updatedMatchups[i];
				if (matchup.status !== "active" || !matchup.matchId) continue;

				const matchRef = doc(firestore, "matches", matchup.matchId);
				const matchSnap = await transaction.get(matchRef);
				if (!matchSnap.exists()) continue;

				const matchData = matchSnap.data() as Record<string, any>;
				const matchStatus = String(matchData.status || "active");

				if (matchStatus === "finished" && matchData.winner) {
					// Match already finished — sync to tournament
					updatedMatchups[i] = { ...matchup, winnerId: matchData.winner, status: "finished" };
					roundModified = true;
					continue;
				}

				// Try to compute winner
				const players = Array.isArray(matchData.players)
					? matchData.players.map((p: any) => p?.userId).filter(Boolean)
					: [];
				const startedAtMs = getStartedAtMs(matchData);
				const penaltiesMs = toNumberMap(matchData.penaltiesMs);
				const solvedElapsedMs = toNumberMap(matchData.solvedElapsedMs);

				const decision = computeWinner(players, nowMs, startedAtMs, penaltiesMs, solvedElapsedMs);

				if (decision) {
					// Finalize match
					transaction.set(matchRef, {
						status: "finished",
						winner: decision.winner,
						winnerReason: decision.reason,
						winnerDecidedAtMs: nowMs,
						updatedAt: serverTimestamp(),
					}, { merge: true });

					updatedMatchups[i] = { ...matchup, winnerId: decision.winner, status: "finished" };
					roundModified = true;
					continue;
				}

				// Check timeout
				const elapsed = nowMs - startedAtMs;
				if (elapsed > timeLimitMs) {
					const p1Id = matchup.player1Id!;
					const p2Id = matchup.player2Id!;
					const p1Solved = typeof solvedElapsedMs[p1Id] === "number";
					const p2Solved = typeof solvedElapsedMs[p2Id] === "number";

					let timeoutWinner: string;
					if (p1Solved && !p2Solved) {
						timeoutWinner = p1Id;
					} else if (p2Solved && !p1Solved) {
						timeoutWinner = p2Id;
					} else {
						// Neither solved or both solved (both solved should have been caught by computeWinner)
						// Deterministic tie-break: fewer penalties wins; if equal, lower seed advances
						const p1Penalty = penaltiesMs[p1Id] || 0;
						const p2Penalty = penaltiesMs[p2Id] || 0;
						if (p1Penalty !== p2Penalty) {
							timeoutWinner = p1Penalty < p2Penalty ? p1Id : p2Id;
						} else {
							// Lower seed number advances
							const p1Seed = txData.participants.find(p => p.userId === p1Id)?.seed ?? 999;
							const p2Seed = txData.participants.find(p => p.userId === p2Id)?.seed ?? 999;
							timeoutWinner = p1Seed <= p2Seed ? p1Id : p2Id;
						}
					}

					transaction.set(matchRef, {
						status: "finished",
						winner: timeoutWinner,
						winnerReason: "opponent_clock_exceeded",
						winnerDecidedAtMs: nowMs,
						updatedAt: serverTimestamp(),
					}, { merge: true });

					updatedMatchups[i] = { ...matchup, winnerId: timeoutWinner, status: "finished" };
					roundModified = true;
				}
			}

			// Check if all matchups in current round are done
			const allDone = updatedMatchups.every(m => m.status === "finished" || m.status === "bye");

			if (!allDone) {
				// Just sync any match status updates
				if (roundModified) {
					const updatedRounds = [...txData.rounds];
					updatedRounds[currentRound] = { ...round, matchups: updatedMatchups };
					transaction.update(tournamentRef, {
						rounds: updatedRounds,
						updatedAt: serverTimestamp(),
					});
				}
				updatedData = {
					id: txSnap.id,
					...txData,
					rounds: roundModified
						? txData.rounds.map((r, idx) => idx === currentRound ? { ...round, matchups: updatedMatchups } : r)
						: txData.rounds,
				};
				return;
			}

			// All done — check if this is the final round
			const totalRounds = getTotalRounds(txData.playerCount);

			if (currentRound >= totalRounds - 1) {
				// Tournament is finished — crown champion
				const finalMatchup = updatedMatchups.find(m => m.winnerId);
				const championId = finalMatchup?.winnerId || null;

				const updatedRounds = [...txData.rounds];
				updatedRounds[currentRound] = { ...round, matchups: updatedMatchups };

				transaction.update(tournamentRef, {
					rounds: updatedRounds,
					status: "finished",
					championId,
					finishedAtMs: nowMs,
					updatedAt: serverTimestamp(),
				});

				updatedData = {
					id: txSnap.id,
					...txData,
					rounds: updatedRounds,
					status: "finished",
					championId,
					finishedAtMs: nowMs,
				};
				return;
			}

			// Advance to next round
			const nextRoundIndex = currentRound + 1;
			const nextDifficulty = getDifficultyForRound(txData.difficulty, nextRoundIndex, totalRounds);
			const usedProblemIds = txData.rounds.map(r => r.problemId);
			const nextProblemId = await selectProblemForRound(nextDifficulty, usedProblemIds);

			// Collect winners for next round pairing
			const winners = updatedMatchups
				.filter(m => m.winnerId)
				.map(m => m.winnerId!);

			// Build display name lookup
			const nameMap: Record<string, string> = {};
			for (const p of txData.participants) {
				nameMap[p.userId] = p.displayName;
			}

			// Pair winners into next round matchups
			const nextMatchups: TournamentMatchup[] = [];
			for (let i = 0; i < winners.length; i += 2) {
				const p1 = winners[i];
				const p2 = winners[i + 1] || null;

				if (!p2) {
					// Bye
					nextMatchups.push({
						slotIndex: i / 2,
						matchId: null,
						player1Id: p1,
						player2Id: null,
						winnerId: p1,
						status: "bye",
					});
				} else {
					const matchId = createTournamentMatch(
						transaction,
						p1, nameMap[p1] || "Player",
						p2, nameMap[p2] || "Player",
						nextProblemId,
						tournamentId
					);

					nextMatchups.push({
						slotIndex: i / 2,
						matchId,
						player1Id: p1,
						player2Id: p2,
						winnerId: null,
						status: "active",
					});
				}
			}

			const nextRound: TournamentRound = {
				roundIndex: nextRoundIndex,
				difficulty: nextDifficulty,
				problemId: nextProblemId,
				matchups: nextMatchups,
			};

			const updatedRounds = [...txData.rounds];
			updatedRounds[currentRound] = { ...round, matchups: updatedMatchups };
			updatedRounds.push(nextRound);

			transaction.update(tournamentRef, {
				rounds: updatedRounds,
				currentRound: nextRoundIndex,
				updatedAt: serverTimestamp(),
			});

			updatedData = {
				id: txSnap.id,
				...txData,
				rounds: updatedRounds,
				currentRound: nextRoundIndex,
			};
		});

		if (updatedData) {
			return res.status(200).json(updatedData);
		}

		// Fallback: re-read
		const freshSnap = await getDoc(tournamentRef);
		return res.status(200).json({ id: freshSnap.id, ...freshSnap.data() });
	} catch (err: any) {
		const msg = err?.message || String(err);
		if (msg === "NOT_FOUND") return res.status(404).json({ error: "Tournament not found" });
		return res.status(500).json({ error: msg });
	}
}
