// Written by Carlos with help from Claude
/**
 * Name of code artifact: AIHelpPanel.tsx
 * Brief description: Slide-up overlay panel providing tiered AI assistance (hint/guide/explain) with conversation history.
 * Programmer's name: Carlos Mbendera
 * Date the code was created: 2026-03-29
 * Dates the code was revised: N/A
 * Brief description of each revision & author: N/A
 * Preconditions: Parent provides AI help state, callbacks, and tier availability flags.
 * Acceptable and unacceptable input values or types, and their meanings:
 *   - Acceptable: isOpen boolean, message array, tier availability booleans, callback functions.
 *   - Unacceptable: N/A — pure display/interaction component.
 * Postconditions: Renders the AI help chat panel when open.
 * Return values or types, and their meanings: React JSX (null when closed).
 * Error and exception condition values or types that can occur, and their meanings: None.
 * Side effects: Calls onRequestHelp and onClose callbacks.
 * Invariants: Panel is only visible when isOpen is true.
 * Any known faults: None.
 */
import React, { useState, useRef, useEffect } from "react";
import { AiOutlineClose, AiOutlineBulb, AiOutlineCompass, AiOutlineRead } from "react-icons/ai";
import type { AIHelpTier, AIHelpMessage } from "@/utils/types/ai";

type AIHelpPanelProps = {
	isOpen: boolean;
	onClose: () => void;
	messages: AIHelpMessage[];
	onRequestHelp: (tier: AIHelpTier, followUp?: string) => void;
	loading: boolean;
	error: string | null;
	hintAvailable: boolean;
	guideAvailable: boolean;
	explainAvailable: boolean;
};

const TIER_CONFIG: Record<AIHelpTier, { label: string; icon: React.ReactNode; lockReason: string }> = {
	hint: {
		label: "Hint",
		icon: <AiOutlineBulb className='w-4 h-4' />,
		lockReason: "Edit your code first to unlock hints",
	},
	guide: {
		label: "Guide",
		icon: <AiOutlineCompass className='w-4 h-4' />,
		lockReason: "Unlocks after a failed Run or Submit",
	},
	explain: {
		label: "Explain",
		icon: <AiOutlineRead className='w-4 h-4' />,
		lockReason: "Unlocks after a failed Submit",
	},
};

// Written by Carlos with help from Claude
/** Renders a markdown string with support for code blocks, inline code, bold, and italic. */
function renderMarkdown(text: string): React.ReactNode {
	const parts: React.ReactNode[] = [];
	// Split on fenced code blocks first: ```lang\ncode\n```
	const codeBlockRegex = /```(\w*)\n?([\s\S]*?)```/g;
	let lastIndex = 0;
	let match: RegExpExecArray | null;

	while ((match = codeBlockRegex.exec(text)) !== null) {
		// Render text before this code block
		if (match.index > lastIndex) {
			parts.push(<span key={`t-${lastIndex}`}>{renderInlineMarkdown(text.slice(lastIndex, match.index))}</span>);
		}
		// Render the code block
		parts.push(
			<pre
				key={`cb-${match.index}`}
				className='my-2 p-3 rounded-lg overflow-x-auto text-xs leading-relaxed'
				style={{ backgroundColor: "#1a1a2e" }}
			>
				<code>{match[2]}</code>
			</pre>
		);
		lastIndex = match.index + match[0].length;
	}

	// Remaining text after last code block
	if (lastIndex < text.length) {
		parts.push(<span key={`t-${lastIndex}`}>{renderInlineMarkdown(text.slice(lastIndex))}</span>);
	}

	return parts.length > 0 ? parts : text;
}

