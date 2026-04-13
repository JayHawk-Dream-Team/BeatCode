// Written by Carlos with help from Claude
/**
 * Artifact:             authHelpers.ts
 * Description:          Server-side authentication utilities for API routes. Provides
 *                       Firebase ID token verification when Admin SDK credentials are
 *                       available, with graceful fallback to request body userId when
 *                       credentials are not configured (local development).
 *
 * Programmer:           Carlos Mbendera
 * Date Created:         2026-04-12
 * Revisions:
 *   2026-04-13          Added fallback to req.body.userId when Admin SDK unavailable
 *                       (Carlos Mbendera)
 *
 * Preconditions:        For token verification: Firebase Admin must be initialized with
 *                       credentials. Without credentials, falls back to body userId.
 * Acceptable Input:     NextApiRequest with Authorization header or body.userId.
 * Unacceptable Input:   Requests with neither auth header nor body userId.
 *
 * Postconditions:       Returns the authenticated user ID or null.
 * Return Values:        verifyAuthToken: string (UID) or null.
 *
 * Error/Exception Conditions:
 *                       Returns null (does not throw) when no auth is available.
 * Side Effects:         None — reads only.
 * Invariants:           When Admin SDK is available, token verification is authoritative.
 * Known Faults:         Without Admin SDK credentials, userId from body is trusted.
 */

import type { NextApiRequest } from "next";
import { adminAuth } from "@/firebase/firebaseAdmin";

/**
 * Extracts and verifies a Firebase ID token from the Authorization header.
 * If Firebase Admin is not configured (no credentials), falls back to
 * req.body.userId for local development compatibility.
 * Returns the user's UID if available, or null.
 */
export async function verifyAuthToken(req: NextApiRequest): Promise<string | null> {
	const authHeader = req.headers.authorization;
	const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

	console.log("[authHelpers] adminAuth available:", !!adminAuth, "token present:", !!token, "body.userId:", req.body?.userId);

	// Try Firebase Admin token verification if available
	if (token && adminAuth) {
		try {
			const decoded = await adminAuth.verifyIdToken(token);
			return decoded.uid;
		} catch (err) {
			console.log("[authHelpers] verifyIdToken failed:", err);
			// Token was invalid — don't fall back to body, return null
			return null;
		}
	}

	// Fallback: trust body userId when Admin SDK is not configured
	// This matches existing match API behavior (join.ts, submit.ts)
	if (!adminAuth) {
		const bodyUserId = req.body?.userId;
		console.log("[authHelpers] No admin SDK, falling back to body userId:", bodyUserId);
		if (typeof bodyUserId === "string" && bodyUserId.trim()) {
			return bodyUserId.trim();
		}
	}

	return null;
}
