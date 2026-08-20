import { AppInput } from '../../shared/ui/AppInput/AppInput';
import { AppInputPassword } from '../../shared/ui/AppInput/AppInputPassword';
import { LockOutlined, UserOutlined } from '@ant-design/icons';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Alert,
  Button,
  Card,
  Form,
  Input,
  Space,
  Typography,
  message,
} from 'antd';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';

import type { LoginRequest } from '../../shared/types/auth';
import styles from './LoginPage.module.css';

const loginSchema = z.object({
  login: z.string().trim().min(1, 'Введите логин'),
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
      login: '',
      password: '',
    },
  });

  const onSubmit = async (values: LoginRequest) => {
    setErrorText(null);
    setIsSubmitting(true);

    try {
      await new Promise((resolve) => setTimeout(resolve, 500));

      localStorage.setItem('scenario-db.access-token', 'development-token');
      localStorage.setItem(
        'scenario-db.user',
        JSON.stringify({
          id: 'local-user',
          login: values.login,
          name: values.login,
        }),
      );

      message.success('Вход выполнен');
      navigate('/scenarios', { replace: true });
    } catch {
      setErrorText('Не удалось выполнить вход. Повторите попытку.');
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
            validateStatus={errors.login ? 'error' : ''}
            help={errors.login?.message}
          >
            <Controller
              name="login"
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
  onKeyDown={(event) => {
    if (event.key === 'Enter') {
      handleSubmit(onSubmit)();
    }
  }}
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
