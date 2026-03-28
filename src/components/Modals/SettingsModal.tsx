/**
 * Artifact:             SettingsModal.tsx
 * Description:          Modal dialog for configuring code editor preferences — currently
 *                       exposes font size selection, persisted to localStorage.
 *
 * Programmer:           Burak Örkmez (original); Carlos Mbendera (EECS 582 adaptation)
 * Date Created:         2023-03-18
 * Revisions:
 *   2026-02-24          Added prologue comments (Carlos Mbendera)
 *
 * Preconditions:        settings and setSettings must be provided by Playground.
 *                       localStorage must be accessible (useLocalStorage is SSR-safe).
 * Acceptable Input:     settings — ISettings object; setSettings — React dispatch function;
 *                       font size selections must be values within EDITOR_FONT_SIZES.
 * Unacceptable Input:   null or undefined settings or setSettings; font sizes outside
 *                       the EDITOR_FONT_SIZES list.
 *
 * Postconditions:       Selected font size is applied to CodeMirror via shared ISettings
 *                       and persisted to localStorage under key "beatcode-fontSize".
 * Return Values:        React JSX of the settings modal dialog.
 *
 * Error/Exception Conditions:
 *                       localStorage write errors are caught internally by useLocalStorage.
 * Side Effects:         Writes selected font size to localStorage on each font selection.
 *                       Updates shared ISettings state, immediately affecting the editor.
 * Invariants:           EDITOR_FONT_SIZES is fixed as ["12px" .. "18px"] at module load.
 * Known Faults:         None known.
 */

import { BsCheckLg, BsChevronDown } from "react-icons/bs";
import { IoClose } from "react-icons/io5";
import { ISettings } from "../Workspace/Playground/Playground";
import useLocalStorage from "@/hooks/useLocalStorage";

const EDITOR_FONT_SIZES = ["12px", "13px", "14px", "15px", "16px", "17px", "18px"];

