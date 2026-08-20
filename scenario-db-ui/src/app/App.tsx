import { Navigate, Route, Routes } from 'react-router-dom';

import { AdminPage } from '../pages/AdminPage/AdminPage';
import { LoginPage } from '../pages/LoginPage/LoginPage';
import { ProfilePage } from '../pages/ProfilePage/ProfilePage';
import { ScenarioListPage } from '../pages/ScenarioListPage/ScenarioListPage';
import { ScenarioPage } from '../pages/ScenarioPage/ScenarioPage';
import { PrivateLayout } from './PrivateLayout';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route element={<PrivateLayout />}>
        <Route path="/scenarios/:scenarioId" element={<ScenarioPage />} />
<Route path="/scenarios" element={<ScenarioListPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/admin" element={<AdminPage />} />
      </Route>

      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
