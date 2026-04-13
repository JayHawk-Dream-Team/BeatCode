import { atom } from "recoil";

export const audioMutedAtom = atom<boolean>({
	key: "audioMuted",
	default: false,
});
