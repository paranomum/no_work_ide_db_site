import { LockOutlined, UserOutlined } from '@ant-design/icons';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Alert,
  Button,
  Card,
  Form,
  Space,
  Typography,
  message,
} from 'antd';
import axios from 'axios';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';

import { http } from '../../shared/api/http';
import type { AuthUser, LoginRequest } from '../../shared/types/auth';
import { AppInput } from '../../shared/ui/AppInput/AppInput';
import { AppInputPassword } from '../../shared/ui/AppInput/AppInputPassword';
import styles from './LoginPage.module.css';

const loginSchema = z.object({
  username: z.string().trim().min(1, 'Введите логин'),
  password: z.string().min(1, 'Введите пароль'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export function LoginPage() {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: '',
      password: '',
    },
  });

  const onSubmit = async (values: LoginFormValues) => {
    setErrorText(null);
    setIsSubmitting(true);

    try {
      const request: LoginRequest = {
        username: values.username,
        password: values.password,
      };

      const { data } = await http.post<AuthUser>('/auth/login', request);

      localStorage.setItem('scenario-db.user', JSON.stringify(data));

      message.success('Вход выполнен');
      navigate('/scenarios', { replace: true });
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        setErrorText('Неверный логин или пароль');
      } else {
        setErrorText('Не удалось выполнить вход. Повторите попытку.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className={styles.page}>
      <Card className={styles.card}>
        <Space direction="vertical" size={8} className={styles.heading}>
          <Typography.Title level={2} className={styles.title}>
            База сценариев
          </Typography.Title>

          <Typography.Text type="secondary">
            Войдите для работы со сценариями прогона
          </Typography.Text>
        </Space>

        {errorText && (
          <Alert
            className={styles.alert}
            type="error"
            showIcon
            message={errorText}
          />
        )}

        <Form
          layout="vertical"
          requiredMark={false}
          onFinish={handleSubmit(onSubmit)}
        >
          <Form.Item
            label="Логин"
            validateStatus={errors.username ? 'error' : ''}
            help={errors.username?.message}
          >
            <Controller
              name="username"
              control={control}
              render={({ field }) => (
                <AppInput
                  {...field}
                  autoComplete="username"
                  autoFocus
                  size="large"
                  prefix={<UserOutlined />}
                  placeholder="Введите логин"
                />
              )}
            />
          </Form.Item>

          <Form.Item
            label="Пароль"
            validateStatus={errors.password ? 'error' : ''}
            help={errors.password?.message}
          >
            <Controller
              name="password"
              control={control}
              render={({ field }) => (
                <AppInputPassword
                  {...field}
                  autoComplete="current-password"
                  size="large"
                  prefix={<LockOutlined />}
                  placeholder="Введите пароль"
                />
              )}
            />
          </Form.Item>

          <Button
            block
            type="primary"
            size="large"
            htmlType="submit"
            loading={isSubmitting}
          >
            Далее
          </Button>
        </Form>
      </Card>
    </main>
  );
}
