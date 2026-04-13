// Written by Carlos with help from Claude
/**
 * Artifact:             TournamentMatchup.tsx
 * Description:          Single bracket matchup node. Displays two player names with
 *                       winner highlighting, loser dimming, and in-progress pulsing.
 *                       Clickable to navigate to the match workspace.
 *
 * Programmer:           Carlos Mbendera
 * Date Created:         2026-04-12
 * Revisions:            N/A
 *
 * Preconditions:        TournamentMatchup data and participant lookup must be provided.
 * Acceptable Input:     Valid TournamentMatchup object.
 * Unacceptable Input:   None — handles null player IDs gracefully (bye slots).
 *
 * Postconditions:       Renders a styled matchup node.
 * Return Values:        React JSX element.
 *
 * Error/Exception Conditions:     None at render time.
 * Side Effects:         None.
 * Invariants:           None.
 * Known Faults:         None.
 */

import React from "react";
import Link from "next/link";
import type { TournamentMatchup as TournamentMatchupType } from "@/utils/types/tournament";

type Props = {
	matchup: TournamentMatchupType;
	problemId: string;
	nameMap: Record<string, string>;
	currentUserId?: string;
};

export default function TournamentMatchup({ matchup, problemId, nameMap, currentUserId }: Props) {
	const isActive = matchup.status === "active";
	const isFinished = matchup.status === "finished";
	const isBye = matchup.status === "bye";

	const p1Name = matchup.player1Id ? (nameMap[matchup.player1Id] || "Player") : "TBD";
	const p2Name = matchup.player2Id ? (nameMap[matchup.player2Id] || "Player") : (isBye ? "BYE" : "TBD");

	const p1IsWinner = isFinished && matchup.winnerId === matchup.player1Id;
	const p2IsWinner = isFinished && matchup.winnerId === matchup.player2Id;
	const isCurrentUserMatch = matchup.player1Id === currentUserId || matchup.player2Id === currentUserId;

	const content = (
		<div
			className={`rounded-lg border overflow-hidden text-sm ${isActive ? "animate-pulse" : ""}`}
			style={{
				background: "var(--surface-container)",
				borderColor: isCurrentUserMatch && isActive
					? "var(--primary)"
					: "rgba(70, 69, 84, 0.15)",
				borderWidth: isCurrentUserMatch && isActive ? "2px" : "1px",
				minWidth: "160px",
			}}
		>
			{/* Player 1 */}
			<div
				className="px-3 py-2 flex items-center justify-between border-b"
				style={{
					borderColor: "rgba(70, 69, 84, 0.1)",
					background: p1IsWinner ? "rgba(76, 175, 80, 0.15)" : undefined,
					opacity: isFinished && !p1IsWinner && !isBye ? 0.5 : 1,
				}}
			>
				<span
					className="font-medium truncate"
					style={{
						color: p1IsWinner ? "#4caf50" : "var(--on-surface)",
						maxWidth: "120px",
					}}
				>
					{matchup.player1Id === currentUserId ? `${p1Name} (You)` : p1Name}
				</span>
				{p1IsWinner && <span style={{ color: "#4caf50" }}>&#10003;</span>}
			</div>

			{/* Player 2 */}
			<div
				className="px-3 py-2 flex items-center justify-between"
				style={{
					background: p2IsWinner ? "rgba(76, 175, 80, 0.15)" : undefined,
					opacity: isFinished && !p2IsWinner && !isBye ? 0.5 : 1,
				}}
			>
				<span
					className={`font-medium truncate ${isBye ? "italic" : ""}`}
					style={{
						color: p2IsWinner ? "#4caf50" : isBye ? "var(--on-surface-variant)" : "var(--on-surface)",
						maxWidth: "120px",
					}}
				>
					{matchup.player2Id === currentUserId ? `${p2Name} (You)` : p2Name}
				</span>
				{p2IsWinner && <span style={{ color: "#4caf50" }}>&#10003;</span>}
			</div>
		</div>
	);

	if (isActive && matchup.matchId) {
		return (
			<Link href={`/problems/${problemId}?matchId=${matchup.matchId}`}>
				<div className="cursor-pointer hover:scale-105 transition-transform">
					{content}
				</div>
			</Link>
		);
	}

	return content;
}
