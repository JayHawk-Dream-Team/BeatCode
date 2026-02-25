/**
 * Artifact:             RectangleSkeleton.tsx
 * Description:          Animated pill-shaped pulse placeholder rendered while Firestore
 *                       problem metadata loads inside ProblemDescription.
 *
 * Programmer:           Burak Örkmez (original); Carlos Mbendera (EECS 582 adaptation)
 * Date Created:         2023-03-18
 * Revisions:
 *   2026-02-24          Added prologue comments (Carlos Mbendera)
 *
 * Preconditions:        Tailwind CSS animate-pulse utility class must be configured.
 * Acceptable Input:     No props.
 * Unacceptable Input:   N/A
 *
 * Postconditions:       A pulsing pill-shaped placeholder (h-6 w-12) is rendered in the DOM.
 * Return Values:        React JSX of the rectangle skeleton element.
 *
 * Error/Exception Conditions:
 *                       None.
 * Side Effects:         None.
 * Invariants:           Fixed size — does not respond to prop or content changes.
 * Known Faults:         None known.
 */

import React from "react";

const RectangleSkeleton: React.FC = () => {
	return (
		<div className='space-y-2.5 animate-pulse'>
			<div className='flex items-center w-full space-x-2'>
				<div className='h-6 w-12 rounded-full bg-dark-fill-3'></div>
			</div>
		</div>
	);
};
export default RectangleSkeleton;
