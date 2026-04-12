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

// Get user's unsolved problems 

// Get user's unsolved problems and return a random one

