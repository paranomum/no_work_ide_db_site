import { Layout } from 'antd';
import { Navigate, Outlet, useLocation } from 'react-router-dom';

import { AppHeader } from '../shared/ui/AppHeader/AppHeader';

const { Content } = Layout;

function hasSavedUser(): boolean {
  const savedUser = localStorage.getItem('scenario-db.user');

  if (!savedUser) {
    return false;
  }

  try {
    const user = JSON.parse(savedUser);

    return Boolean(user?.id && user?.username);
  } catch {
    localStorage.removeItem('scenario-db.user');
    return false;
  }
}

export function PrivateLayout() {
  const location = useLocation();

  if (!hasSavedUser()) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location.pathname }}
      />
    );
  }

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <AppHeader />

      <Content>
        <Outlet />
      </Content>
    </Layout>
  );
}
