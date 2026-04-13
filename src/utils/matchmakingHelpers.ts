/*
 * Authors:            Cole DuBois
 * Date Created:      2026-04-06
 * Last Updated:      2026-04-12
 * Description:       Helper functions for matchmaking logic, including fetching problems and queue management.
 */

import { collection, query, where, getDocs } from "firebase/firestore";
import { firestore } from "@/firebase/firebase";

/**
 * Generates a random integer between 1 and 100 (inclusive).
 * @returns A random integer in the range [1, 100]
 */
export function getRandomProblemNumber(): number {
	return Math.floor(Math.random() * 90) + 1;
}

/**
 * Fetches the problem document ID for a problem with the given beatcode ID.
 * Searches through the "questions" collection (with fallback to "problems" collection)
 * for a document matching the beatcode_id, beatcodeId, or order field.
 *
 * @param beatcodeId - The beatcode ID to search for
 * @returns The Firestore document ID of the matching problem, or null if not found
 * @throws Error if Firestore query fails
 */
export async function getProblemIdByBeatcodeId(beatcodeId: number): Promise<string | null> {
	try {
		// Try querying the "questions" collection first
		let querySnapshot = await getDocs(
			query(collection(firestore, "questions"), where("beatcode_id", "==", beatcodeId))
		);

		if (querySnapshot.empty) {
			// Try alternate field name
			querySnapshot = await getDocs(
				query(collection(firestore, "questions"), where("beatcodeId", "==", beatcodeId))
			);
		}

		if (querySnapshot.empty) {
			console.warn(`[matchmakingHelpers] No problem found with beatcode_id: ${beatcodeId}`);
			return null;
		}

		return querySnapshot.docs[0].id;
	} catch (err) {
		console.error(`[matchmakingHelpers] Error fetching problem by beatcode_id ${beatcodeId}:`, err);
		throw err;
	}
}

/**
 * Checks if there is a current player in the matchmaking queue.
 * Retrieves the first player in the queue and returns their associated problem ID.
 *
 * @returns The problem ID of the queued player, or null if queue is empty
 * @throws Error if Firestore query fails
 */
export async function getPlayerFromQueue(): Promise<string | null> {
    try {
        const querySnapshot = await getDocs(
            collection(firestore, "matchmaking_queue")
        );

        if (querySnapshot.empty) {
            console.log("[matchmakingHelpers] Matchmaking queue is empty");
            return null;
        }

        // Get the first player in the queue
        const queuedPlayer = querySnapshot.docs[0].data();
        
        if (!queuedPlayer.problemId) {
            console.warn("[matchmakingHelpers] Queued player missing problem_id field");
            return null;
        }

        console.log("Found queued player:", queuedPlayer, queuedPlayer.problemId);
        return queuedPlayer.problemId;
    } catch (err) {
        console.error("[matchmakingHelpers] Error fetching player from queue:", err);
        throw err;
    }
}