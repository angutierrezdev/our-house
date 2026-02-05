import React, { useState } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import PWAUpdate from './components/PWAUpdate';
import SplashScreen from './components/SplashScreen';
import Dashboard from './pages/Dashboard';
import KanbanBoard from './pages/KanbanBoard';
import PeopleManager from './pages/PeopleManager';
import Settings from './pages/Settings';
import { ROUTES } from './constants';

const App: React.FC = () => {
  const [showSplash, setShowSplash] = useState(true);

  return (
    <>
      <SplashScreen onComplete={() => setShowSplash(false)} />
      <PWAUpdate />
      <HashRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path={ROUTES.KANBAN} element={<KanbanBoard />} />
          <Route path={ROUTES.PEOPLE} element={<PeopleManager />} />
          <Route path={ROUTES.SETTINGS} element={<Settings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
      </HashRouter>
    </>
  );
};

export default App;