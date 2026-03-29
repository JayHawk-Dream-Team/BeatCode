// Written by Carlos with help from Claude
/**
 * Name of code artifact: ComplexityPanel.tsx
 * Brief description: Displays Big-O complexity analysis results (time, space, recursion, worst-case path).
 * Programmer's name: Carlos Mbendera
 * Date the code was created: 2026-03-29
 * Dates the code was revised: N/A
 * Brief description of each revision & author: N/A
 * Preconditions: Receives analysis data, loading state, and error from parent.
 * Acceptable and unacceptable input values or types, and their meanings:
 *   - Acceptable: ComplexityAnalysis object or null, boolean loading, string error or null.
 *   - Unacceptable: N/A — pure display component.
 * Postconditions: Renders analysis results or loading/error states.
 * Return values or types, and their meanings: React JSX.
 * Error and exception condition values or types that can occur, and their meanings: None — display only.
 * Side effects: None.
 * Invariants: None.
 * Any known faults: None.
 */
import React from "react";
import type { ComplexityAnalysis } from "@/utils/types/ai";

type ComplexityPanelProps = {
	analysis: ComplexityAnalysis | null;
	loading: boolean;
	error: string | null;
};

function complexityColor(c: string): string {
	if (c === "O(1)" || c === "O(log n)") return "bg-green-600 text-green-100";
	if (c === "O(n)" || c === "O(n log n)") return "bg-yellow-600 text-yellow-100";
	if (c === "O(n^2)" || c === "O(n^3)") return "bg-orange-600 text-orange-100";
	if (c === "O(2^n)" || c === "O(n!)") return "bg-red-600 text-red-100";
	return "bg-gray-600 text-gray-100";
}

const ComplexityPanel: React.FC<ComplexityPanelProps> = ({ analysis, loading, error }) => {
	if (loading) {
		return (
			<div className='flex items-center gap-2 p-4 text-sm text-gray-400'>
				<svg className='animate-spin h-4 w-4 text-gray-400' viewBox='0 0 24 24'>
					<circle className='opacity-25' cx='12' cy='12' r='10' stroke='currentColor' strokeWidth='4' fill='none' />
					<path className='opacity-75' fill='currentColor' d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z' />
				</svg>
				Analyzing complexity...
			</div>
		);
	}

	if (error) {
		return <p className='p-4 text-sm text-red-400'>Complexity analysis failed: {error}</p>;
	}

	if (!analysis) {
		return <p className='p-4 text-sm text-gray-500'>Submit a correct solution to see complexity analysis.</p>;
	}

	return (
		<div className='p-4 space-y-4 text-sm text-white'>
			{/* Complexity badges */}
			<div className='flex items-center gap-3'>
				<div className='flex items-center gap-2'>
					<span className='text-gray-400'>Time:</span>
					<span className={`px-2 py-0.5 rounded text-xs font-semibold ${complexityColor(analysis.timeComplexity)}`}>
						{analysis.timeComplexity}
					</span>
				</div>
				<div className='flex items-center gap-2'>
					<span className='text-gray-400'>Space:</span>
					<span className={`px-2 py-0.5 rounded text-xs font-semibold ${complexityColor(analysis.spaceComplexity)}`}>
						{analysis.spaceComplexity}
					</span>
				</div>
			</div>

			{/* Worst-case path */}
			<div>
				<p className='font-medium text-gray-300 mb-1'>Worst-Case Path</p>
				<p className='text-gray-400'>{analysis.worstCasePath}</p>
			</div>

			{/* Recursion analysis */}
			{analysis.recursionAnalysis?.hasRecursion && (
				<div>
					<p className='font-medium text-gray-300 mb-1'>Recursion Analysis</p>
					<div className='space-y-1 text-gray-400'>
						{analysis.recursionAnalysis.baseCase && (
							<p>
								<span className='text-gray-500'>Base case:</span> {analysis.recursionAnalysis.baseCase}
							</p>
						)}
						{analysis.recursionAnalysis.recurrenceRelation && (
							<p>
								<span className='text-gray-500'>Recurrence:</span>{" "}
								<code className='bg-dark-fill-3 px-1 rounded'>{analysis.recursionAnalysis.recurrenceRelation}</code>
							</p>
						)}
						{analysis.recursionAnalysis.estimatedDepth && (
							<p>
								<span className='text-gray-500'>Stack depth:</span> {analysis.recursionAnalysis.estimatedDepth}
							</p>
						)}
						{analysis.recursionAnalysis.issues.length > 0 && (
							<div className='mt-1'>
								<span className='text-amber-400 font-medium'>Issues:</span>
								<ul className='list-disc list-inside ml-2'>
									{analysis.recursionAnalysis.issues.map((issue, i) => (
										<li key={i} className='text-amber-300'>
											{issue}
										</li>
									))}
								</ul>
							</div>
						)}
					</div>
				</div>
			)}

			{/* Reasoning */}
			<div>
				<p className='font-medium text-gray-300 mb-1'>Reasoning</p>
				<p className='text-gray-400'>{analysis.reasoning}</p>
			</div>
		</div>
	);
};

export default ComplexityPanel;
