// Written by Carlos with help from Claude
/**
 * Artifact:             TournamentCard.tsx
 * Description:          Compact card component for the tournament browser. Displays
 *                       tournament name, difficulty badge, player slots, creator, and
 *                       status with a join/view action button.
 *
 * Programmer:           Carlos Mbendera
 * Date Created:         2026-04-12
 * Revisions:            N/A
 *
 * Preconditions:        Tournament data must be provided via props.
 * Acceptable Input:     Valid Tournament object with id.
 * Unacceptable Input:   Tournament without id field.
 *
 * Postconditions:       Renders a styled card with tournament info and action button.
 * Return Values:        React JSX element.
 *
 * Error/Exception Conditions:     None at render time.
 * Side Effects:         Calls onJoin or navigates on button click.
 * Invariants:           None.
 * Known Faults:         None.
 */

import React from "react";
import Link from "next/link";
import type { Tournament } from "@/utils/types/tournament";

const DIFFICULTY_COLORS: Record<string, string> = {
	easy: "var(--tertiary)",
	medium: "var(--secondary)",
	hard: "var(--error)",
	escalating: "var(--primary)",
};

type TournamentCardProps = {
	tournament: Tournament & { id: string };
	currentUserId?: string;
	onJoin?: (tournamentId: string) => void;
	joining?: boolean;
};

export default function TournamentCard({ tournament, currentUserId, onJoin, joining }: TournamentCardProps) {
	const filledSlots = tournament.participants?.length || 0;
	const totalSlots = tournament.playerCount;
	const isInTournament = tournament.participants?.some(p => p.userId === currentUserId);
	const isFull = filledSlots >= totalSlots;
	const difficultyColor = DIFFICULTY_COLORS[tournament.difficulty] || "var(--on-surface-variant)";

	const formatTimeLimit = (ms: number | null) => {
		if (!ms) return "No limit";
		const minutes = Math.round(ms / 60000);
		return `${minutes}m/round`;
	};

	return (
		<div
			className="p-6 rounded-xl border transition-all hover:scale-[1.01]"
			style={{
				background: "var(--surface-container)",
				borderColor: "rgba(70, 69, 84, 0.15)",
			}}
		>
			<div className="flex items-start justify-between mb-4">
				<div>
					<h3 className="text-lg font-bold" style={{ color: "var(--on-surface)" }}>
						{tournament.name}
					</h3>
					<p className="text-xs mt-1" style={{ color: "var(--on-surface-variant)" }}>
						by {tournament.creatorDisplayName}
					</p>
				</div>
				<span
					className="text-xs font-bold uppercase px-2 py-1 rounded"
					style={{
						color: difficultyColor,
						background: "var(--surface-container-highest)",
					}}
				>
					{tournament.difficulty}
				</span>
			</div>

			<div className="flex items-center gap-4 mb-4 text-sm" style={{ color: "var(--on-surface-variant)" }}>
				<span>{filledSlots}/{totalSlots} players</span>
				<span>{formatTimeLimit(tournament.timeLimitMs)}</span>
			</div>

			{/* Slot fill bar */}
			<div
				className="h-1 w-full rounded-full mb-4"
				style={{ background: "var(--surface-container-highest)" }}
			>
				<div
					className="h-full rounded-full transition-all"
					style={{
						width: `${(filledSlots / totalSlots) * 100}%`,
						background: difficultyColor,
					}}
				/>
			</div>

			{tournament.status === "lobby" && !isInTournament && !isFull && onJoin ? (
				<button
					onClick={() => onJoin(tournament.id)}
					disabled={joining}
					className="w-full py-2 rounded-lg font-bold text-sm transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
					style={{
						background: "linear-gradient(135deg, var(--primary), var(--primary-container))",
						color: "var(--on-primary-container)",
					}}
				>
					{joining ? "Joining..." : "Join Tournament"}
				</button>
			) : (
				<Link href={`/tournaments/${tournament.id}`}>
					<div
						className="w-full py-2 rounded-lg font-bold text-sm text-center transition-all active:scale-95 cursor-pointer"
						style={{
							background: "var(--surface-container-highest)",
							color: "var(--on-surface)",
						}}
					>
						{tournament.status === "lobby" && isInTournament
							? "View Lobby"
							: tournament.status === "active"
							? "Watch Live"
							: tournament.status === "finished"
							? "View Results"
							: "View"}
					</div>
				</Link>
			)}
		</div>
	);
}
