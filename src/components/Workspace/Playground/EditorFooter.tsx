/**
 * prologue comment
 * Name of code artifact: EditorFooter.tsx
 * Brief description: Renders editor footer controls for run/submit actions, with multiplayer-specific run-button hiding.
 * Programmer's name: Jonathan Johnston
 * Date the code was created: 2023-03-18
 * Dates the code was revised:
 *   - 2026-02-24: Added earlier prologue documentation (Carlos Mbendera)
 *   - 2026-03-20: Added multiplayer-aware UI behavior to hide Run button during matches (Jonathan Johnston)
 * Brief description of each revision & author: See revision list above.
 * Preconditions:
 *   - Parent component provides callable handlers and loading flags.
 * Acceptable and unacceptable input values or types, and their meanings:
 *   - Acceptable: handleRun/handleSubmit callbacks, running/submitting booleans, optional isMultiplayer boolean.
 *   - Unacceptable: missing handlers; button actions will fail at runtime.
 * Postconditions:
 *   - Footer actions are rendered and wired to callbacks.
 * Return values or types, and their meanings:
 *   - Returns React JSX footer controls.
 * Error and exception condition values or types that can occur, and their meanings:
 *   - Callback exceptions propagate to parent-level handling.
 * Side effects:
 *   - Invokes provided handlers on button clicks.
 * Invariants:
 *   - Submit button is always available; Run button is hidden only in multiplayer mode.
 * Any known faults:
 *   - Console toggle remains decorative and does not open a full console panel.
 */
import React from "react";
import { BsChevronUp } from "react-icons/bs";

type EditorFooterProps = {
	handleRun: () => void;
	handleSubmit: () => void;
	running: boolean;
	submitting: boolean;
	isMultiplayer?: boolean;
};

const EditorFooter: React.FC<EditorFooterProps> = ({ handleRun, handleSubmit, running, submitting, isMultiplayer = false }) => {
	return (
		<div className='flex bg-dark-layer-1 absolute bottom-0 z-10 w-full'>
			<div className='mx-5 my-[10px] flex justify-between w-full'>
				<div className='mr-2 flex flex-1 flex-nowrap items-center space-x-4'>
					<button className='px-3 py-1.5 font-medium items-center transition-all inline-flex bg-dark-fill-3 text-sm hover:bg-dark-fill-2 text-dark-label-2 rounded-lg pl-3 pr-2'>
						Console
						<div className='ml-1 transform transition flex items-center'>
							<BsChevronUp className='fill-gray-6 mx-1 fill-dark-gray-6' />
						</div>
					</button>
				</div>
				<div className='ml-auto flex items-center space-x-4'>
					{!isMultiplayer && (
						<button
							className='px-3 py-1.5 text-sm font-medium items-center whitespace-nowrap transition-all focus:outline-none inline-flex bg-dark-fill-3  hover:bg-dark-fill-2 text-dark-label-2 rounded-lg'
							onClick={handleRun}
							disabled={running || submitting}
						>
							{running ? "Running..." : "Run"}
						</button>
					)}
					<button
						className='px-3 py-1.5 font-medium items-center transition-all focus:outline-none inline-flex text-sm text-white bg-dark-green-s hover:bg-green-3 rounded-lg'
						onClick={handleSubmit}
						disabled={running || submitting}
					>
						{submitting ? "Submitting..." : "Submit"}
					</button>
				</div>
			</div>
		</div>
	);
};
export default EditorFooter;

