/** @type {import('tailwindcss').Config} */
module.exports = {
	content: [
		"./app/**/*.{js,ts,jsx,tsx}",
		"./pages/**/*.{js,ts,jsx,tsx}",
		"./components/**/*.{js,ts,jsx,tsx}",

		// Or if using `src` directory:
		"./src/**/*.{js,ts,jsx,tsx}",
	],
	theme: {
		extend: {
			colors: {
				// Kinetic Monolith palette (design tokens)
				"surface": "#131313",
				"surface-container-low": "#1C1B1B",
				"surface-container": "#20201F",
				"surface-container-high": "#2A2A2A",
				"surface-container-highest": "#353535",
				"surface-container-lowest": "#0E0E0E",
				"surface-variant": "#353535",
				"primary": "#C0C1FF",
				"primary-container": "#8083FF",
				"on-primary-container": "#0D0096",
				"on-surface": "#E5E2E1",
				"on-surface-variant": "#C7C4D7",
				"outline-variant": "#464554",
				"surface-tint": "#C0C1FF",
				"tertiary": "#4EDE3",
				"secondary": "#FFDB9D",
				"error": "#FFB4AB",
				"error-container": "#93000A",
				"tertiary-fixed": "#6FFBBE",
				"tertiary-container": "#00885D",
			},
			fontFamily: {
				headline: ["Inter", "system-ui", "sans-serif"],
				body: ["Inter", "system-ui", "sans-serif"],
				label: ["Inter", "system-ui", "sans-serif"],
				mono: ["Fira Code", "ui-monospace", "SFMono-Regular", "monospace"],
			},
			borderRadius: {
				DEFAULT: '0.125rem',
				lg: '0.5rem',
				xl: '0.5rem',
				full: '0.75rem',
			},
		},
	},
	plugins: [],
};
