/**
 * Artifact:             pages/problems/[pid].tsx
 * Description:          Statically generated problem page — builds one route per locally
 *                       defined problem at build time and injects the Problem object as a prop.
 *
 * Programmer:           Burak Örkmez (original); Carlos Mbendera (EECS 582 adaptation)
 * Date Created:         2023-03-18
 * Revisions:
 *   2026-02-24          Added prologue comments (Carlos Mbendera)
 *   2026-02-27          Changed fallback to "blocking"; added Firestore questions fallback
 *                       in getStaticProps so Firestore question document IDs resolve to a
 *                       problem page without a 404 (Carlos Mbendera)
 *
 * Preconditions:        The problems map in utils/problems/index.ts must be populated.
 *                       Firestore "questions" collection must be accessible.
 *                       Each Problem's handlerFunction must be serializable via .toString().
 * Acceptable Input:     pid — string key in the local problems map, or a Firestore
 *                       document ID from the "questions" collection.
 * Unacceptable Input:   pid absent from both sources; returns notFound: true.
 *
 * Postconditions:       A page is generated for each local problem at build time; Firestore
 *                       question pages are generated on first request and then cached.
 * Return Values:        getStaticPaths — { paths, fallback: "blocking" }.
 *                       getStaticProps — { props: { problem } } or { notFound: true }.
 *
 * Error/Exception Conditions:
 *                       Firestore fetch failure returns { notFound: true }.
 *                       Unrecognized pid in both sources returns { notFound: true }.
 * Side Effects:         problem.handlerFunction is mutated to string for local problems.
 *                       Reads one Firestore document for non-local pids.
 * Invariants:           Every rendered page always receives a valid Problem prop.
 * Known Faults:         Firestore-sourced problems have no handlerFunction — code submission
 *                       always returns false (no automated test validation).
 */

import Topbar from "@/components/Topbar/Topbar";
import Workspace from "@/components/Workspace/Workspace";
import useHasMounted from "@/hooks/useHasMounted";
import { problems } from "@/utils/problems";
import { Problem } from "@/utils/types/problem";
import { doc, getDoc } from "firebase/firestore";
import { firestore } from "@/firebase/firebase";
import React from "react";

type ProblemPageProps = {
	problem: Problem;
};

const ProblemPage: React.FC<ProblemPageProps> = ({ problem }) => {
	const hasMounted = useHasMounted();

	if (!hasMounted) return null;

	return (
		<div>
			<Topbar problemPage />
			<Workspace problem={problem} />
		</div>
	);
};
export default ProblemPage;

export async function getStaticPaths() {
	const paths = Object.keys(problems).map((key) => ({
		params: { pid: key },
	}));

	return {
		paths,
		// Written by Carlos with help from Claude
		// 'blocking' lets Next.js generate pages for Firestore question IDs on first request
		fallback: "blocking",
	};
}

export async function getStaticProps({ params }: { params: { pid: string } }) {
	const { pid } = params;

	// Try the local problems map first (the 5 fully-implemented problems)
	const localProblem = problems[pid];
	if (localProblem) {
		localProblem.handlerFunction = localProblem.handlerFunction.toString();
		return { props: { problem: localProblem } };
	}

	// Written by Carlos with help from Claude
	// Fall back to the Firestore questions collection for all other problem IDs
	try {
		const docSnap = await getDoc(doc(firestore, "questions", pid));
		if (!docSnap.exists()) return { notFound: true };

		const data = docSnap.data();

		// Convert the plain-text description to basic HTML for dangerouslySetInnerHTML
		const problemStatement = (data.description || "")
			.split("\n\n")
			.map((para: string) => `<p class="mt-3">${para.replace(/\n/g, "<br />")}</p>`)
			.join("");

		const problem: Problem = {
			id: pid,
			title: data.title || "",
			problemStatement,
			examples: [],
			constraints: "",
			order: data.beatcode_id || data.id || 0,
			starterCode: "/**\n * Write your solution below\n */\nfunction solution() {\n\t\n}",
			handlerFunction: "function(fn) { return false; }",
			starterFunctionName: "solution",
		};

		return { props: { problem } };
	} catch {
		return { notFound: true };
	}
}