/** Renders inline markdown: **bold**, *italic*, `inline code` */
function renderInlineMarkdown(text: string): React.ReactNode {
	const inlineRegex = /(\*\*(.+?)\*\*|\*(.+?)\*|`([^`]+)`)/g;
	const parts: React.ReactNode[] = [];
	let lastIndex = 0;
	let match: RegExpExecArray | null;

	while ((match = inlineRegex.exec(text)) !== null) {
		if (match.index > lastIndex) {
			parts.push(text.slice(lastIndex, match.index));
		}
		if (match[2]) {
			// **bold**
			parts.push(<strong key={`b-${match.index}`} className='font-semibold text-white'>{match[2]}</strong>);
		} else if (match[3]) {
			// *italic*
			parts.push(<em key={`i-${match.index}`}>{match[3]}</em>);
		} else if (match[4]) {
			// `inline code`
			parts.push(
				<code key={`c-${match.index}`} className='px-1 py-0.5 rounded text-xs text-green-300' style={{ backgroundColor: "#2d2d2d" }}>
					{match[4]}
				</code>
			);
		}
		lastIndex = match.index + match[0].length;
	}

	if (lastIndex < text.length) {
		parts.push(text.slice(lastIndex));
	}

	return parts.length > 0 ? parts : text;
}

const AIHelpPanel: React.FC<AIHelpPanelProps> = ({
	isOpen,
	onClose,
	messages,
	onRequestHelp,
	loading,
	error,
	hintAvailable,
	guideAvailable,
	explainAvailable,
}) => {
	const [followUpText, setFollowUpText] = useState("");
	const [activeTier, setActiveTier] = useState<AIHelpTier>("hint");
	const messagesEndRef = useRef<HTMLDivElement>(null);

	const tierAvailability: Record<AIHelpTier, boolean> = {
		hint: hintAvailable,
		guide: guideAvailable,
		explain: explainAvailable,
	};

	useEffect(() => {
		messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
	}, [messages]);

	if (!isOpen) return null;

	const handleTierClick = (tier: AIHelpTier) => {
		if (!tierAvailability[tier] || loading) return;
		setActiveTier(tier);
		onRequestHelp(tier);
	};

	const handleFollowUp = () => {
		if (!followUpText.trim() || loading) return;
		onRequestHelp(activeTier, followUpText.trim());
		setFollowUpText("");
	};

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault();
			handleFollowUp();
		}
	};

	return (
		<div className='absolute bottom-[50px] right-0 w-full max-w-md z-20 border border-dark-fill-3 rounded-t-lg shadow-2xl flex flex-col' style={{ maxHeight: "70vh", backgroundColor: "#1e1e1e" }}>
			{/* Header */}
			<div className='flex items-center justify-between px-4 py-2 border-b border-dark-fill-3'>
				<div className='flex items-center gap-2'>
					<AiOutlineBulb className='w-4 h-4 text-yellow-400' />
					<span className='text-sm font-semibold text-white'>AI Help</span>
				</div>
				<button onClick={onClose} className='text-gray-400 hover:text-white transition-colors'>
					<AiOutlineClose className='w-4 h-4' />
				</button>
			</div>

			{/* Tier buttons */}
			<div className='flex gap-2 px-4 py-2 border-b border-dark-fill-3'>
				{(Object.keys(TIER_CONFIG) as AIHelpTier[]).map((tier) => {
					const config = TIER_CONFIG[tier];
					const available = tierAvailability[tier];
					const isActive = activeTier === tier;

					return (
						<div key={tier} className='relative group'>
							<button
								onClick={() => handleTierClick(tier)}
								disabled={!available || loading}
								className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-all
									${
										!available
											? "bg-dark-fill-3 text-gray-600 cursor-not-allowed"
											: isActive
											? "bg-dark-green-s text-white"
											: "bg-dark-fill-3 text-gray-300 hover:bg-dark-fill-2 hover:text-white"
									}`}
							>
								{config.icon}
								{config.label}
							</button>
							{/* Tooltip for locked tiers */}
							{!available && (
								<div className='absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-gray-800 text-gray-300 text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none'>
									{config.lockReason}
								</div>
							)}
						</div>
					);
				})}
			</div>

			{/* Messages area */}
			<div className='flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-[120px]'>
				{messages.length === 0 && !loading && (
					<p className='text-gray-500 text-xs text-center mt-4'>
						Select a tier above to get AI assistance with your code.
					</p>
				)}
				{messages.map((msg, i) => (
					<div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
						<div
							className={`max-w-[85%] px-3 py-2 rounded-lg text-sm ${
								msg.role === "user"
									? "bg-dark-fill-3 text-gray-200"
									: "bg-dark-layer-1 text-gray-100 border border-dark-fill-3"
							}`}
						>
							<div className='whitespace-pre-wrap font-sans text-sm leading-relaxed'>{msg.role === "assistant" ? renderMarkdown(msg.content) : msg.content}</div>
						</div>
					</div>
				))}
				{loading && (
					<div className='flex justify-start'>
						<div className='bg-dark-layer-1 border border-dark-fill-3 px-3 py-2 rounded-lg'>
							<div className='flex items-center gap-2 text-sm text-gray-400'>
								<svg className='animate-spin h-3 w-3' viewBox='0 0 24 24'>
									<circle className='opacity-25' cx='12' cy='12' r='10' stroke='currentColor' strokeWidth='4' fill='none' />
									<path className='opacity-75' fill='currentColor' d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z' />
								</svg>
								Thinking...
							</div>
						</div>
					</div>
				)}
				{error && <p className='text-xs text-red-400'>Error: {error}</p>}
				<div ref={messagesEndRef} />
			</div>

			{/* Follow-up input */}
			{messages.length > 0 && (
				<div className='px-4 py-2 border-t border-dark-fill-3'>
					<div className='flex gap-2'>
						<input
							type='text'
							value={followUpText}
							onChange={(e) => setFollowUpText(e.target.value)}
							onKeyDown={handleKeyDown}
							placeholder='Ask a follow-up question...'
							disabled={loading}
							className='flex-1 text-white text-sm px-3 py-1.5 rounded border border-gray-600 focus:border-blue-500 focus:outline-none placeholder-gray-500 disabled:opacity-50'
							style={{ backgroundColor: "#2d2d2d" }}
						/>
						<button
							onClick={handleFollowUp}
							disabled={!followUpText.trim() || loading}
							className='px-3 py-1.5 bg-dark-green-s text-white text-sm rounded hover:bg-green-3 disabled:opacity-50 disabled:cursor-not-allowed transition-colors'
						>
							Send
						</button>
					</div>
				</div>
			)}
		</div>
	);
};

export default AIHelpPanel;
