/**
 * Animated pill-shaped placeholder shown while problem metadata loads.
 *
 * Used alongside CircleSkeleton in ProblemDescription to fill the difficulty
 * and action button row during the Firestore fetch.
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
