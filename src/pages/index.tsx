/**
 * Artifact:             pages/index.tsx
 * Description:          Home page with hero section, PvP battle cards, trending challenges,
 *                       and problems library using Kinetic Monolith design system.
 *
 * Programmer:           Carlos Mbendera (redesign)
 * Date Created:         2026-03-28
 *
 * Preconditions:        Firebase must be configured; Firestore "problems" collection must exist.
 * Acceptable Input:     N/A — no props; data is fetched client-side.
 * Unacceptable Input:   N/A
 *
 * Postconditions:       The home page is displayed with design tokens and new layout.
 * Return Values:        React JSX tree.
 *
 * Error/Exception Conditions:
 *                       Firestore fetch errors are handled silently.
 * Side Effects:         Triggers a Firestore query on mount via ProblemsTable.
 * Invariants:           None known.
 * Known Faults:         None known.
 */

import Topbar from "@/components/Topbar/Topbar";
import useHasMounted from "@/hooks/useHasMounted";
import Link from "next/link";

export default function Home() {
	const hasMounted = useHasMounted();

	if (!hasMounted) return null;

	const difficultyOptions = ["All", "Easy", "Medium", "Hard"];

	return (
		<>
			<main className='min-h-screen' style={{ background: "linear-gradient(to bottom, var(--surface), var(--surface-container-lowest))" }}>
				<Topbar />

				{/* HERO SECTION */}
				<section className='relative min-h-[600px] lg:min-h-[700px] flex items-center px-6 md:px-12 lg:px-24 pt-16 overflow-hidden'>
					{/* Decorative blur elements */}
					<div className='absolute top-1/4 -right-32 w-96 h-96 rounded-full blur-3xl opacity-20' style={{ background: 'var(--primary)' }}></div>
					<div className='absolute bottom-1/4 -left-32 w-96 h-96 rounded-full blur-3xl opacity-10' style={{ background: 'var(--tertiary)' }}></div>

					<div className='relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-12 w-full max-w-7xl mx-auto'>
						{/* Left Column: Text & CTA */}
						<div className='lg:col-span-7 flex flex-col justify-center'>
							<h1 className='text-5xl md:text-7xl font-black tracking-tight leading-tight text-on-surface mb-8'>
								Logic is the <br />
								<span className='italic' style={{ color: 'var(--primary)' }}>Kinetic</span> Fuel.
							</h1>

							<p className='text-on-surface-variant text-lg max-w-xl mb-12 leading-relaxed'>
								The elite competitive arena for developers. Solve complex algorithmic challenges, battle in real-time PvP, and benchmark your cognitive performance.
							</p>

							{/* CTAs */}
							<div className='flex flex-wrap gap-6 mb-16'>
								<Link href='/problems'>
									<button className='px-10 py-4 rounded-xl font-bold text-lg transition-all active:scale-95' style={{ background: 'linear-gradient(135deg, var(--primary), var(--primary-container))', color: 'var(--on-primary-container)' }}>
										Start Coding
									</button>
								</Link>
							</div>
						</div>

						{/* Right Column: Code Preview */}
						{/* <div className='lg:col-span-5 hidden lg:flex justify-center items-center'>
							<div className='w-full max-w-sm p-1 rounded-xl border' style={{ background: 'rgba(53, 53, 53, 0.6)', backdropFilter: 'blur(20px)', borderColor: 'rgba(70, 69, 84, 0.15)' }}>
								<div className='p-6 rounded-lg' style={{ background: 'var(--surface-container-lowest)' }}>
									<div className='flex gap-2 mb-4'>
										<div className='w-3 h-3 rounded-full opacity-40' style={{ background: 'var(--error)' }}></div>
										<div className='w-3 h-3 rounded-full opacity-40' style={{ background: 'var(--secondary)' }}></div>
										<div className='w-3 h-3 rounded-full opacity-40' style={{ background: 'var(--tertiary)' }}></div>
									</div>
									<pre className='font-mono text-xs leading-relaxed' style={{ color: 'var(--on-surface-variant)' }}>
										<span style={{ color: 'var(--primary)' }}>class</span> <span style={{ color: 'var(--tertiary)' }}>Solution</span> {'{'}
										<br />
										{"  "}
										<span style={{ color: 'var(--secondary)' }}>solve</span>(problem) {'{'}
										<br />
										{"    "}
										<span style={{ color: 'var(--primary)' }}>const</span> result = <span style={{ color: 'var(--secondary)' }}>optimize</span>();
										<br />
										{"    return result.isAccepted();"}
										<br />
										{"  }"}
										<br />
										{'}'}
									</pre>
								</div>
							</div>
						</div> */}
					</div>
				</section>

				{/* PVP SECTION */}
				<section className='py-20 md:py-32 px-6 md:px-12 lg:px-24' style={{ background: 'var(--surface-container-low)' }}>
					<div className='max-w-7xl mx-auto'>
						<div className='mb-16'>
							<span className='text-xs font-bold uppercase tracking-widest mb-4 block' style={{ color: 'var(--primary)' }}>
								Engineered Conflict
							</span>
							<h2 className='text-4xl font-bold text-on-surface'>PvP Live Battle</h2>
							<p className='text-on-surface-variant text-lg mt-4'>Synchronized logic duels. Two engineers, one problem, infinite permutations.</p>
						</div>

						<div className='grid grid-cols-1 md:grid-cols-3 gap-8'>
							{/* Card 1 */}
							<div className='p-8 rounded-xl border' style={{ background: 'var(--surface-container)', borderColor: 'rgba(70, 69, 84, 0.1)' }}>
								<span className='material-symbols-outlined block text-4xl mb-6' style={{ color: 'var(--primary)' }}>swords</span>
								<h3 className='text-xl font-bold text-on-surface mb-3'>Instant Match</h3>
								<p className='text-on-surface-variant text-sm leading-relaxed mb-6'>Get matched with an opponent of equal skill within seconds.</p>
								<div className='h-1 w-full rounded-full' style={{ background: 'var(--surface-container-highest)' }}>
									<div className='h-full w-2/3 rounded-full' style={{ background: 'var(--tertiary)' }}></div>
								</div>
							</div>

							{/* Card 2 */}
							<div className='p-8 rounded-xl border' style={{ background: 'var(--surface-container)', borderColor: 'rgba(70, 69, 84, 0.1)' }}>
								<span className='material-symbols-outlined block text-4xl mb-6' style={{ color: 'var(--secondary)' }}>Ranked</span>
								<h3 className='text-xl font-bold text-on-surface mb-3'>Ranked Ladders</h3>
								<p className='text-on-surface-variant text-sm leading-relaxed mb-6'>Climb seasonal tiers from Bronze to Diamond and reach the legend hall.</p>
								<div className='h-1 w-full rounded-full' style={{ background: 'var(--surface-container-highest)' }}>
									<div className='h-full w-1/2 rounded-full' style={{ background: 'var(--secondary)' }}></div>
								</div>
							</div>

							{/* Card 3 */}
							<div className='p-8 rounded-xl border' style={{ background: 'var(--surface-container)', borderColor: 'rgba(70, 69, 84, 0.1)' }}>
								<span className='material-symbols-outlined block text-4xl mb-6' style={{ color: 'var(--tertiary)' }}>Proximity Chat</span>
								<h3 className='text-xl font-bold text-on-surface mb-3'>Live Chat</h3>
								<p className='text-on-surface-variant text-sm leading-relaxed mb-6'>Bully your opponents in real-time chat.</p>
								<div className='h-1 w-full rounded-full' style={{ background: 'var(--surface-container-highest)' }}>
									<div className='h-full w-4/5 rounded-full' style={{ background: 'var(--primary)' }}></div>
								</div>
							</div>
						</div>
					</div>
				</section>

				{/* CTA SECTION */}
				<section className='py-20 md:py-32 px-6 md:px-12 lg:px-24 relative overflow-hidden' style={{ background: 'linear-gradient(135deg, var(--primary), var(--primary-container))' }}>
					<div className='max-w-4xl mx-auto text-center relative z-10'>
						<h2 className='text-4xl md:text-6xl font-black tracking-tight mb-8 text-on-primary-container'>
							READY TO BREACH THE CORE?
						</h2>
						<p className='text-On-primary-container opacity-80 text-lg font-medium mb-12'>
							Join the global elite in the most demanding competitive environment ever built for software engineers.
						</p>
						<Link href='/problems'>
							<button className='px-12 py-5 rounded-xl font-black text-lg active:scale-95 transition-transform shadow-xl' style={{ background: 'var(--on-primary-container)', color: 'var(--primary)' }}>
								START CODING
							</button>
						</Link>
					</div>
				</section>
			</main>
		</>
	);
}
