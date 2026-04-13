// Written by Carlos with help from Claude
/**
 * Artifact:             firebaseAdmin.ts
 * Description:          Initializes and exports the Firebase Admin SDK for server-side
 *                       operations. Used by API routes for ID token verification and
 *                       other privileged operations.
 *
 * Programmer:           Carlos Mbendera
 * Date Created:         2026-04-12
 * Revisions:            N/A
 *
 * Preconditions:        FIREBASE_SERVICE_ACCOUNT_KEY environment variable must be set
 *                       with a JSON-encoded service account key, OR the app must run in
 *                       an environment with Application Default Credentials (e.g., Vercel
 *                       with Firebase integration).
 * Acceptable Input:     N/A — module-level initialization only.
 * Unacceptable Input:   N/A
 *
 * Postconditions:       Exports an initialized Firebase Admin app and Auth instance.
 * Return Values:        adminApp (App), adminAuth (Auth).
 *
 * Error/Exception Conditions:
 *                       Throws on startup if credentials cannot be resolved and no
 *                       default credentials are available.
 * Side Effects:         Initializes a Firebase Admin app singleton.
 * Invariants:           Only one Admin app instance is created (guarded by getApps check).
 * Known Faults:         None.
 */

import { initializeApp, getApps, cert, type App } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";

function getAdminApp(): App {
	if (getApps().length > 0) {
		return getApps()[0];
	}

	const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
	if (serviceAccountKey) {
		try {
			const serviceAccount = JSON.parse(serviceAccountKey);
			return initializeApp({ credential: cert(serviceAccount) });
		} catch {
			// Fall through to default credentials
		}
	}

	// Fallback: Application Default Credentials (works in GCP/Firebase hosting)
	return initializeApp();
}

export const adminApp: App = getAdminApp();
export const adminAuth: Auth = getAuth(adminApp);
