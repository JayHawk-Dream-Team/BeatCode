// Written by Carlos with help from Claude
/**
 * Artifact:             tournaments/[tournamentId].tsx
 * Description:          Tournament detail page. Shows the lobby view when the tournament
 *                       is waiting for players, and the bracket visualization once active
 *                       or finished. Polls tournament state every 3 seconds when active.
 *
 * Programmer:           Carlos Mbendera
 * Date Created:         2026-04-12
 * Revisions:            N/A
 *
 * Preconditions:        Tournament must exist in Firestore.
 * Acceptable Input:     Valid tournamentId in the URL.
 * Unacceptable Input:   Non-existent tournamentId (shows error).
 *
 * Postconditions:       Renders lobby or bracket based on tournament status.
 * Return Values:        React JSX page.
 *
 * Error/Exception Conditions:     Shows loading/error states for fetch failures.
 * Side Effects:         Polls /api/tournaments/[id]/state every 3 seconds.
 * Invariants:           None.
 * Known Faults:         None.
 */

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/router";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "@/firebase/firebase";
import Topbar from "@/components/Topbar/Topbar";
import TournamentLobby from "@/components/Tournament/TournamentLobby";
import TournamentBracket from "@/components/Tournament/TournamentBracket";
import Link from "next/link";
import type { Tournament } from "@/utils/types/tournament";

export default function TournamentPage() {
	const router = useRouter();
	const { tournamentId } = router.query;
	const [user] = useAuthState(auth);
	const [tournament, setTournament] = useState<(Tournament & { id: string }) | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const fetchState = useCallback(async () => {
		if (!tournamentId || typeof tournamentId !== "string") return;
		try {
			const res = await fetch(`/api/tournaments/${tournamentId}/state`);
			if (!res.ok) {
				const data = await res.json();
				throw new Error(data.error || "Failed to fetch tournament");
			}
			const data = await res.json();
			setTournament(data as Tournament & { id: string });
			setError(null);
		} catch (err: any) {
			setError(err.message);
		} finally {
			setLoading(false);
		}
	}, [tournamentId]);

	// Initial fetch
	useEffect(() => {
		fetchState();
	}, [fetchState]);

	// Poll when lobby (waiting for start) or active (watching bracket progress)
	useEffect(() => {
		if (!tournament) return;
		if (tournament.status !== "lobby" && tournament.status !== "active") return;
		const interval = setInterval(fetchState, tournament.status === "lobby" ? 2000 : 3000);
		return () => clearInterval(interval);
	}, [tournament?.status, fetchState]);

	// Find current user's active matchup for the "Your match is live!" banner
	const activeMatchup = tournament?.status === "active" && user
		? tournament.rounds[tournament.currentRound]?.matchups.find(
			m => m.status === "active" && (m.player1Id === user.uid || m.player2Id === user.uid)
		)
		: null;

	return (
		<main style={{ background: "var(--surface)", minHeight: "100vh" }}>
			<Topbar />
			<div className="max-w-6xl mx-auto px-6 pt-24 pb-16">
				{loading && (
					<div className="text-center py-20" style={{ color: "var(--on-surface-variant)" }}>
						Loading tournament...
					</div>
				)}

				{error && (
					<div className="text-center py-20">
						<p style={{ color: "var(--error)" }}>{error}</p>
						<Link href="/tournaments">
							<span
								className="inline-block mt-4 px-6 py-2 rounded-lg font-bold text-sm cursor-pointer"
								style={{ background: "var(--surface-container-highest)", color: "var(--on-surface)" }}
							>
								Back to Tournaments
							</span>
						</Link>
					</div>
				)}

				{tournament && !error && (
					<>
						{/* Active match banner */}
						{activeMatchup && activeMatchup.matchId && (
							<Link href={`/problems/${tournament.rounds[tournament.currentRound].problemId}?matchId=${activeMatchup.matchId}`}>
								<div
									className="mb-6 py-3 px-6 rounded-xl text-center font-bold cursor-pointer animate-pulse"
									style={{
										background: "linear-gradient(135deg, var(--primary), var(--primary-container))",
										color: "var(--on-primary-container)",
									}}
								>
									Your match is live! Click here to compete.
								</div>
							</Link>
						)}

						{/* Cancelled banner */}
						{tournament.status === "cancelled" && (
							<div
								className="mb-6 py-3 px-6 rounded-xl text-center font-bold"
								style={{ background: "var(--error)", color: "var(--on-surface)" }}
							>
								This tournament was cancelled.
							</div>
						)}

						{/* Lobby view */}
						{tournament.status === "lobby" && (
							<TournamentLobby
								tournament={tournament}
								currentUserId={user?.uid}
							/>
						)}

						{/* Bracket view */}
						{(tournament.status === "active" || tournament.status === "finished") && (
							<>
								<div className="mb-6">
									<h1 className="text-2xl font-black" style={{ color: "var(--on-surface)" }}>
										{tournament.name}
									</h1>
									<p className="text-sm mt-1" style={{ color: "var(--on-surface-variant)" }}>
										{tournament.status === "active" ? "In Progress" : "Completed"}
										{" · "}
										{tournament.playerCount} players
										{" · "}
										{tournament.difficulty}
									</p>
								</div>
								<TournamentBracket
									tournament={tournament}
									currentUserId={user?.uid}
								/>
							</>
						)}
					</>
				)}
			</div>
		</main>
	);
}
