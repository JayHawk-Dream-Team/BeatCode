/**
 * Artifact:             firebase.ts
 * Description:          Firebase client initialization — creates singleton Auth and
 *                       Firestore instances shared throughout BeatCode.
 *
 * Programmer:           Burak Örkmez (original); Carlos Mbendera (EECS 582 adaptation)
 * Date Created:         2023-03-18
 * Revisions:
 *   2026-02-24          Added prologue comments (Carlos Mbendera)
 *   2026-02-27          Fixed getApps.length → getApps().length (Carlos Mbendera)
 *
 * Preconditions:        All NEXT_PUBLIC_FIREBASE_* environment variables must be defined
 *                       in .env.local before the development server or build is started.
 * Acceptable Input:     Valid Firebase project credentials supplied via environment variables.
 * Unacceptable Input:   Missing or malformed environment variables; calling initializeApp
 *                       multiple times with differing configs in the same process.
 *
 * Postconditions:       auth and firestore singleton clients are initialized and ready
 *                       for import by any other module in the application.
 * Return Values:        Exports { auth, firestore, app } — Firebase Auth instance,
 *                       Firestore database instance, and the Firebase App object.
 *
 * Error/Exception Conditions:
 *                       Firebase SDK throws FirebaseError if the config values are invalid.
 *                       getApp() throws if no Firebase app has been initialized yet.
 * Side Effects:         Registers the Firebase app in the global Firebase app registry;
 *                       subsequent calls to getApp() elsewhere return this same instance.
 * Invariants:           Exactly one Firebase app instance exists at runtime.
 * Known Faults:         None known.
 */

import { initializeApp, getApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
	apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
	authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
	projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
	storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
	messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
	appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Written by Carlos with help from Claude
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

const auth = getAuth(app);
const firestore = getFirestore(app);

export { auth, firestore, app };
