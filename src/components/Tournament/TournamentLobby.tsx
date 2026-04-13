// Written by Carlos with help from Claude
/**
 * Artifact:             TournamentLobby.tsx
 * Description:          Lobby waiting room component for tournaments. Shows a live
 *                       participant list via Firestore onSnapshot, filled/total slots,
 *                       and action buttons (leave, cancel).
 *
 * Programmer:           Carlos Mbendera
 * Date Created:         2026-04-12
 * Revisions:            N/A
 *
 * Preconditions:        Tournament data and auth token must be available.
 * Acceptable Input:     Valid Tournament object with id, tournament in "lobby" status.
 * Unacceptable Input:   Tournament not in lobby status.
 *
 * Postconditions:       Renders a live participant list with action buttons.
 * Return Values:        React JSX element.
 *
 * Error/Exception Conditions:     Firestore listener errors are handled silently.
 * Side Effects:         Sets up Firestore onSnapshot listener on mount.
 * Invariants:           None.
 * Known Faults:         None.
 */

import React, { useState, useEffect } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { firestore } from "@/firebase/firebase";
import { auth } from "@/firebase/firebase";
import { toast } from "react-toastify";
import type { Tournament, TournamentParticipant } from "@/utils/types/tournament";

type Props = {
	tournament: Tournament & { id: string };
	currentUserId?: string;
};

