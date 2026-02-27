# BeatCode

A LeetCode-style coding challenge platform built as a capstone project for EECS 582 (Spring 2026) at the University of Kansas.

The remote deployment is at https://beat-code-eta.vercel.app

**Built With:** React · Next.js 13 · TypeScript · TailwindCSS · Firebase
---

## Getting Started

Install dependencies:

```bash
npm install
```

Create a `.env.local` file at the project root with your Firebase project credentials:

```
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
```

> **NEVER push `.env.local` to remote.** The `.gitignore` already excludes it. For Firebase Console access, contact the project maintainer.

Start the development server:

```bash
npm run dev
```

Visit `http://localhost:3000`.

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the development server |
| `npm run build` | Build for production |
| `npm run start` | Serve the production build |
| `npm run lint` | Run ESLint |

## Firebase Setup

The app requires a Firebase project with:

- **Authentication** — Email/Password provider enabled
- **Firestore** — `problems` and `users` collections

**`problems` collection** documents must include: `id`, `title`, `category`, `difficulty`, `likes`, `dislikes`, `order` (integer for sorting), and optionally `videoId` (YouTube video ID) and `link` (external URL).

**`users` collection** documents are created automatically on signup and track arrays for `solvedProblems`, `likedProblems`, `dislikedProblems`, and `starredProblems`.

## Application Features

1. **Problem Browser** — Browse 100+ problems fetched from Firestore, displayed in order with difficulty color-coding
2. **Code Editor** — In-browser JavaScript editor (CodeMirror with VSCode dark theme) with adjustable font size
3. **Client-Side Code Execution** — Solutions run entirely in the browser via `new Function()` and validated with Node's `assert` library
4. **User Authentication** — Sign up, sign in, and password reset via Firebase Auth
5. **Progress Tracking** — Solved, liked, disliked, and starred problems persisted per user in Firestore
6. **Solution Videos** — YouTube walkthroughs embedded inline from the problem list

## Project Structure

```
src/
├── atoms/          # Recoil global state (auth modal only)
├── components/     # UI components organized by feature
│   ├── Modals/     # Auth modal views (Login, Signup, ResetPassword, Settings)
│   ├── Topbar/     # Shared navigation bar
│   ├── Workspace/  # Split-pane problem + editor layout
│   └── ...
├── firebase/       # Firebase client initialization
├── hooks/          # Shared React hooks
├── pages/          # Next.js pages (index, auth, problems/[pid])
└── utils/
    ├── problems/   # Full problem definitions with handler functions
    └── types/      # Shared TypeScript types
```
