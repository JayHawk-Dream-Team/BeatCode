// Written by Carlos with help from Claude
/**
 * Artifact:             tournaments/create.tsx
 * Description:          Tournament creation page. Provides a form for authenticated users
 *                       to create a tournament by selecting difficulty, player count, time
 *                       limit, and optional name. Auth-gated.
 *
 * Programmer:           Carlos Mbendera
 * Date Created:         2026-04-12
 * Revisions:            N/A
 *
 * Preconditions:        User must be authenticated.
 * Acceptable Input:     N/A — form-based page.
 * Unacceptable Input:   N/A
 *
 * Postconditions:       On submit, creates a tournament and redirects to its lobby.
 * Return Values:        React JSX page.
 *
 * Error/Exception Conditions:     API errors shown via toast.
 * Side Effects:         POSTs to /api/tournaments/create.
 * Invariants:           None.
 * Known Faults:         None.
 */

import React, { useState } from "react";
import { useRouter } from "next/router";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "@/firebase/firebase";
import Topbar from "@/components/Topbar/Topbar";
import { toast } from "react-toastify";
import type { TournamentDifficulty } from "@/utils/types/tournament";

const PLAYER_COUNTS = [4, 8, 16] as const;
const DIFFICULTIES: { value: TournamentDifficulty; label: string }[] = [
	{ value: "easy", label: "Easy" },
	{ value: "medium", label: "Medium" },
	{ value: "hard", label: "Hard" },
	{ value: "escalating", label: "Escalating" },
];
const TIME_LIMITS = [
	{ value: null, label: "No limit (30min default)" },
	{ value: 5 * 60 * 1000, label: "5 minutes" },
	{ value: 10 * 60 * 1000, label: "10 minutes" },
	{ value: 15 * 60 * 1000, label: "15 minutes" },
	{ value: 30 * 60 * 1000, label: "30 minutes" },
];

export default function CreateTournament() {
	const router = useRouter();
	const [user, loading] = useAuthState(auth);
	const [name, setName] = useState("");
	const [playerCount, setPlayerCount] = useState<4 | 8 | 16>(8);
	const [difficulty, setDifficulty] = useState<TournamentDifficulty>("escalating");
	const [timeLimitMs, setTimeLimitMs] = useState<number | null>(null);
	const [creating, setCreating] = useState(false);

	if (!loading && !user) {
		router.push("/auth");
		return null;
	}

	const handleCreate = async () => {
		if (!user) return;
		setCreating(true);
		try {
			const token = await user.getIdToken();
			const res = await fetch("/api/tournaments/create", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${token}`,
				},
				body: JSON.stringify({
					name: name.trim() || undefined,
					playerCount,
					difficulty,
					timeLimitMs,
				}),
			});
			const data = await res.json();
			if (!res.ok) throw new Error(data.error || "Failed to create tournament");
			router.push(`/tournaments/${data.tournamentId}`);
		} catch (err: any) {
			toast.error(err.message, { position: "top-center", theme: "dark" });
		} finally {
			setCreating(false);
		}
	};

	return (
		<main style={{ background: "var(--surface)", minHeight: "100vh" }}>
			<Topbar />
			<div className="max-w-lg mx-auto px-6 pt-24 pb-16">
				<h1 className="text-3xl font-black mb-2" style={{ color: "var(--on-surface)" }}>
					Create Tournament
				</h1>
				<p className="text-sm mb-8" style={{ color: "var(--on-surface-variant)" }}>
					Set up a bracket-style elimination tournament.
				</p>

				{/* Name */}
				<div className="mb-6">
					<label className="block text-xs font-bold uppercase tracking-widest mb-2" style={{ color: "var(--primary)" }}>
						Tournament Name (optional)
					</label>
					<input
						type="text"
						value={name}
						onChange={e => setName(e.target.value)}
						placeholder="My Tournament"
						maxLength={50}
						className="w-full px-4 py-3 rounded-lg border text-sm"
						style={{
							background: "var(--surface-container)",
							borderColor: "rgba(70, 69, 84, 0.2)",
							color: "var(--on-surface)",
						}}
					/>
				</div>

				{/* Player Count */}
				<div className="mb-6">
					<label className="block text-xs font-bold uppercase tracking-widest mb-2" style={{ color: "var(--primary)" }}>
						Players
					</label>
					<div className="flex gap-3">
						{PLAYER_COUNTS.map(count => (
							<button
								key={count}
								onClick={() => setPlayerCount(count)}
								className="flex-1 py-3 rounded-lg font-bold text-sm transition-all active:scale-95"
								style={{
									background: playerCount === count
										? "linear-gradient(135deg, var(--primary), var(--primary-container))"
										: "var(--surface-container)",
									color: playerCount === count
										? "var(--on-primary-container)"
										: "var(--on-surface-variant)",
									border: playerCount === count ? "none" : "1px solid rgba(70, 69, 84, 0.2)",
								}}
							>
								{count}
							</button>
						))}
					</div>
				</div>

				{/* Difficulty */}
				<div className="mb-6">
					<label className="block text-xs font-bold uppercase tracking-widest mb-2" style={{ color: "var(--primary)" }}>
						Difficulty
					</label>
					<div className="grid grid-cols-2 gap-3">
						{DIFFICULTIES.map(d => (
							<button
								key={d.value}
								onClick={() => setDifficulty(d.value)}
								className="py-3 rounded-lg font-bold text-sm transition-all active:scale-95"
								style={{
									background: difficulty === d.value
										? "linear-gradient(135deg, var(--primary), var(--primary-container))"
										: "var(--surface-container)",
									color: difficulty === d.value
										? "var(--on-primary-container)"
										: "var(--on-surface-variant)",
									border: difficulty === d.value ? "none" : "1px solid rgba(70, 69, 84, 0.2)",
								}}
							>
								{d.label}
							</button>
						))}
					</div>
				</div>

				{/* Time Limit */}
				<div className="mb-8">
					<label className="block text-xs font-bold uppercase tracking-widest mb-2" style={{ color: "var(--primary)" }}>
						Time Limit per Round
					</label>
					<select
						value={timeLimitMs ?? ""}
						onChange={e => setTimeLimitMs(e.target.value ? Number(e.target.value) : null)}
						className="w-full px-4 py-3 rounded-lg border text-sm"
						style={{
							background: "var(--surface-container)",
							borderColor: "rgba(70, 69, 84, 0.2)",
							color: "var(--on-surface)",
						}}
					>
						{TIME_LIMITS.map(tl => (
							<option key={tl.label} value={tl.value ?? ""}>
								{tl.label}
							</option>
						))}
					</select>
				</div>

				{/* Create button */}
				<button
					onClick={handleCreate}
					disabled={creating}
					className="w-full py-4 rounded-xl font-black text-lg transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
					style={{
						background: "linear-gradient(135deg, var(--primary), var(--primary-container))",
						color: "var(--on-primary-container)",
					}}
				>
					{creating ? "Creating..." : "Create Tournament"}
				</button>
			</div>
		</main>
	);
}
