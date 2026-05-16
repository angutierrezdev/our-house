<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Our House - Household Task Management App

A modern, accessible household task management PWA built with React, TypeScript, and Tailwind CSS. Manage chores, track household members, and get AI-powered task suggestions using Google Gemini.

## Features

- **Task Management** — Create, track, and manage household tasks with priority levels and difficulty indicators
- **Kanban Board** — Visual drag-and-drop task board with To Do, In Progress, and Done columns
- **Household Members** — Manage family members with color-coded profiles, shareable invite codes, and QR-based device sync
- **AI Assistant** — AI-powered task suggestions powered by Google Gemini
- **Task Statistics** — Track completion rates and task metrics with charts
- **Progressive Web App** — Installable on mobile and desktop with offline support and automatic background updates
- **Cloud Sync** — Optional Firebase Firestore sync with offline-first localStorage fallback; last-write-wins conflict resolution
- **Multi-device Auth** — Email/password and Google sign-in, household invite system with 6-character codes

## Tech Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS 4
- **Routing**: React Router v7 (hash-based for PWA/GitHub Pages compatibility)
- **Build Tool**: Vite 6
- **Drag & Drop**: @hello-pangea/dnd
- **Charts**: Recharts
- **AI Integration**: Google Generative AI (Gemini)
- **Database**: Firebase Firestore (optional) + localStorage
- **Icons**: Lucide React

## Getting Started

### Prerequisites

- Node.js 18+
- A Firebase project (optional — app runs fully offline without it)
- A Google Gemini API key (optional — for AI task suggestions)

### Environment Variables

Create a `.env` file at the project root:

```env
# Optional — required for cloud sync and multi-device households
FIREBASE_API_KEY=
FIREBASE_AUTH_DOMAIN=
FIREBASE_PROJECT_ID=
FIREBASE_STORAGE_BUCKET=
FIREBASE_MESSAGING_SENDER_ID=
FIREBASE_APP_ID=

# Optional — required for AI task suggestions
GEMINI_API_KEY=
```

The app runs in offline-only mode if Firebase vars are absent.

### Run Locally

```bash
npm install
npm run dev      # http://localhost:3000/our-house/
npm run build    # production build → dist/
npm run preview  # preview production build locally
```

## Firebase Setup (Optional)

1. Create a Firestore database in your Firebase project
2. Deploy the security rules from `firestore.rules`
3. Enable **Email/Password** and **Google** as sign-in providers in Firebase Auth
4. Add your Firebase config to `.env` (see above)

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- iOS Safari 14+, Chrome Android

## License

MIT
