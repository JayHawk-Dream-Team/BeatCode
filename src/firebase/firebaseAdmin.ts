// Written by Carlos with help from Claude
/**
 * Artifact:             firebaseAdmin.ts
 * Description:          Initializes and exports the Firebase Admin SDK for server-side
 *                       operations. Used by API routes for ID token verification and
 *                       other privileged operations. Gracefully handles missing credentials
 *                       for local development.
 *
 * Programmer:           Carlos Mbendera
 * Date Created:         2026-04-12
 * Revisions:
 *   2026-04-13          Made initialization graceful when credentials are unavailable
 *                       (Carlos Mbendera)
 *
 * Preconditions:        FIREBASE_SERVICE_ACCOUNT_KEY environment variable should be set
 *                       with a JSON-encoded service account key for full functionality.
 * Acceptable Input:     N/A — module-level initialization only.
 * Unacceptable Input:   N/A
 *
 * Postconditions:       Exports adminAuth (Auth | null). Null when credentials unavailable.
 * Return Values:        adminAuth (Auth | null).
 *
 * Error/Exception Conditions:
 *                       Returns null adminAuth if credentials cannot be resolved,
 *                       rather than throwing.
 * Side Effects:         Initializes a Firebase Admin app singleton when credentials exist.
 * Invariants:           Only one Admin app instance is created (guarded by getApps check).
 * Known Faults:         None.
 */

import { initializeApp, getApps, cert, type App } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";

function getAdminApp(): App | null {
	if (getApps().length > 0) {
		return getApps()[0];
	}

	const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
	if (serviceAccountKey) {
		try {
			const serviceAccount = JSON.parse(serviceAccountKey);
			return initializeApp({ credential: cert(serviceAccount) });
		} catch {
			// Invalid key format
		}
	}

	// No credentials available — return null instead of throwing
	return null;
}

const app = getAdminApp();
export const adminAuth: Auth | null = app ? getAuth(app) : null;
