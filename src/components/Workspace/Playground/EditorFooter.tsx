/**
 * prologue comment
 * Name of code artifact: EditorFooter.tsx
 * Brief description: Renders editor footer controls for run/submit actions, with multiplayer-specific run-button hiding.
 * Programmer's name: Jonathan Johnston
 * Date the code was created: 2023-03-18
 * Dates the code was revised:
 *   - 2026-02-24: Added earlier prologue documentation (Carlos Mbendera)
 *   - 2026-03-20: Added multiplayer-aware UI behavior to hide Run button during matches (Jonathan Johnston)
 *   - 2026-03-29: Added AI Help button, restyled Run/Submit with icons and contrast (Carlos Mbendera)
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
// Written by Carlos with help from Claude
import React from "react";
import { BsChevronUp, BsPlayFill } from "react-icons/bs";
import { AiOutlineBulb, AiOutlineSend } from "react-icons/ai";

type EditorFooterProps = {
	handleRun: () => void;
	handleSubmit: () => void;
	running: boolean;
	submitting: boolean;
	isMultiplayer?: boolean;
	onToggleAIHelp?: () => void;
	aiHelpDisabled?: boolean;
};

const EditorFooter: React.FC<EditorFooterProps> = ({ handleRun, handleSubmit, running, submitting, isMultiplayer = false, onToggleAIHelp, aiHelpDisabled = false }) => {
	return (
		<div className='flex absolute bottom-0 z-10 w-full border-t border-dark-fill-3' style={{ backgroundColor: "#1e1e1e" }}>
			<div className='mx-5 my-[10px] flex justify-between w-full'>
				<div className='mr-2 flex flex-1 flex-nowrap items-center space-x-4'>
					<button className='px-3 py-1.5 font-medium items-center transition-all inline-flex bg-dark-fill-3 text-sm hover:bg-dark-fill-2 text-dark-label-2 rounded-lg pl-3 pr-2'>
						Console
						<div className='ml-1 transform transition flex items-center'>
							<BsChevronUp className='fill-gray-6 mx-1 fill-dark-gray-6' />
						</div>
					</button>
					{!aiHelpDisabled && onToggleAIHelp && (
						<button
							className='px-3 py-1.5 font-medium items-center transition-all inline-flex text-sm rounded-lg border border-yellow-600 text-yellow-400 hover:bg-yellow-900/30'
							onClick={onToggleAIHelp}
						>
							<AiOutlineBulb className='mr-1.5' />
							AI Help
						</button>
					)}
				</div>
				<div className='ml-auto flex items-center space-x-4'>
					{!isMultiplayer && (
						<button
							className='px-4 py-1.5 text-sm font-medium items-center whitespace-nowrap transition-all focus:outline-none inline-flex rounded-lg border border-green-600 text-green-400 hover:bg-green-900/30 disabled:opacity-40 disabled:cursor-not-allowed'
							onClick={handleRun}
							disabled={running || submitting}
						>
							<BsPlayFill className='mr-1.5' />
							{running ? "Running..." : "Run"}
						</button>
					)}
					<button
						className='px-4 py-1.5 font-medium items-center transition-all focus:outline-none inline-flex text-sm text-white bg-dark-green-s hover:bg-green-3 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed'
						onClick={handleSubmit}
						disabled={running || submitting}
					>
						<AiOutlineSend className='mr-1.5' />
						{submitting ? "Submitting..." : "Submit"}
					</button>
				</div>
			</div>
		</div>
	);
};
export default EditorFooter;