export default function TournamentLobby({ tournament: initialTournament, currentUserId }: Props) {
	const [participants, setParticipants] = useState<TournamentParticipant[]>(initialTournament.participants || []);
	const [status, setStatus] = useState(initialTournament.status);
	const [leaving, setLeaving] = useState(false);
	const [cancelling, setCancelling] = useState(false);

	const isCreator = initialTournament.creatorId === currentUserId;
	const isInLobby = participants.some(p => p.userId === currentUserId);
	const filledSlots = participants.length;
	const totalSlots = initialTournament.playerCount;

	// Live updates via onSnapshot
	useEffect(() => {
		const unsubscribe = onSnapshot(
			doc(firestore, "tournaments", initialTournament.id),
			(snap) => {
				if (!snap.exists()) return;
				const data = snap.data() as Tournament;
				setParticipants(data.participants || []);
				setStatus(data.status);

				if (data.status === "active") {
					toast.success("Tournament started! Check the bracket.", {
						position: "top-center",
						theme: "dark",
					});
				}
				if (data.status === "cancelled") {
					toast.info("Tournament was cancelled.", {
						position: "top-center",
						theme: "dark",
					});
				}
			}
		);
		return () => unsubscribe();
	}, [initialTournament.id]);

	const getAuthHeaders = async (): Promise<Record<string, string>> => {
		const token = await auth.currentUser?.getIdToken();
		const headers: Record<string, string> = { "Content-Type": "application/json" };
		if (token) headers["Authorization"] = `Bearer ${token}`;
		return headers;
	};

	const handleLeave = async () => {
		setLeaving(true);
		try {
			const headers = await getAuthHeaders();
			const res = await fetch(`/api/tournaments/${initialTournament.id}/leave`, {
				method: "POST",
				headers,
				body: JSON.stringify({ userId: currentUserId }),
			});
			if (!res.ok) {
				const data = await res.json();
				throw new Error(data.error || "Failed to leave");
			}
			toast.info("Left the tournament.", { position: "top-center", theme: "dark" });
		} catch (err: any) {
			toast.error(err.message, { position: "top-center", theme: "dark" });
		} finally {
			setLeaving(false);
		}
	};

	const handleCancel = async () => {
		setCancelling(true);
		try {
			const headers = await getAuthHeaders();
			const res = await fetch(`/api/tournaments/${initialTournament.id}/cancel`, {
				method: "POST",
				headers,
				body: JSON.stringify({ userId: currentUserId }),
			});
			if (!res.ok) {
				const data = await res.json();
				throw new Error(data.error || "Failed to cancel");
			}
		} catch (err: any) {
			toast.error(err.message, { position: "top-center", theme: "dark" });
		} finally {
			setCancelling(false);
		}
	};

	if (status !== "lobby") {
		return null;
	}

	return (
		<div className="max-w-lg mx-auto">
			{/* Header */}
			<div className="text-center mb-8">
				<h2 className="text-3xl font-black" style={{ color: "var(--on-surface)" }}>
					{initialTournament.name}
				</h2>
				<p className="text-sm mt-2" style={{ color: "var(--on-surface-variant)" }}>
					Waiting for players... {filledSlots}/{totalSlots}
				</p>
			</div>

			{/* Slot progress */}
			<div
				className="h-2 w-full rounded-full mb-8"
				style={{ background: "var(--surface-container-highest)" }}
			>
				<div
					className="h-full rounded-full transition-all duration-500"
					style={{
						width: `${(filledSlots / totalSlots) * 100}%`,
						background: "linear-gradient(135deg, var(--primary), var(--primary-container))",
					}}
				/>
			</div>

			{/* Tournament info */}
			<div
				className="flex gap-4 mb-6 text-sm justify-center"
				style={{ color: "var(--on-surface-variant)" }}
			>
				<span className="px-3 py-1 rounded" style={{ background: "var(--surface-container-highest)" }}>
					{initialTournament.difficulty}
				</span>
				<span className="px-3 py-1 rounded" style={{ background: "var(--surface-container-highest)" }}>
					{initialTournament.playerCount} players
				</span>
				<span className="px-3 py-1 rounded" style={{ background: "var(--surface-container-highest)" }}>
					{initialTournament.timeLimitMs
						? `${Math.round(initialTournament.timeLimitMs / 60000)}m/round`
						: "No time limit"}
				</span>
			</div>

			{/* Participant list */}
			<div
				className="rounded-xl border overflow-hidden mb-6"
				style={{
					background: "var(--surface-container)",
					borderColor: "rgba(70, 69, 84, 0.15)",
				}}
			>
				{Array.from({ length: totalSlots }).map((_, i) => {
					const participant = participants[i];
					return (
						<div
							key={i}
							className="px-4 py-3 flex items-center gap-3 border-b last:border-b-0"
							style={{ borderColor: "rgba(70, 69, 84, 0.08)" }}
						>
							<span
								className="text-xs font-mono w-6 text-center"
								style={{ color: "var(--on-surface-variant)" }}
							>
								{i + 1}
							</span>
							{participant ? (
								<span
									className="font-medium"
									style={{
										color: participant.userId === currentUserId
											? "var(--primary)"
											: "var(--on-surface)",
									}}
								>
									{participant.displayName}
									{participant.userId === currentUserId && " (You)"}
									{participant.userId === initialTournament.creatorId && " ★"}
								</span>
							) : (
								<span
									className="italic"
									style={{ color: "var(--on-surface-variant)", opacity: 0.5 }}
								>
									Waiting...
								</span>
							)}
						</div>
					);
				})}
			</div>

			{/* Action buttons */}
			<div className="flex gap-3 justify-center">
				{isInLobby && !isCreator && (
					<button
						onClick={handleLeave}
						disabled={leaving}
						className="px-6 py-2 rounded-lg font-bold text-sm transition-all active:scale-95 disabled:opacity-50"
						style={{
							background: "var(--surface-container-highest)",
							color: "var(--on-surface)",
						}}
					>
						{leaving ? "Leaving..." : "Leave"}
					</button>
				)}
				{isCreator && (
					<button
						onClick={handleCancel}
						disabled={cancelling}
						className="px-6 py-2 rounded-lg font-bold text-sm transition-all active:scale-95 disabled:opacity-50"
						style={{
							background: "var(--error)",
							color: "var(--on-surface)",
						}}
					>
						{cancelling ? "Cancelling..." : "Cancel Tournament"}
					</button>
				)}
			</div>
		</div>
	);
}
