import { Layout } from 'antd';
import { Outlet } from 'react-router-dom';

import { AppHeader } from '../shared/ui/AppHeader/AppHeader';

const { Content } = Layout;

export function PrivateLayout() {
  return (
    <Layout style={{ minHeight: '100vh' }}>
      <AppHeader />

      <Content>
        <Outlet />
      </Content>
    </Layout>
  );
}
