/**
 * Recoil atom for authentication modal state.
 *
 * Controls whether the auth modal is visible and which view (login, register, or
 * forgotPassword) is currently active. This is the only piece of global state managed
 * by Recoil in the application; all other state is local to components or stored in Firebase.
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