interface SettingsModalProps {
	settings: ISettings;
	setSettings: React.Dispatch<React.SetStateAction<ISettings>>;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ setSettings, settings }) => {
	const [fontSize, setFontSize] = useLocalStorage("beatcode-fontSize", "16px");

	/**
	 * Artifact:             handleClickDropdown
	 * Description:          Toggles the font size dropdown visibility while stopping event
	 *                       propagation to prevent the modal backdrop from closing.
	 *
	 * Preconditions:        settings state must be initialized.
	 * Acceptable Input:     e — React MouseEvent from the dropdown toggle button click.
	 * Unacceptable Input:   N/A — called only by button click.
	 *
	 * Postconditions:       settings.dropdownIsOpen is toggled to its boolean inverse.
	 * Return Values:        void.
	 *
	 * Error/Exception Conditions:
	 *                       None.
	 * Side Effects:         Calls e.stopPropagation() to prevent backdrop click handler.
	 *                       Updates settings state via setSettings.
	 * Invariants:           dropdownIsOpen is always a boolean.
	 * Known Faults:         None known.
	 */
	const handleClickDropdown = (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
		e.stopPropagation();
		setSettings({ ...settings, dropdownIsOpen: !settings.dropdownIsOpen });
	};
	return (
		<div className='z-40'>
			<div aria-modal='true' role='dialog' className='fixed inset-0 overflow-y-auto z-modal'>
				<div className='flex min-h-screen items-center justify-center px-4'>
					{/* overlay */}
					<div
						className='opacity-100'
						onClick={() => setSettings({ ...settings, settingsModalIsOpen: false })}
					>
						<div className='fixed inset-0 bg-black/40 backdrop-blur-sm' style={{ background: "rgba(0, 0, 0, 0.4)" }}></div>
					</div>

					<div className='my-8 inline-block min-w-full transform rounded-lg text-left transition-all md:min-w-[420px] shadow-xl p-0 w-[600px] !overflow-visible opacity-100 scale-100' style={{ background: "var(--surface-container-highest)" }}>
						{/* setting header */}
						<div className='flex items-center border-b px-5 py-4 text-lg font-bold text-on-surface' style={{ borderColor: "rgba(70, 69, 84, 0.15)" }}>
							Settings
							<button
								className='ml-auto cursor-pointer rounded transition-all text-on-surface-variant hover:text-on-surface'
								onClick={() => setSettings({ ...settings, settingsModalIsOpen: false })}
							>
								<IoClose size={24} />
							</button>
						</div>

						<div className='px-6 pt-4 pb-6'>
							<div className='mt-6 flex justify-between first:mt-0'>
								<div className='w-[340px]'>
									<h3 className='text-base font-bold text-on-surface'>Font size</h3>
									<h3 className='text-sm text-on-surface-variant mt-1.5'>
										Choose your preferred font size for the code editor.
									</h3>
								</div>
								<div className='w-[170px]'>
									<div className='relative'>
										<button
											onClick={handleClickDropdown}
											className='flex cursor-pointer items-center rounded-lg px-4 py-2 text-left focus:outline-none whitespace-nowrap active:scale-[0.98] w-full justify-between font-bold text-on-surface transition-all'
											type='button'
											style={{ background: "var(--surface-container)" }}
										>
											{fontSize}
											<BsChevronDown />
										</button>
										{/* Show dropdown for fontsizes */}
										{settings.dropdownIsOpen && (
											<ul
												className='absolute mt-1 max-h-56 overflow-auto rounded-lg p-2 z-50 focus:outline-none shadow-xl w-full'
												style={{
													background: "var(--surface-container-high)",
													filter: "drop-shadow(rgba(0, 0, 0, 0.04) 0px 1px 3px) drop-shadow(rgba(0, 0, 0, 0.12) 0px 6px 16px)",
												}}
											>
												{EDITOR_FONT_SIZES.map((fontSize, idx) => (
													<SettingsListItem
														key={idx}
														fontSize={fontSize}
														selectedOption={settings.fontSize}
														handleFontSizeChange={(fontSize) => {
															setFontSize(fontSize);
															setSettings({ ...settings, fontSize: fontSize });
														}}
													/>
												))}
											</ul>
										)}
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
};
export default SettingsModal;

interface SettingsListItemProps {
	fontSize: string;
	selectedOption: string;
	handleFontSizeChange: (fontSize: string) => void;
}

/**
 * Artifact:             SettingsListItem
 * Description:          Single font size option in the settings dropdown — highlighted with
 *                       a checkmark when it matches the currently active font size.
 *
 * Preconditions:        fontSize, selectedOption, and handleFontSizeChange must be provided.
 * Acceptable Input:     fontSize — string from EDITOR_FONT_SIZES; selectedOption — current
 *                       active font size string; handleFontSizeChange — callback function.
 * Unacceptable Input:   null or undefined fontSize, selectedOption, or handleFontSizeChange.
 *
 * Postconditions:       Clicking the item calls handleFontSizeChange(fontSize).
 * Return Values:        React JSX of a single list item with conditional checkmark.
 *
 * Error/Exception Conditions:
 *                       None.
 * Side Effects:         Calls handleFontSizeChange on click, updating localStorage and state.
 * Invariants:           Checkmark is visible only when fontSize === selectedOption.
 * Known Faults:         None known.
 */
const SettingsListItem: React.FC<SettingsListItemProps> = ({ fontSize, selectedOption, handleFontSizeChange }) => {
	return (
		<li className='relative flex h-8 cursor-pointer select-none py-1.5 pl-2 text-sm rounded-lg transition-all' style={{ color: selectedOption === fontSize ? "var(--primary)" : "var(--on-surface-variant)", background: selectedOption === fontSize ? "var(--surface-container-highest)" : "transparent" }}>
			<div
				className={`flex h-5 flex-1 items-center pr-2 ${selectedOption === fontSize ? "font-bold" : ""}`}
				onClick={() => handleFontSizeChange(fontSize)}
			>
				<div className='whitespace-nowrap'>{fontSize}</div>
			</div>
			<span
				className={`flex items-center pr-2 transition-all ${
					selectedOption === fontSize ? "visible opacity-100" : "invisible opacity-0"
				}`}
			>
				<BsCheckLg />
			</span>
		</li>
	);
};
