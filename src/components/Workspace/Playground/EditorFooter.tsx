/**
 * Artifact:             EditorFooter.tsx
 * Description:          Sticky footer bar at the bottom of the Playground panel containing
 *                       a decorative Console toggle and the Run / Submit action buttons.
 *
 * Programmer:           Burak Örkmez (original); Carlos Mbendera (EECS 582 adaptation)
 * Date Created:         2023-03-18
 * Revisions:
 *   2026-02-24          Added prologue comments (Carlos Mbendera)
 *
 * Preconditions:        handleSubmit must be a callable function provided by Playground.
 * Acceptable Input:     handleSubmit — async function with no parameters that triggers
 *                       code extraction, execution, and Firestore update on success.
 * Unacceptable Input:   null or undefined handleSubmit.
 *
 * Postconditions:       Clicking Run or Submit invokes handleSubmit.
 * Return Values:        React JSX of the footer bar.
 *
 * Error/Exception Conditions:
 *                       Errors thrown by handleSubmit are caught and handled inside Playground.
 * Side Effects:         Calls handleSubmit on button click, which may write to Firestore.
 * Invariants:           Both Run and Submit call the same handleSubmit function; there is
 *                       no behavioral distinction between the two buttons.
 * Known Faults:         The Console button does not open a real console; it is decorative only.
 */

import React from "react";
import { BsChevronUp } from "react-icons/bs";

type EditorFooterProps = {
	handleSubmit: () => void;
};

const EditorFooter: React.FC<EditorFooterProps> = ({ handleSubmit }) => {
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
					<button
						className='px-3 py-1.5 text-sm font-medium items-center whitespace-nowrap transition-all focus:outline-none inline-flex bg-dark-fill-3  hover:bg-dark-fill-2 text-dark-label-2 rounded-lg'
						onClick={handleSubmit}
					>
						Run
					</button>
					<button
						className='px-3 py-1.5 font-medium items-center transition-all focus:outline-none inline-flex text-sm text-white bg-dark-green-s hover:bg-green-3 rounded-lg'
						onClick={handleSubmit}
					>
						Submit
					</button>
				</div>
			</div>
		</div>
	);
};
export default EditorFooter;
