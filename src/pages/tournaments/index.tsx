// Written by Carlos with help from Claude
/**
 * Artifact:             tournaments/index.tsx
 * Description:          Tournament browser page. Lists tournaments with filter tabs
 *                       (Lobby, Active, Finished) and a create button. Allows joining
 *                       lobby tournaments directly from the card.
 *
 * Programmer:           Carlos Mbendera
 * Date Created:         2026-04-12
 * Revisions:            N/A
 *
 * Preconditions:        Firestore must be initialized.
 * Acceptable Input:     N/A — page-level component.
 * Unacceptable Input:   N/A
 *
 * Postconditions:       Renders a filterable list of tournaments.
 * Return Values:        React JSX page.
 *
 * Error/Exception Conditions:     API fetch errors shown as empty state.
 * Side Effects:         Fetches from /api/tournaments/list on mount and tab change.
 * Invariants:           None.
 * Known Faults:         None.
 */

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/router";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "@/firebase/firebase";
import { useSetRecoilState } from "recoil";
import { authModalState } from "@/atoms/authModalAtom";
import Topbar from "@/components/Topbar/Topbar";
import TournamentCard from "@/components/Tournament/TournamentCard";
import Link from "next/link";
import { toast } from "react-toastify";
import type { Tournament, TournamentStatus } from "@/utils/types/tournament";

const TABS: { value: TournamentStatus; label: string }[] = [
	{ value: "lobby", label: "Lobby" },
	{ value: "active", label: "Active" },
	{ value: "finished", label: "Finished" },
];

export default function TournamentsIndex() {
	const router = useRouter();
	const [user] = useAuthState(auth);
	const setAuthModalState = useSetRecoilState(authModalState);
	const [activeTab, setActiveTab] = useState<TournamentStatus>("lobby");
	const [tournaments, setTournaments] = useState<(Tournament & { id: string })[]>([]);
	const [loading, setLoading] = useState(true);
	const [joiningId, setJoiningId] = useState<string | null>(null);

	const fetchTournaments = useCallback(async () => {
		try {
			const res = await fetch(`/api/tournaments/list?status=${activeTab}`);
			if (!res.ok) throw new Error("Failed to fetch");
			const data = await res.json();
			setTournaments(data.tournaments || []);
		} catch {
			setTournaments([]);
		} finally {
			setLoading(false);
		}
	}, [activeTab]);

	useEffect(() => {
		setLoading(true);
		fetchTournaments();
	}, [fetchTournaments]);

	// Refresh periodically for lobby tab
	useEffect(() => {
		if (activeTab !== "lobby") return;
		const interval = setInterval(fetchTournaments, 5000);
		return () => clearInterval(interval);
	}, [activeTab, fetchTournaments]);

	const handleJoin = async (tournamentId: string) => {
		if (!user) {
			setAuthModalState(prev => ({ ...prev, isOpen: true, type: "login" }));
			return;
		}

		setJoiningId(tournamentId);
		try {
			const token = await user.getIdToken();
			const res = await fetch(`/api/tournaments/${tournamentId}/join`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${token}`,
				},
				body: JSON.stringify({ userId: user.uid }),
			});
			const data = await res.json();
			if (!res.ok) throw new Error(data.error || "Failed to join");

			if (data.tournamentStarted) {
				toast.success("Tournament started!", { position: "top-center", theme: "dark" });
			} else {
				toast.info("Joined! Waiting for more players...", { position: "top-center", theme: "dark" });
			}
			router.push(`/tournaments/${tournamentId}`);
		} catch (err: any) {
			toast.error(err.message, { position: "top-center", theme: "dark" });
		} finally {
			setJoiningId(null);
		}
	};

	return (
		<main style={{ background: "var(--surface)", minHeight: "100vh" }}>
			<Topbar />
			<div className="max-w-5xl mx-auto px-6 pt-24 pb-16">
				{/* Header */}
				<div className="flex items-center justify-between mb-8">
					<div>
						<h1 className="text-3xl font-black" style={{ color: "var(--on-surface)" }}>
							Tournaments
						</h1>
						<p className="text-sm mt-1" style={{ color: "var(--on-surface-variant)" }}>
							Bracket-based elimination. Last one standing wins.
						</p>
					</div>
					<Link href="/tournaments/create">
						<button
							className="px-6 py-3 rounded-lg font-bold text-sm transition-all active:scale-95"
							style={{
								background: "linear-gradient(135deg, var(--primary), var(--primary-container))",
								color: "var(--on-primary-container)",
							}}
						>
							Create Tournament
						</button>
					</Link>
				</div>

				{/* Tabs */}
				<div className="flex gap-2 mb-8">
					{TABS.map(tab => (
						<button
							key={tab.value}
							onClick={() => setActiveTab(tab.value)}
							className="px-4 py-2 rounded-lg font-bold text-sm transition-all"
							style={{
								background: activeTab === tab.value
									? "var(--primary)"
									: "var(--surface-container)",
								color: activeTab === tab.value
									? "var(--on-primary-container)"
									: "var(--on-surface-variant)",
							}}
						>
							{tab.label}
						</button>
					))}
				</div>

				{/* Tournament grid */}
				{loading ? (
					<div className="text-center py-20" style={{ color: "var(--on-surface-variant)" }}>
						Loading tournaments...
					</div>
				) : tournaments.length === 0 ? (
					<div className="text-center py-20">
						<p style={{ color: "var(--on-surface-variant)" }}>
							No {activeTab} tournaments found.
						</p>
						{activeTab === "lobby" && (
							<Link href="/tournaments/create">
								<span
									className="inline-block mt-4 px-6 py-2 rounded-lg font-bold text-sm cursor-pointer"
									style={{
										background: "linear-gradient(135deg, var(--primary), var(--primary-container))",
										color: "var(--on-primary-container)",
									}}
								>
									Create One
								</span>
							</Link>
						)}
					</div>
				) : (
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
						{tournaments.map(t => (
							<TournamentCard
								key={t.id}
								tournament={t}
								currentUserId={user?.uid}
								onJoin={handleJoin}
								joining={joiningId === t.id}
							/>
						))}
					</div>
				)}
			</div>
		</main>
	);
}
