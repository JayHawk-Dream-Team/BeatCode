
/**
 * Custom Hook: useMatchmaking
 * Description: Manages PvP matchmaking logic including random problem selection,
 *              opponent polling, and queue management.
 *
 * Preconditions: Firebase and auth must be initialized
 * Returns: Object with handleJoinPvP, joiningPvP state
 */

import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth, firestore } from "@/firebase/firebase";
import { doc, getDoc } from "firebase/firestore";
import { toast } from "react-toastify";
import { getRandomProblemNumber, getProblemIdByBeatcodeId, getPlayerFromQueue } from "@/utils/matchmakingHelpers";

interface UseMatchmakingReturn {
	handleJoinPvP: () => Promise<void>;
	joiningPvP: boolean;
}

export function useMatchmaking(onAuthRequired: () => void): UseMatchmakingReturn {
	const router = useRouter();
	const [user] = useAuthState(auth);
	const [joiningPvP, setJoiningPvP] = useState(false);
	const [pollingInfo, setPollingInfo] = useState<{ userId: string; problemId: string } | null>(null);

	// Polling for random PvP match
	useEffect(() => {
		if (!pollingInfo) return;
		const interval = setInterval(async () => {
			try {
				const res = await fetch("/api/matchmaking/check", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ userId: pollingInfo.userId, problemId: pollingInfo.problemId }),
				});
				const data = await res.json();

                console.log("Polling matchmaking status:", data);

				if (data.matchId) { //&& data.problemId) {
					router.push(`/problems/${pollingInfo.problemId}?matchId=${data.matchId}`);
					setPollingInfo(null);
				}
			} catch (err) {
				// ignore polling errors
                console.error("Error polling matchmaking status:", err);
			}
		}, 2000);
		return () => clearInterval(interval);
	}, [pollingInfo, router]);

	const handleJoinPvP = async () => {
		// Require auth to join PvP queue
		if (!user) {
			onAuthRequired();
			return;
		}

		setJoiningPvP(true);

		try {
			let dbDisplayName = "";
			try {
				const userSnap = await getDoc(doc(firestore, "users", user.uid));
				if (userSnap.exists()) {
					const userData = userSnap.data() as any;
					dbDisplayName =
						(typeof userData?.displayName === "string" && userData.displayName.trim()) ||
						(typeof userData?.username === "string" && userData.username.trim()) ||
						"";
				}
			} catch {
				// fallback below
			}

			const preferredDisplayName =
				dbDisplayName ||
				(user.displayName && user.displayName.trim()) ||
				(user.email ? user.email.split("@")[0] : "") ||
				"Player";


			const queuedPlayerId = await getPlayerFromQueue();
			console.log("Checked matchmaking queue, got problemId:", queuedPlayerId);

			let response: Response;
            let data: any;

			if (queuedPlayerId) {
				response = await fetch("/api/matchmaking/join", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						userId: user.uid,
						displayName: preferredDisplayName,
						problemId: queuedPlayerId,
					}),
				});
                
                data = await response.json();

                if (!response.ok) throw new Error(data.error || "Failed to join queue");

                if (data.queued) {
                    toast.info("Queued for match - waiting for an opponent", {
                        position: "top-center",
                        theme: "dark",
                    });
                    setPollingInfo({ userId: user.uid, problemId: queuedPlayerId });
                } else {
                    router.push(`/problems/${queuedPlayerId}?matchId=${data.matchId}`);
                }

			} else {

				const randomNumber = getRandomProblemNumber();
				const randomProblemId = await getProblemIdByBeatcodeId(randomNumber);

				if (!randomProblemId) throw new Error("Could not find a problem for matchmaking");

				response = await fetch("/api/matchmaking/join", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						userId: user.uid,
						displayName: preferredDisplayName,
						problemId: randomProblemId,
					}),
				});	
                
                data = await response.json(); 

                if (!response.ok) throw new Error(data.error || "Failed to join queue");

                if (data.queued) {
                    toast.info("Queued for match - waiting for an opponent", {
                        position: "top-center",
                        theme: "dark",
                    });
                    setPollingInfo({ userId: user.uid, problemId: randomProblemId });
                } else {
                    router.push(`/problems/${randomProblemId}?matchId=${data.matchId}`);
                }

			}

		} catch (err: any) {
			toast.error(err.message || "Unable to join matchmaking", {
				position: "top-center",
				theme: "dark",
			});
		} finally {
			setJoiningPvP(false);
		}
	};

	return { handleJoinPvP, joiningPvP };
}