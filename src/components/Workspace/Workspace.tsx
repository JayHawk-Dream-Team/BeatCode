/**
 * Artifact:             Workspace.tsx
 * Description:          Top-level problem workspace — horizontally resizable split pane
 *                       between ProblemDescription and Playground, with full-screen
 *                       confetti animation on successful code submission.
 *
 * Programmer:           Burak Örkmez (original); Carlos Mbendera (EECS 582 adaptation)
 * Date Created:         2023-03-18
 * Revisions:
 *   2026-02-24          Added prologue comments (Carlos Mbendera)
 *
 * Preconditions:        A valid Problem object must be passed as a prop. react-split CSS
 *                       (class "split") must be defined in global styles.
 * Acceptable Input:     problem — Problem object with all required fields populated.
 * Unacceptable Input:   null or undefined problem; Problem missing required fields.
 *
 * Postconditions:       Left (description) and right (editor) panes are rendered and
 *                       user-resizable via drag handle.
 * Return Values:        React JSX of the split-pane layout.
 *
 * Error/Exception Conditions:
 *                       Errors from Playground or ProblemDescription propagate upward
 *                       and are not caught at this level.
 * Side Effects:         Renders react-confetti overlay when success is true; confetti
 *                       auto-clears after 4 seconds (timeout managed inside Playground).
 * Invariants:           success is always reset to false within 4 seconds of being set true.
 * Known Faults:         None known.
 */

import { useState } from "react";
import Split from "react-split";
import ProblemDescription from "./ProblemDescription/ProblemDescription";
import Playground from "./Playground/Playground";
import { Problem } from "@/utils/types/problem";
import Confetti from "react-confetti";
import useWindowSize from "@/hooks/useWindowSize";

type WorkspaceProps = {
	problem: Problem;
};

const Workspace: React.FC<WorkspaceProps> = ({ problem }) => {
	const { width, height } = useWindowSize();
	const [success, setSuccess] = useState(false);
	const [solved, setSolved] = useState(false);

	return (
		<Split className='split' minSize={0}>
			<ProblemDescription problem={problem} _solved={solved} />
			<div className='bg-dark-fill-2'>
				<Playground problem={problem} setSuccess={setSuccess} setSolved={setSolved} />
				{success && <Confetti gravity={0.3} tweenDuration={4000} width={width - 1} height={height - 1} />}
			</div>
		</Split>
	);
};
export default Workspace;
