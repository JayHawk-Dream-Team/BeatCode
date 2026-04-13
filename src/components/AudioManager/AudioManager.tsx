/**
 * Artifact:             AudioManager.tsx
 * Description:          Global audio manager that controls background music across
 *                       the application. Plays menu music by default, switches to
 *                       match_start music when a match begins (chaining into battle
 *                       music once the intro finishes), and returns to menu music
 *                       when the match ends. Respects a global muted state persisted
 *                       to localStorage.
 *
 * Preconditions:        Audio files must exist at /sounds/menu_music.mp3,
 *                       /sounds/match_start.mp3, and /sounds/battle_music.mp3.
 *                       Must be rendered inside a RecoilRoot.
 * Postconditions:       Correct audio track plays based on router state and muted atom.
 * Return Values:        null — renders no visible DOM nodes.
 */

import { useEffect, useRef, useState } from "react";
import { useRecoilState } from "recoil";
import { audioMutedAtom } from "@/atoms/audioAtom";
import { useRouter } from "next/router";

type AudioMode = "menu" | "match_start" | "battle";

const AudioManager: React.FC = () => {
	const router = useRouter();
	const [muted, setMuted] = useRecoilState(audioMutedAtom);

	// Keep a ref so event-listener callbacks always see the current muted value
	const mutedRef = useRef(muted);
	useEffect(() => {
		mutedRef.current = muted;
	}, [muted]);

	const menuAudio = useRef<HTMLAudioElement | null>(null);
	const matchStartAudio = useRef<HTMLAudioElement | null>(null);
	const battleAudio = useRef<HTMLAudioElement | null>(null);

	// Track current playback mode via ref (not state) so callbacks don't go stale
	const modeRef = useRef<AudioMode>("menu");
	const [initialized, setInitialized] = useState(false);

	// Holds the audio element waiting to play once the browser unlocks autoplay
	const pendingPlayRef = useRef<HTMLAudioElement | null>(null);

	const matchId = router.query.matchId as string | undefined;

	/**
	 * Attempt to play an audio element. If the browser blocks autoplay (no prior
	 * user gesture), store it as pending so the unlock handler can retry on the
	 * first pointer/keyboard interaction.
	 */
	const playAudio = (audio: HTMLAudioElement) => {
		audio.play().catch(() => {
			pendingPlayRef.current = audio;
		});
	};

	// ── Initialize audio elements once on the client ──────────────────────────
	useEffect(() => {
		const menu = new Audio("/sounds/menu_music.mp3");
		menu.loop = true;
		menu.volume = 0.3;

		const matchStart = new Audio("/sounds/match_start.mp3");
		matchStart.volume = 0.5;

		const battle = new Audio("/sounds/battle_music.mp3");
		battle.loop = true;
		battle.volume = 0.3;

		menuAudio.current = menu;
		matchStartAudio.current = matchStart;
		battleAudio.current = battle;

		// Restore persisted mute preference
		const saved = localStorage.getItem("beatcode_muted");
		if (saved === "true") {
			setMuted(true);
			mutedRef.current = true;
		}

		// On first user interaction, resume any audio that was blocked by autoplay policy
		const handleUnlock = () => {
			if (pendingPlayRef.current && !mutedRef.current) {
				pendingPlayRef.current.play().catch(() => {});
				pendingPlayRef.current = null;
			}
		};
		document.addEventListener("pointerdown", handleUnlock);
		document.addEventListener("keydown", handleUnlock);

		setInitialized(true);

		return () => {
			menu.pause();
			matchStart.pause();
			battle.pause();
			document.removeEventListener("pointerdown", handleUnlock);
			document.removeEventListener("keydown", handleUnlock);
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	// ── React to matchId changes (including initial value after init) ──────────
	useEffect(() => {
		if (!initialized) return;

		if (matchId) {
			// ── Entering a match ──────────────────────────────────────────────
			menuAudio.current?.pause();
			battleAudio.current?.pause();
			if (battleAudio.current) battleAudio.current.currentTime = 0;

			const ms = matchStartAudio.current!;
			ms.currentTime = 0;
			modeRef.current = "match_start";

			const onEnded = () => {
				modeRef.current = "battle";
				if (!mutedRef.current && battleAudio.current) {
					battleAudio.current.currentTime = 0;
					playAudio(battleAudio.current);
				}
			};
			ms.addEventListener("ended", onEnded, { once: true });

			if (!mutedRef.current) playAudio(ms);

			return () => {
				ms.pause();
				ms.removeEventListener("ended", onEnded);
				battleAudio.current?.pause();
			};
		} else {
			// ── No match — play menu music ────────────────────────────────────
			matchStartAudio.current?.pause();
			battleAudio.current?.pause();
			modeRef.current = "menu";

			const menu = menuAudio.current!;
			menu.currentTime = 0;
			if (!mutedRef.current) playAudio(menu);

			return () => {
				menu.pause();
			};
		}
	}, [matchId, initialized]);

	// ── React to mute/unmute ──────────────────────────────────────────────────
	useEffect(() => {
		if (!initialized) return;
		localStorage.setItem("beatcode_muted", String(muted));

		if (muted) {
			menuAudio.current?.pause();
			matchStartAudio.current?.pause();
			battleAudio.current?.pause();
		} else {
			const mode = modeRef.current;
			if (mode === "menu" && menuAudio.current) playAudio(menuAudio.current);
			else if (mode === "match_start" && matchStartAudio.current) playAudio(matchStartAudio.current);
			else if (mode === "battle" && battleAudio.current) playAudio(battleAudio.current);
		}
	}, [muted, initialized]);

	return null;
};

export default AudioManager;
