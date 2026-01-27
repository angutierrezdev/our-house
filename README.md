<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Our House - Household Task Management App

A modern, accessible household task management application built with React, TypeScript, and Tailwind CSS. Manage chores, track household members, and get AI-powered task suggestions using Google Gemini.

## Features

- ✅ **Task Management** - Create, track, and manage household tasks with priority levels and difficulty indicators
- 🎯 **Kanban Board** - Visual task board with To Do, In Progress, and Done columns
- 👥 **Household Members** - Manage family members with color-coded profiles
- 🤖 **AI Assistant** - AI-powered task suggestions powered by Google Gemini
- 📱 **Mobile Responsive** - Fully responsive design optimized for all device sizes
- ♿ **Accessibility First** - Improved font sizes (14px minimum on mobile) for better readability
- 📊 **Task Statistics** - Track completion rates and task metrics
- 🌐 **Progressive Web App** - Installable PWA with offline support
- 💾 **Local Storage** - All data saved locally in browser
- 🔐 **Firebase Integration** - Optional cloud storage for data sync

## Accessibility Improvements

**Latest Update (Jan 2026):** Font sizes have been increased to improve readability for users with vision accessibility needs:
- Mobile devices: Minimum 14px font size (previously 10px) for better legibility
- Custom Tailwind CSS configuration with fluid typography scale
- All font sizes properly configured in `index.html`

## Tech Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS
- **Routing**: React Router v7
- **UI Components**: Lucide React icons
- **State Management**: React hooks with local storage persistence
- **Drag & Drop**: @hello-pangea/dnd for task board
- **QR Code**: html5-qrcode & qrcode.react for device sync
- **Charts**: Recharts for task statistics
- **Date Handling**: date-fns
- **Build Tool**: Vite
- **AI Integration**: Google Generative AI (Gemini)
- **Database**: Firebase (optional)

## Project Structure

```
├── components/          # Reusable React components
│   ├── AIAssistant.tsx
│   ├── ChoreModal.tsx
│   ├── Layout.tsx
│   ├── PWAUpdate.tsx
│   └── QRScanner.tsx
├── pages/               # Page components
│   ├── Dashboard.tsx
│   ├── KanbanBoard.tsx
│   ├── PeopleManager.tsx
│   └── Settings.tsx
├── services/            # Business logic & API integration
│   ├── dataService.ts
│   ├── geminiService.ts
│   ├── localStorage.ts
│   └── settingsService.ts
├── public/              # Static assets & PWA files
├── App.tsx              # Root app component
├── index.tsx            # Entry point
├── tailwind.config.ts   # Tailwind configuration
└── vite.config.ts       # Vite configuration
```

## Getting Started

### Prerequisites
- Node.js 16+ 
- npm or yarn
- Google Gemini API key (for AI features, optional)
- Firebase config (for cloud storage, optional)

### Run Locally

1. **Clone and install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment variables** (create `.env.local`):
   ```
   VITE_GEMINI_API_KEY=your_gemini_api_key_here
   ```

3. **Start the development server:**
   ```bash
   npm run dev
   ```
   
   The app will be available at `http://localhost:3000/our-house/`

### Build for Production

```bash
npm run build
```

Optimized build output will be in the `dist/` directory.

### Preview Production Build

```bash
npm run preview
```

## Configuration

### Firebase Setup (Optional)
Configure your Firebase project in the Settings page:
- API Key
- Auth Domain
- Project ID
- Storage Bucket
- Messaging Sender ID
- App ID

### Tailwind Customization
Modify `tailwind.config.ts` to customize:
- Color schemes
- Font sizes
- Spacing scales
- Breakpoints

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers (iOS Safari 14+, Chrome Android)

## Development

### Available Scripts

```bash
npm run dev      # Start development server
npm run build    # Create production build
npm run preview  # Preview production build
```

### Code Style

The project uses:
- TypeScript for type safety
- Tailwind CSS for styling
- Conventional commit messages for git history

## Known Limitations

- Data is stored locally in browser (not synced across devices without Firebase)
- Firebase integration requires manual configuration
- Offline mode has limited functionality

## Future Enhancements

- Cloud sync with user authentication
- Recurring task templates
- Mobile app (React Native)
- Task categories and custom tags
- Notification system
- Advanced analytics dashboard

## License

MIT

---

**View your app in AI Studio**: https://ai.studio/apps/drive/1k5Zt0vUWG_YYCUxbc8Ts2Ht2wvlMvVcf
