import { auth, firestore } from "@/firebase/firebase";
import Topbar from "@/components/Topbar/Topbar";
import useHasMounted from "@/hooks/useHasMounted";
import { useAuthState } from "react-firebase-hooks/auth";
import { collection, getDocs, doc, getDoc } from "firebase/firestore";
import { useRouter } from "next/router";
import { useEffect, useState, useMemo } from "react";
import { toast } from "react-toastify";
import { DBProblem } from "@/utils/types/problem";

type ProblemProgress = {
    id: string;
    title: string;
    difficulty: string;
    category: string;
    status: "solved" | "attempted" | "not-attempted";
    likes: number;
    dislikes: number;
    order: number;
};

const ProgressPage = () => {
    const router = useRouter();
    const [user, loading] = useAuthState(auth);
    const hasMounted = useHasMounted();
    const [progressData, setProgressData] = useState<ProblemProgress[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [filterStatus, setFilterStatus] = useState<"all" | "solved" | "attempted">("all");
    const [sortBy, setSortBy] = useState<"order" | "difficulty">("order");

    useEffect(() => {
        if (!loading && !user) {
            router.replace("/auth");
        }
    }, [loading, user, router]);

    useEffect(() => {
        const loadProgress = async () => {
            if (!user) {
                console.log("No user, skipping loadProgress");
                return;
            }
            console.log("Loading progress for user:", user.uid);
            setIsLoading(true);
            try {
                // Fetch user data
                const userRef = doc(firestore, "users", user.uid);
                const userSnap = await getDoc(userRef);
                const userData = userSnap.exists() ? userSnap.data() : null;
                console.log("User data:", userData);

                const solvedProblems = userData?.solvedProblems || [];
                const attemptedProblems = userData?.attemptedProblems || [];
                console.log("Solved problems:", solvedProblems.length, "Attempted problems:", attemptedProblems.length);

                // Fetch all problems from Firestore (try questions collection first, then problems)
                const questionsCol = collection(firestore, "questions");
                let problemsSnapshot = await getDocs(questionsCol);
                console.log("Questions collection size:", problemsSnapshot.size);
                
                // If no questions found, try problems collection
                if (problemsSnapshot.empty) {
                    const problemsCol = collection(firestore, "problems");
                    problemsSnapshot = await getDocs(problemsCol);
                    console.log("Problems collection size:", problemsSnapshot.size);
                }

                const data: ProblemProgress[] = [];

                problemsSnapshot.forEach((doc) => {
                    const dbProblem = doc.data() as DBProblem;
                    const status = solvedProblems.includes(doc.id)
                        ? "solved"
                        : attemptedProblems.includes(doc.id)
                            ? "attempted"
                            : "not-attempted";

                    data.push({
                        id: doc.id,
                        title: dbProblem.title || "Untitled Problem",
                        difficulty: dbProblem.difficulty || "Medium", // Default to Medium if not specified
                        category: dbProblem.category || "General",
                        status,
                        likes: dbProblem.likes || 0,
                        dislikes: dbProblem.dislikes || 0,
                        order: dbProblem.order || (dbProblem.beatcodeId ? parseInt(dbProblem.beatcodeId) : 999),
                    });
                });

                console.log("Processed", data.length, "problems");
                console.log("Sample problem:", data[0]);

                // Sort by order
                data.sort((a, b) => a.order - b.order);

                setProgressData(data);
                console.log("Set progress data with", data.length, "items");
            } catch (error) {
                console.error("Error loading progress:", error);
                toast.error("Failed to load progress data.", { position: "top-center" });
            } finally {
                setIsLoading(false);
            }
        };

        loadProgress();
    }, [user]);

    const filteredAndSorted = useMemo(() => {
        let filtered = progressData;

        if (filterStatus === "all") {
            filtered = filtered.filter((p) => p.status !== "not-attempted");
        } else {
            filtered = filtered.filter((p) => p.status === filterStatus);
        }

        if (sortBy === "difficulty") {
            const difficultyOrder = { Easy: 0, Medium: 1, Hard: 2 };
            filtered.sort(
                (a, b) => (difficultyOrder[a.difficulty as keyof typeof difficultyOrder] || 99) - (difficultyOrder[b.difficulty as keyof typeof difficultyOrder] || 99)
            );
        } else {
            filtered.sort((a, b) => a.order - b.order);
        }

        return filtered;
    }, [progressData, filterStatus, sortBy]);

    const stats = useMemo(() => {
        const solved = progressData.filter((p) => p.status === "solved").length;
        const attempted = progressData.filter((p) => p.status === "attempted").length;

        return {
            total: solved + attempted,
            solved,
            attempted,
        };
    }, [progressData]);

    const difficultyColorMap: Record<string, string> = {
        easy: "text-tertiary",
        medium: "text-secondary",
        hard: "text-error",
        default: "text-on-surface-variant",
    };

    const statusColorMap: Record<string, string> = {
        solved: "text-tertiary",
        attempted: "text-secondary",
        default: "text-on-surface-variant",
    };

    const getDifficultyColor = (difficulty: string) => {
        return difficultyColorMap[difficulty.toLowerCase()] || difficultyColorMap.default;
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case "solved":
                return "●";
            case "attempted":
                return "◐";
            default:
                return "○";
        }
    };

    const getStatusColor = (status: string) => {
        return statusColorMap[status] || statusColorMap.default;
    };

    if (!hasMounted || loading || (!user && !router.isReady)) {
        return null;
    }

    return (
        <main className='min-h-screen bg-background text-on-surface'>
            <Topbar />
            <section className='pt-24 pb-32 px-8 max-w-7xl mx-auto'>
                <header className='mb-12'>
                    <h1 className='text-5xl font-black tracking-tighter uppercase mb-6 text-on-surface'>Progress Tracker</h1>
                    <p className='text-on-surface-variant text-sm max-w-2xl leading-relaxed mb-8'>
                        Track your solved and attempted problems. Click any problem to revisit it.
                    </p>

                    {/* Stats Cards */}
                    <div className='grid grid-cols-1 md:grid-cols-3 gap-4 mb-8'>
                        <div className='p-6 rounded-sm border border-outline-variant/20' style={{ background: "var(--surface-container-low)" }}>
                            <div className='flex justify-between items-center'>
                                <span className='text-xs font-bold tracking-widest uppercase text-on-surface-variant'>Total Attempted + Solved</span>
                                <span className='text-3xl font-black' style={{ color: "var(--primary)" }}>
                                    {stats.total}
                                </span>
                            </div>
                        </div>

                        <div className='p-6 rounded-sm border border-outline-variant/20' style={{ background: "var(--surface-container-low)" }}>
                            <div className='flex justify-between items-center'>
                                <span className='text-xs font-bold tracking-widest uppercase text-on-surface-variant'>Solved</span>
                                <span className='text-3xl font-black' style={{ color: "var(--tertiary)" }}>
                                    {stats.solved}
                                </span>
                            </div>
                        </div>

                        <div className='p-6 rounded-sm border border-outline-variant/20' style={{ background: "var(--surface-container-low)" }}>
                            <div className='flex justify-between items-center'>
                                <span className='text-xs font-bold tracking-widest uppercase text-on-surface-variant'>Attempted</span>
                                <span className='text-3xl font-black' style={{ color: "var(--secondary)" }}>
                                    {stats.attempted}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Filters and Sort */}
                    <div className='flex flex-wrap gap-4 items-center justify-between'>
                        <div className='flex flex-wrap gap-3'>
                            <button
                                onClick={() => setFilterStatus("all")}
                                className={`px-4 py-2 rounded-sm text-xs font-bold tracking-widest uppercase transition ${
                                    filterStatus === "all"
                                        ? "bg-primary text-on-primary"
                                        : "bg-surface-container-low text-on-surface-variant hover:text-on-surface"
                                }`}
                            >
                                All
                            </button>
                            <button
                                onClick={() => setFilterStatus("solved")}
                                className={`px-4 py-2 rounded-sm text-xs font-bold tracking-widest uppercase transition ${
                                    filterStatus === "solved"
                                        ? "bg-tertiary text-on-tertiary"
                                        : "bg-surface-container-low text-on-surface-variant hover:text-on-surface"
                                }`}
                            >
                                Solved
                            </button>
                            <button
                                onClick={() => setFilterStatus("attempted")}
                                className={`px-4 py-2 rounded-sm text-xs font-bold tracking-widest uppercase transition ${
                                    filterStatus === "attempted"
                                        ? "bg-secondary text-on-secondary"
                                        : "bg-surface-container-low text-on-surface-variant hover:text-on-surface"
                                }`}
                            >
                                Attempted
                            </button>
                        </div>

                        {/* <div className='flex items-center gap-2'>
                            <label className='text-xs font-bold tracking-widest uppercase text-on-surface-variant'>Sort:</label>
                            <select
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value as "order" | "difficulty")}
                                className='px-4 py-2 rounded-sm text-xs bg-surface-container-low border-none text-on-surface focus:ring-1 focus:ring-primary'
                            >
                                <option value='order'>By Order</option>
                                <option value='difficulty'>By Difficulty</option>
                            </select>
                        </div> */}
                    </div>
                </header>

                {/* Problems Table */}
                <div className='overflow-x-auto'>
                    <table className='w-full border-collapse'>
                        <thead>
                            <tr className='border-b border-outline-variant/20'>
                                <th className='text-left py-4 px-4 text-xs font-bold tracking-widest uppercase text-on-surface-variant'>#</th>
                                <th className='text-left py-4 px-4 text-xs font-bold tracking-widest uppercase text-on-surface-variant'>Problem</th>
                                <th className='text-left py-4 px-4 text-xs font-bold tracking-widest uppercase text-on-surface-variant'>Difficulty</th>
                                <th className='text-left py-4 px-4 text-xs font-bold tracking-widest uppercase text-on-surface-variant'>Category</th>
                                <th className='text-center py-4 px-4 text-xs font-bold tracking-widest uppercase text-on-surface-variant'>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                <tr>
                                    <td colSpan={5} className='py-12 text-center text-on-surface-variant'>
                                        Loading problems...
                                    </td>
                                </tr>
                            ) : filteredAndSorted.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className='py-12 text-center text-on-surface-variant'>
                                        No problems found.
                                    </td>
                                </tr>
                            ) : (
                                filteredAndSorted.map((problem, idx) => (
                                    <tr
                                        key={problem.id}
                                        onClick={() => router.push(`/problems/${problem.id}`)}
                                        className='border-b border-outline-variant/10 hover:bg-surface-container-low transition-colors cursor-pointer'
                                    >
                                        <td className='py-4 px-4 text-sm text-on-surface-variant font-mono'>{idx + 1}</td>
                                        <td className='py-4 px-4 text-sm font-medium text-on-surface max-w-xs truncate'>{problem.title}</td>
                                        <td className={`py-4 px-4 text-sm font-bold ${getDifficultyColor(problem.difficulty)}`}>{problem.difficulty}</td>
                                        <td className='py-4 px-4 text-sm text-on-surface-variant'>{problem.category}</td>
                                        <td className={`py-4 px-4 text-center text-xl font-bold ${getStatusColor(problem.status)}`}>
                                            {getStatusIcon(problem.status)}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </section>
        </main>
    );
};

export default ProgressPage;

export async function getServerSideProps() {
	return {
		props: {},
	};
}