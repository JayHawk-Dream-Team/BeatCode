// Written by Carlos with help from Claude
/**
 * Artifact:             authHelpers.ts
 * Description:          Server-side authentication utilities for API routes. Provides
 *                       Firebase ID token verification to extract the authenticated
 *                       user's UID from the Authorization header.
 *
 * Programmer:           Carlos Mbendera
 * Date Created:         2026-04-12
 * Revisions:            N/A
 *
 * Preconditions:        Firebase Admin must be initialized (firebaseAdmin.ts).
 *                       Client must send Authorization: Bearer <token> header.
 * Acceptable Input:     NextApiRequest with valid Authorization header.
 * Unacceptable Input:   Requests without Authorization header or with invalid/expired tokens.
 *
 * Postconditions:       Returns the verified user ID or null.
 * Return Values:        verifyAuthToken: string (UID) or null if no/invalid token.
 *
 * Error/Exception Conditions:
 *                       Returns null (does not throw) when token is missing or invalid.
 *                       Callers decide whether to reject the request (401) or fall back.
 * Side Effects:         None — reads only.
 * Invariants:           Never returns a UID for an invalid or expired token.
 * Known Faults:         None.
 */

import type { NextApiRequest } from "next";
import { adminAuth } from "@/firebase/firebaseAdmin";

/**
 * Extracts and verifies a Firebase ID token from the Authorization header.
 * Returns the user's UID if valid, or null if missing/invalid.
 */
export async function verifyAuthToken(req: NextApiRequest): Promise<string | null> {
	const authHeader = req.headers.authorization;
	if (!authHeader || !authHeader.startsWith("Bearer ")) return null;

	const token = authHeader.slice(7);
	if (!token) return null;

	try {
		const decoded = await adminAuth.verifyIdToken(token);
		return decoded.uid;
	} catch {
		return null;
	}
}
