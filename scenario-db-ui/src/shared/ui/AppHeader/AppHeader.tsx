import {
  DatabaseOutlined,
  LogoutOutlined,
  UserOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import { Button, Dropdown, Layout, Space, Tooltip, Typography, message } from 'antd';
import type { MenuProps } from 'antd';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { http } from '../../api/http';
import styles from './AppHeader.module.css';

const { Header } = Layout;

export function AppHeader() {
  const navigate = useNavigate();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const logout = async () => {
    try {
      setIsLoggingOut(true);

      await http.post('/auth/logout');
    } catch {
      message.warning(
        'Не удалось завершить сессию на сервере, но вы вышли из приложения.',
      );
    } finally {
      localStorage.removeItem('scenario-db.user');
      setIsLoggingOut(false);
      navigate('/login', { replace: true });
    }
  };

  const profileMenuItems: MenuProps['items'] = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: 'Мой профиль',
      onClick: () => navigate('/profile'),
    },
    {
      type: 'divider',
    },
    {
      key: 'logout',
      danger: true,
      icon: <LogoutOutlined />,
      label: isLoggingOut ? 'Выход...' : 'Выйти',
      disabled: isLoggingOut,
      onClick: () => void logout(),
    },
  ];

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

        <Dropdown
          trigger={['click']}
          menu={{ items: profileMenuItems }}
          placement="bottomRight"
        >
          <Button
            type="text"
            size="large"
            className={styles.actionButton}
            icon={<UserOutlined />}
            aria-label="Открыть меню профиля"
          />
        </Dropdown>
      </Space>
    </Header>
  );
}
