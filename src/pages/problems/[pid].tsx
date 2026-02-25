/**
 * Artifact:             pages/problems/[pid].tsx
 * Description:          Statically generated problem page — builds one route per locally
 *                       defined problem at build time and injects the Problem object as a prop.
 *
 * Programmer:           Burak Örkmez (original); Carlos Mbendera (EECS 582 adaptation)
 * Date Created:         2023-03-18
 * Revisions:
 *   2026-02-24          Added prologue comments (Carlos Mbendera)
 *
 * Preconditions:        The problems map in utils/problems/index.ts must be populated.
 *                       Each Problem's handlerFunction must be serializable via .toString().
 * Acceptable Input:     pid — string key present in the problems map (e.g. "two-sum").
 * Unacceptable Input:   pid values absent from the problems map; handled with notFound: true.
 *
 * Postconditions:       A static HTML page is generated per problem slug at build time;
 *                       the page receives a Problem object with handlerFunction as a string.
 * Return Values:        getStaticPaths — { paths: [{ params: { pid } }], fallback: false }.
 *                       getStaticProps — { props: { problem } } or { notFound: true }.
 *
 * Error/Exception Conditions:
 *                       An unrecognized pid returns { notFound: true }, triggering a 404 page.
 * Side Effects:         problem.handlerFunction is mutated to its string representation
 *                       during getStaticProps serialization before the prop is passed.
 * Invariants:           fallback: false means any pid not built at compile time always 404s.
 * Known Faults:         None known.
 */

import Topbar from "@/components/Topbar/Topbar";
import Workspace from "@/components/Workspace/Workspace";
import useHasMounted from "@/hooks/useHasMounted";
import { problems } from "@/utils/problems";
import { Problem } from "@/utils/types/problem";
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

// fetch the local data
//  SSG
// getStaticPaths => it create the dynamic routes
export async function getStaticPaths() {
	const paths = Object.keys(problems).map((key) => ({
		params: { pid: key },
	}));

	return {
		paths,
		fallback: false,
	};
}

// getStaticProps => it fetch the data

export async function getStaticProps({ params }: { params: { pid: string } }) {
	const { pid } = params;
	const problem = problems[pid];

	if (!problem) {
		return {
			notFound: true,
		};
	}
	problem.handlerFunction = problem.handlerFunction.toString();
	return {
		props: {
			problem,
		},
	};
}
