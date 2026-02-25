/**
 * Artifact:             authModalAtom.ts
 * Description:          Recoil atom defining global state for the authentication modal —
 *                       tracks visibility and the active view (login / register / forgotPassword).
 *
 * Programmer:           Burak Örkmez (original); Carlos Mbendera (EECS 582 adaptation)
 * Date Created:         2023-03-18
 * Revisions:
 *   2026-02-24          Added prologue comments (Carlos Mbendera)
 *
 * Preconditions:        RecoilRoot must be present in the component tree before any
 *                       component reads or writes this atom.
 * Acceptable Input:     Atom is set programmatically with valid AuthModalState values;
 *                       type must be one of: "login" | "register" | "forgotPassword".
 * Unacceptable Input:   Setting type to any string outside the union type.
 *
 * Postconditions:       authModalState atom is registered in the Recoil store with
 *                       default { isOpen: false, type: "login" }.
 * Return Values:        Exports authModalState atom for use with useRecoilValue,
 *                       useSetRecoilState, or useRecoilState hooks.
 *
 * Error/Exception Conditions:
 *                       Accessing this atom outside a RecoilRoot throws a
 *                       RecoilUndefinedStoreError at runtime.
 * Side Effects:         Registers the Recoil key "authModalState" in the global Recoil
 *                       store; this key must be unique across all atoms in the application.
 * Invariants:           The atom key "authModalState" never changes at runtime.
 * Known Faults:         None known.
 */

import { atom } from "recoil";

type AuthModalState = {
	isOpen: boolean;
	type: "login" | "register" | "forgotPassword";
};

const initalAuthModalState: AuthModalState = {
	isOpen: false,
	type: "login",
};

export const authModalState = atom<AuthModalState>({
	key: "authModalState",
	default: initalAuthModalState,
});
