import { Navigate, Outlet } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Layout, Spin } from 'antd';
import { AppHeader } from '../shared/ui/AppHeader/AppHeader';
import { http } from '../shared/api/http';

const { Content } = Layout;

export function PrivateLayout() {
  const { isLoading, isError } = useQuery({
    queryKey: ['me'],
    queryFn: () => http.get('/users/me'),
    retry: false,
  });

  if (isLoading) return <Spin fullscreen />;
  if (isError) return <Navigate to="/login" replace />;

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <AppHeader />
      <Content>
        <Outlet />
      </Content>
    </Layout>
  );
}
