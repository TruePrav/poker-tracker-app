import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppShell } from './components/layout/AppShell';
import { HomePage } from './pages/HomePage';
import { SetupPage } from './pages/SetupPage';
import { TournamentPage } from './pages/TournamentPage';
import { FullScreenTimerPage } from './pages/FullScreenTimerPage';
import { PlayerDirectoryPage } from './pages/PlayerDirectoryPage';
import { HistoryPage } from './pages/HistoryPage';
import { BlindStructuresPage } from './pages/BlindStructuresPage';
import { DatabaseAdminPage } from './pages/DatabaseAdminPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/tournament/:id/timer" element={<FullScreenTimerPage />} />
        <Route element={<AppShell />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/setup" element={<SetupPage />} />
          <Route path="/setup/:id" element={<SetupPage />} />
          <Route path="/tournament/:id" element={<TournamentPage />} />
          <Route path="/players" element={<PlayerDirectoryPage />} />
          <Route path="/blinds" element={<BlindStructuresPage />} />
          <Route path="/database" element={<DatabaseAdminPage />} />
          <Route path="/history" element={<HistoryPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
