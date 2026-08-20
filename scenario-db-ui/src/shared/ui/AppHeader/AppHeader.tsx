import {
  DatabaseOutlined,
  SettingOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { Button, Layout, Space, Tooltip, Typography } from 'antd';
import { useNavigate } from 'react-router-dom';

import styles from './AppHeader.module.css';

const { Header } = Layout;

export function AppHeader() {
  const navigate = useNavigate();

  return (
    <Header className={styles.header}>
      <button
        type="button"
        className={styles.logoButton}
        onClick={() => navigate('/scenarios')}
      >
        <DatabaseOutlined className={styles.logoIcon} />

        <Typography.Text className={styles.logoText}>
          База сценариев
        </Typography.Text>
      </button>

      <Space size={4}>
        <Tooltip title="Администрирование">
          <Button
            type="text"
            size="large"
            className={styles.actionButton}
            icon={<SettingOutlined />}
            aria-label="Перейти в администрирование"
            onClick={() => navigate('/admin')}
          />
        </Tooltip>

        <Tooltip title="Мой профиль">
          <Button
            type="text"
            size="large"
            className={styles.actionButton}
            icon={<UserOutlined />}
            aria-label="Перейти в профиль"
            onClick={() => navigate('/profile')}
          />
        </Tooltip>
      </Space>
    </Header>
  );
}
