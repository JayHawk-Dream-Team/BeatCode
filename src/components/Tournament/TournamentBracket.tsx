// Written by Carlos with help from Claude
/**
 * Artifact:             TournamentBracket.tsx
 * Description:          Full bracket visualization component. Renders rounds as columns
 *                       with connecting lines between matchup pairs. Highlights the
 *                       current user's path. Responsive with horizontal scroll.
 *
 * Programmer:           Carlos Mbendera
 * Date Created:         2026-04-12
 * Revisions:            N/A
 *
 * Preconditions:        Tournament data with rounds and participants must be provided.
 * Acceptable Input:     Valid Tournament object with populated rounds array.
 * Unacceptable Input:   Tournament with empty rounds array.
 *
 * Postconditions:       Renders a bracket visualization with all rounds and matchups.
 * Return Values:        React JSX element.
 *
 * Error/Exception Conditions:     None at render time.
 * Side Effects:         None.
 * Invariants:           None.
 * Known Faults:         None.
 */

import React from "react";
import TournamentMatchup from "./TournamentMatchup";
import type { Tournament } from "@/utils/types/tournament";
import { getTotalRounds } from "@/utils/tournamentHelpers";

type Props = {
	tournament: Tournament & { id: string };
	currentUserId?: string;
};

const ROUND_LABELS = ["Round 1", "Quarterfinals", "Semifinals", "Final"];

function getRoundLabel(roundIndex: number, totalRounds: number): string {
	if (totalRounds <= 2) {
		return roundIndex === 0 ? "Semifinals" : "Final";
	}
	if (totalRounds === 3) {
		return ["Quarterfinals", "Semifinals", "Final"][roundIndex] || `Round ${roundIndex + 1}`;
	}
	return ROUND_LABELS[roundIndex] || `Round ${roundIndex + 1}`;
}

export default function TournamentBracket({ tournament, currentUserId }: Props) {
	const totalRounds = getTotalRounds(tournament.playerCount);

	// Build name lookup
	const nameMap: Record<string, string> = {};
	for (const p of tournament.participants || []) {
		nameMap[p.userId] = p.displayName;
	}

	return (
		<div className="w-full overflow-x-auto pb-4">
			{/* Champion banner */}
			{tournament.status === "finished" && tournament.championId && (
				<div
					className="text-center py-4 mb-6 rounded-xl"
					style={{
						background: "linear-gradient(135deg, var(--primary), var(--primary-container))",
						color: "var(--on-primary-container)",
					}}
				>
					<span className="text-sm font-bold uppercase tracking-widest block mb-1">Champion</span>
					<span className="text-2xl font-black">
						{nameMap[tournament.championId] || "Unknown"}
						{tournament.championId === currentUserId && " (You!)"}
					</span>
				</div>
			)}

			{/* Bracket grid */}
			<div className="flex gap-8 min-w-max px-2">
				{Array.from({ length: totalRounds }).map((_, roundIdx) => {
					const round = tournament.rounds[roundIdx];
					const label = getRoundLabel(roundIdx, totalRounds);

					return (
						<div key={roundIdx} className="flex flex-col items-center">
							{/* Round header */}
							<div className="mb-4 text-center">
								<span
									className="text-xs font-bold uppercase tracking-widest"
									style={{ color: "var(--primary)" }}
								>
									{label}
								</span>
								{round && (
									<p
										className="text-xs mt-1"
										style={{ color: "var(--on-surface-variant)" }}
									>
										{round.difficulty}
									</p>
								)}
							</div>

							{/* Matchups */}
							<div
								className="flex flex-col justify-around flex-1"
								style={{ gap: `${Math.pow(2, roundIdx) * 16}px` }}
							>
								{round ? (
									round.matchups.map(matchup => (
										<TournamentMatchup
											key={matchup.slotIndex}
											matchup={matchup}
											problemId={round.problemId}
											nameMap={nameMap}
											currentUserId={currentUserId}
										/>
									))
								) : (
									// Placeholder for future rounds
									Array.from({ length: Math.pow(2, totalRounds - 1 - roundIdx) }).map((_, i) => (
										<div
											key={i}
											className="rounded-lg border px-3 py-4 text-center text-xs"
											style={{
												background: "var(--surface-container)",
												borderColor: "rgba(70, 69, 84, 0.1)",
												minWidth: "160px",
												color: "var(--on-surface-variant)",
											}}
										>
											Waiting...
										</div>
									))
								)}
							</div>
						</div>
					);
				})}
			</div>
		</div>
	);
}
