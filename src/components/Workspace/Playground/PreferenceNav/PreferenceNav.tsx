/**
 * Artifact:             PreferenceNav.tsx
 * Description:          Toolbar above the code editor showing the active language,
 *                       a settings button, and a fullscreen toggle. Syncs fullscreen
 *                       icon state via vendor-prefixed fullscreenchange events.
 *
 * Programmer:           Burak Örkmez (original); Carlos Mbendera (EECS 582 adaptation)
 * Date Created:         2023-03-18
 * Revisions:
 *   2026-02-24          Added prologue comments (Carlos Mbendera)
 *
 * Preconditions:        Must run in a browser environment (uses document.fullscreenElement).
 *                       settings and setSettings must be provided by Playground.
 * Acceptable Input:     settings — ISettings with settingsModalIsOpen, dropdownIsOpen, fontSize;
 *                       setSettings — React dispatch for ISettings state.
 * Unacceptable Input:   null or undefined settings or setSettings.
 *
 * Postconditions:       SettingsModal is rendered when settings.settingsModalIsOpen is true.
 *                       isFullScreen always reflects the actual browser fullscreen state.
 * Return Values:        React JSX of the preference navigation bar.
 *
 * Error/Exception Conditions:
 *                       document.requestFullscreen() rejects (Promise) if permissions denied.
 *                       document.exitFullscreen() rejects if fullscreen is not currently active.
 * Side Effects:         Calls browser fullscreen APIs on button click.
 *                       Registers vendor-prefixed fullscreenchange listeners on mount.
 * Invariants:           isFullScreen reflects the true browser fullscreen state at all times.
 * Known Faults:         The fullscreenchange event listeners are never removed on unmount
 *                       (no cleanup return in useEffect), causing a potential memory leak.
 */

import { useState, useEffect } from "react";
import { AiOutlineFullscreen, AiOutlineFullscreenExit, AiOutlineSetting } from "react-icons/ai";
import { ISettings, JudgeLanguage, JudgeStatus } from "../Playground";
import SettingsModal from "@/components/Modals/SettingsModal";

type PreferenceNavProps = {
	settings: ISettings;
	setSettings: React.Dispatch<React.SetStateAction<ISettings>>;
	language: JudgeLanguage;
	setLanguage: (language: JudgeLanguage) => void;
	judgeStatus: JudgeStatus;
	checkingJudge: boolean;
	onCheckJudge: () => void;
};

const PreferenceNav: React.FC<PreferenceNavProps> = ({
	setSettings,
	settings,
	language,
	setLanguage,
	judgeStatus,
	checkingJudge,
	onCheckJudge,
}) => {
	const [isFullScreen, setIsFullScreen] = useState(false);

	/**
	 * Artifact:             handleFullScreen
	 * Description:          Toggles browser fullscreen on / off and flips the local
	 *                       isFullScreen flag to update the icon.
	 *
	 * Preconditions:        Must run in a browser with Fullscreen API support.
	 * Acceptable Input:     No parameters.
	 * Unacceptable Input:   N/A — called only by button click.
	 *
	 * Postconditions:       Browser enters or exits fullscreen; isFullScreen is toggled.
	 * Return Values:        void.
	 *
	 * Error/Exception Conditions:
	 *                       requestFullscreen / exitFullscreen may reject if called at the
	 *                       wrong time (e.g., outside a user gesture) — rejection is unhandled.
	 * Side Effects:         Calls document.documentElement.requestFullscreen() or
	 *                       document.exitFullscreen() depending on current state.
	 * Invariants:           isFullScreen is always the boolean inverse of its previous value.
	 * Known Faults:         None known.
	 */
	const handleFullScreen = () => {
		if (isFullScreen) {
			document.exitFullscreen();
		} else {
			document.documentElement.requestFullscreen();
		}
		setIsFullScreen(!isFullScreen);
	};

	useEffect(() => {
		function exitHandler(e: any) {
			if (!document.fullscreenElement) {
				setIsFullScreen(false);
				return;
			}
			setIsFullScreen(true);
		}

		if (document.addEventListener) {
			document.addEventListener("fullscreenchange", exitHandler);
			document.addEventListener("webkitfullscreenchange", exitHandler);
			document.addEventListener("mozfullscreenchange", exitHandler);
			document.addEventListener("MSFullscreenChange", exitHandler);
		}
	}, [isFullScreen]);

	return (
		<div className='flex items-center justify-between bg-dark-layer-2 h-11 w-full '>
			<div className='flex items-center text-white'>
				<div className='flex cursor-pointer items-center rounded focus:outline-none bg-dark-fill-3 text-dark-label-2 hover:bg-dark-fill-2 px-2 py-1.5 font-medium'>
					<select
						className='text-xs bg-transparent outline-none text-label-2 dark:text-dark-label-2 cursor-pointer'
						value={language}
						onChange={(e) => setLanguage(e.target.value as JudgeLanguage)}
					>
						<option value='javascript' className='bg-dark-layer-1 text-white'>
							JavaScript
						</option>
						<option value='python' className='bg-dark-layer-1 text-white'>
							Python
						</option>
						<option value='cpp' className='bg-dark-layer-1 text-white'>
							C++
						</option>
					</select>
				</div>
			</div>

			<div className='flex items-center m-2'>
				<button
					className={`px-2 py-1 text-xs rounded mr-2 ${
						judgeStatus === "ok"
							? "bg-dark-green-s text-white"
							: judgeStatus === "down"
							? "bg-dark-pink text-white"
							: "bg-dark-fill-3 text-dark-label-2"
					}`}
					onClick={onCheckJudge}
					disabled={checkingJudge}
				>
					{checkingJudge ? "Checking..." : judgeStatus === "ok" ? "Judge: Online" : "Judge: Check"}
				</button>
				<button
					className='preferenceBtn group'
					onClick={() => setSettings({ ...settings, settingsModalIsOpen: true })}
				>
					<div className='h-4 w-4 text-dark-gray-6 font-bold text-lg'>
						<AiOutlineSetting />
					</div>
					<div className='preferenceBtn-tooltip'>Settings</div>
				</button>

				<button className='preferenceBtn group' onClick={handleFullScreen}>
					<div className='h-4 w-4 text-dark-gray-6 font-bold text-lg'>
						{!isFullScreen ? <AiOutlineFullscreen /> : <AiOutlineFullscreenExit />}
					</div>
					<div className='preferenceBtn-tooltip'>Full Screen</div>
				</button>
			</div>
			{settings.settingsModalIsOpen && <SettingsModal settings={settings} setSettings={setSettings} />}
		</div>
	);
};
export default PreferenceNav;
