// Written by Carlos with help from Claude
/**
 * Artifact:             list.ts (API route: /api/tournaments/list)
 * Description:          Lists tournaments filtered by status. Supports lobby, active,
 *                       and finished filters for the tournament browser UI.
 *
 * Programmer:           Carlos Mbendera
 * Date Created:         2026-04-12
 * Revisions:            N/A
 *
 * Preconditions:        Firestore must be initialized.
 * Acceptable Input:     GET with optional query params: status (comma-separated), limit.
 * Unacceptable Input:   Non-GET method.
 *
 * Postconditions:       Returns an array of tournament documents.
 * Return Values:        JSON { tournaments: Tournament[] }.
 *
 * Error/Exception Conditions:
 *                       405 for non-GET method.
 *                       500 for Firestore query failures.
 * Side Effects:         None — read-only.
 * Invariants:           Results are ordered by createdAt descending.
 * Known Faults:         Requires composite Firestore index on status + createdAt.
 */

import type { NextApiRequest, NextApiResponse } from "next";
import { collection, getDocs, query, where, orderBy, limit as firestoreLimit } from "firebase/firestore";
import { firestore } from "@/firebase/firebase";
import type { TournamentStatus } from "@/utils/types/tournament";

const DEFAULT_STATUSES: TournamentStatus[] = ["lobby", "active", "finished"];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
	if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

	try {
		const statusParam = req.query.status;
		let statuses: TournamentStatus[];
		if (typeof statusParam === "string" && statusParam.trim()) {
			statuses = statusParam.split(",").map(s => s.trim()) as TournamentStatus[];
		} else {
			statuses = DEFAULT_STATUSES;
		}

		const pageLimit = Math.min(Number(req.query.limit) || 50, 100);

		let snapshot;
		try {
			// Single status uses == (no composite index needed)
			if (statuses.length === 1) {
				const q = query(
					collection(firestore, "tournaments"),
					where("status", "==", statuses[0]),
					orderBy("createdAt", "desc"),
					firestoreLimit(pageLimit)
				);
				snapshot = await getDocs(q);
			} else {
				const q = query(
					collection(firestore, "tournaments"),
					where("status", "in", statuses),
					orderBy("createdAt", "desc"),
					firestoreLimit(pageLimit)
				);
				snapshot = await getDocs(q);
			}
		} catch {
			// Fallback if composite index is missing: fetch without ordering
			const q = query(
				collection(firestore, "tournaments"),
				firestoreLimit(pageLimit)
			);
			snapshot = await getDocs(q);
			// Client-side filter + sort
			const statusSet = new Set(statuses);
			const filtered = snapshot.docs
				.filter(d => statusSet.has(d.data().status))
				.sort((a, b) => {
					const aTime = a.data().createdAt?.toMillis?.() || 0;
					const bTime = b.data().createdAt?.toMillis?.() || 0;
					return bTime - aTime;
				});
			return res.status(200).json({
				tournaments: filtered.map(d => ({ id: d.id, ...d.data() })),
			});
		}

		const tournaments = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
		return res.status(200).json({ tournaments });
	} catch (err: any) {
		return res.status(500).json({ error: String(err?.message || err) });
	}
}
