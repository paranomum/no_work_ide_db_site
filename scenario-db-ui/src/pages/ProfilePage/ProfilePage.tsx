import {
  ArrowLeftOutlined,
  DeleteOutlined,
  EditOutlined,
  SaveOutlined,
} from '@ant-design/icons';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Button,
  Card,
  Form,
  Input,
  Space,
  Spin,
  Table,
  Typography,
  message,
} from 'antd';
import axios from 'axios';
import type { ColumnsType } from 'antd/es/table';
import { useEffect, useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';

import { http } from '../../shared/api/http';
import { AppInput } from '../../shared/ui/AppInput/AppInput';
import { AppInputPassword } from '../../shared/ui/AppInput/AppInputPassword';
import styles from './ProfilePage.module.css';

const { Title, Text } = Typography;

interface UserProfile {
  id: number;
  fullName: string;
  login: string;
}

interface UserResponse {
  id: number;
  name: string;
  username: string;
}

interface UserVariable {
  id: number;
  name: string;
  description: string | null;
  value: string;
  isSet: boolean;
}

interface UserVariableResponse {
  variableId: number;
  name: string;
  description: string | null;
  value: string;
  isSet: boolean;
}

const profileSchema = z
  .object({
    fullName: z.string().trim().min(2, 'Введите ФИО'),
    login: z
      .string()
      .trim()
      .min(3, 'Логин должен содержать минимум 3 символа'),
    password: z.string(),
    confirmPassword: z.string(),
  })
  .superRefine((values, context) => {
    const passwordWasChanged = values.password.length > 0;
    const confirmPasswordWasChanged =
      values.confirmPassword.length > 0;

    if (!passwordWasChanged && !confirmPasswordWasChanged) {
      return;
    }

    if (values.password.length < 4) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['password'],
        message: 'Пароль должен содержать минимум 4 символа',
      });
    }

    if (values.password !== values.confirmPassword) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['confirmPassword'],
        message: 'Пароли не совпадают',
      });
    }
  });

type ProfileFormValues = z.infer<typeof profileSchema>;

function mapUserResponse(user: UserResponse): UserProfile {
  return {
    id: user.id,
    fullName: user.name,
    login: user.username,
  };
}

function mapUserVariableResponse(
  variable: UserVariableResponse,
): UserVariable {
  return {
    id: variable.variableId,
    name: variable.name,
    description: variable.description,
    value: variable.value,
    isSet: variable.isSet,
  };
}

function getApiErrorMessage(
  error: unknown,
  defaultMessage: string,
): string {
  if (
    axios.isAxiosError(error) &&
    typeof error.response?.data?.message === 'string'
  ) {
    return error.response.data.message;
  }

  return defaultMessage;
}

export function ProfilePage() {
  const navigate = useNavigate();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [variables, setVariables] = useState<UserVariable[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [isProfileEditing, setIsProfileEditing] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  const [editingVariableId, setEditingVariableId] =
    useState<number | null>(null);
  const [editingVariableValue, setEditingVariableValue] = useState('');
  const [isSavingVariable, setIsSavingVariable] = useState(false);

  const {
    control: profileControl,
    handleSubmit: handleProfileSubmit,
    reset: resetProfileForm,
    formState: { errors: profileErrors },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      fullName: '',
      login: '',
      password: '',
      confirmPassword: '',
    },
  });

  const loadVariables = async () => {
    const { data } = await http.get<UserVariableResponse[]>(
      '/users/me/variables',
    );

    setVariables(data.map(mapUserVariableResponse));
  };

  useEffect(() => {
    let isMounted = true;

    const loadPage = async () => {
      try {
        setIsLoading(true);

        const [profileResponse, variablesResponse] = await Promise.all([
          http.get<UserResponse>('/users/me'),
          http.get<UserVariableResponse[]>('/users/me/variables'),
        ]);

        if (!isMounted) {
          return;
        }

        const loadedProfile = mapUserResponse(profileResponse.data);

        setProfile(loadedProfile);
        setVariables(
          variablesResponse.data.map(mapUserVariableResponse),
        );

        resetProfileForm({
          fullName: loadedProfile.fullName,
          login: loadedProfile.login,
          password: '',
          confirmPassword: '',
        });
      } catch (error) {
        if (isMounted) {
          message.error(
            getApiErrorMessage(
              error,
              'Не удалось загрузить данные профиля',
            ),
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void loadPage();

    return () => {
      isMounted = false;
    };
  }, [resetProfileForm]);

  const startProfileEditing = () => {
    if (!profile) {
      return;
    }

    resetProfileForm({
      fullName: profile.fullName,
      login: profile.login,
      password: '',
      confirmPassword: '',
    });

    setIsProfileEditing(true);
  };

  const cancelProfileEditing = () => {
    if (!profile) {
      return;
    }

    resetProfileForm({
      fullName: profile.fullName,
      login: profile.login,
      password: '',
      confirmPassword: '',
    });

    setIsProfileEditing(false);
  };

  const saveProfile = async (values: ProfileFormValues) => {
    try {
      setIsSavingProfile(true);

      const { data } = await http.put<UserResponse>('/users/me', {
        name: values.fullName.trim(),
        username: values.login.trim(),
      });

      const updatedProfile = mapUserResponse(data);

      if (values.password.length > 0) {
        await http.put('/users/me/password', {
          password: values.password,
        });
      }

      setProfile(updatedProfile);

      localStorage.setItem(
        'scenario-db.user',
        JSON.stringify({
          id: updatedProfile.id,
          username: updatedProfile.login,
        }),
      );

      resetProfileForm({
        fullName: updatedProfile.fullName,
        login: updatedProfile.login,
        password: '',
        confirmPassword: '',
      });

      setIsProfileEditing(false);
      message.success('Данные профиля сохранены');
    } catch (error) {
      message.error(
        getApiErrorMessage(
          error,
          'Не удалось сохранить данные профиля',
        ),
      );
    } finally {
      setIsSavingProfile(false);
    }
  };

  const startVariableEditing = (variable: UserVariable) => {
    setEditingVariableId(variable.id);
    setEditingVariableValue(variable.value);
  };

  const cancelVariableEditing = () => {
    setEditingVariableId(null);
    setEditingVariableValue('');
  };

  const saveVariableValue = async (variableId: number) => {
    try {
      setIsSavingVariable(true);

      await http.put(`/users/me/variables/${variableId}`, {
        value: editingVariableValue,
      });

      await loadVariables();

      cancelVariableEditing();
      message.success('Значение переменной сохранено');
    } catch (error) {
      message.error(
        getApiErrorMessage(
          error,
          'Не удалось сохранить значение переменной',
        ),
      );
    } finally {
      setIsSavingVariable(false);
    }
  };

  const clearVariableValue = async (variableId: number) => {
    try {
      setIsSavingVariable(true);

      await http.delete(`/users/me/variables/${variableId}`);

      await loadVariables();

      if (editingVariableId === variableId) {
        cancelVariableEditing();
      }

      message.success('Значение переменной очищено');
    } catch (error) {
      message.error(
        getApiErrorMessage(
          error,
          'Не удалось очистить значение переменной',
        ),
      );
    } finally {
      setIsSavingVariable(false);
    }
  };

  const columns = useMemo<ColumnsType<UserVariable>>(
    () => [
      {
        title: 'Переменная',
        dataIndex: 'name',
        key: 'name',
        width: '42%',
        render: (name: string, variable) => (
          <Space direction="vertical" size={0}>
            <Typography.Text code>{name}</Typography.Text>

            {variable.description && (
              <Text type="secondary">
                {variable.description}
              </Text>
            )}
          </Space>
        ),
      },
      {
        title: 'Значение',
        dataIndex: 'value',
        key: 'value',
        render: (value: string, variable: UserVariable) => {
          const isEditing = editingVariableId === variable.id;

          if (isEditing) {
            return (
              <AppInput
                autoFocus
                className={styles.variableEditor}
                value={editingVariableValue}
                placeholder="Введите значение"
                disabled={isSavingVariable}
                onChange={(event) => {
                  setEditingVariableValue(event.target.value);
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    void saveVariableValue(variable.id);
                    return;
                  }

                  if (event.key === 'Escape') {
                    event.preventDefault();
                    cancelVariableEditing();
                  }
                }}
              />
            );
          }

          return (
            <div
              className={`${styles.variableValue} ${
                !value ? styles.emptyVariableValue : ''
              }`}
              title="Дважды кликните, чтобы изменить значение"
              onDoubleClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                startVariableEditing(variable);
              }}
            >
              {value || 'Дважды кликните, чтобы задать значение'}
            </div>
          );
        },
      },
      {
        title: '',
        key: 'actions',
        width: 180,
        align: 'right',
        render: (_, variable: UserVariable) => {
          const isEditing = editingVariableId === variable.id;

          if (isEditing) {
            return (
              <Space size={4}>
                <Button
                  type="link"
                  loading={isSavingVariable}
                  onClick={() => void saveVariableValue(variable.id)}
                >
                  Сохранить
                </Button>

                <Button
                  type="link"
                  disabled={isSavingVariable}
                  onClick={cancelVariableEditing}
                >
                  Отмена
                </Button>
              </Space>
            );
          }

          return (
            <Space size={4}>
              <Button
                type="text"
                icon={<EditOutlined />}
                aria-label={`Редактировать значение ${variable.name}`}
                onClick={() => startVariableEditing(variable)}
              />

              {variable.isSet && (
                <Button
                  type="text"
                  danger
                  icon={<DeleteOutlined />}
                  loading={isSavingVariable}
                  aria-label={`Очистить значение ${variable.name}`}
                  onClick={() => void clearVariableValue(variable.id)}
                />
              )}
            </Space>
          );
        },
      },
    ],
    [editingVariableId, editingVariableValue, isSavingVariable],
  );

  if (isLoading) {
    return (
      <main style={{ padding: 32, maxWidth: 1200, margin: '0 auto' }}>
        <div
          style={{
            minHeight: 300,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Spin size="large" />
        </div>
      </main>
    );
  }

  if (!profile) {
    return null;
  }

  return (
    <main style={{ padding: 32, maxWidth: 1200, margin: '0 auto' }}>
      <Space direction="vertical" size={24} style={{ width: '100%' }}>
        <Space size={12}>
          <Button
            type="text"
            size="large"
            icon={<ArrowLeftOutlined />}
            aria-label="Вернуться назад"
            onClick={() => navigate(-1)}
          />

          <Title level={2} style={{ margin: 0 }}>
            Профиль
          </Title>
        </Space>

        <Card
          title="Данные пользователя"
          extra={
            !isProfileEditing && (
              <Button
                icon={<EditOutlined />}
                onClick={startProfileEditing}
              >
                Редактировать
              </Button>
            )
          }
        >
          {!isProfileEditing ? (
            <Space direction="vertical" size={12}>
              <div>
                <Text type="secondary">ФИО</Text>
                <br />
                <Text strong>{profile.fullName}</Text>
              </div>

              <div>
                <Text type="secondary">Логин</Text>
                <br />
                <Text strong>{profile.login}</Text>
              </div>

              <div>
                <Text type="secondary">Пароль</Text>
                <br />
                <Text>••••••••</Text>
              </div>
            </Space>
          ) : (
            <Form
              layout="vertical"
              requiredMark={false}
              onFinish={handleProfileSubmit(saveProfile)}
            >
              <Form.Item
                label="ФИО"
                validateStatus={profileErrors.fullName ? 'error' : ''}
                help={profileErrors.fullName?.message}
              >
                <Controller
                  name="fullName"
                  control={profileControl}
                  render={({ field }) => (
                    <Input
                      {...field}
                      placeholder="Иванов Иван Иванович"
                    />
                  )}
                />
              </Form.Item>

              <Form.Item
                label="Логин"
                validateStatus={profileErrors.login ? 'error' : ''}
                help={profileErrors.login?.message}
              >
                <Controller
                  name="login"
                  control={profileControl}
                  render={({ field }) => (
                    <Input {...field} autoComplete="username" />
                  )}
                />
              </Form.Item>

              <Form.Item
                label="Новый пароль"
                extra="Оставьте оба поля пустыми, если пароль менять не нужно."
                validateStatus={profileErrors.password ? 'error' : ''}
                help={profileErrors.password?.message}
              >
                <Controller
                  name="password"
                  control={profileControl}
                  render={({ field }) => (
                    <AppInputPassword
                      {...field}
                      autoComplete="new-password"
                      placeholder="Введите новый пароль"
                    />
                  )}
                />
              </Form.Item>

              <Form.Item
                label="Повторите новый пароль"
                validateStatus={
                  profileErrors.confirmPassword ? 'error' : ''
                }
                help={profileErrors.confirmPassword?.message}
              >
                <Controller
                  name="confirmPassword"
                  control={profileControl}
                  render={({ field }) => (
                    <AppInputPassword
                      {...field}
                      autoComplete="new-password"
                      placeholder="Повторите новый пароль"
                    />
                  )}
                />
              </Form.Item>

              <Space>
                <Button
                  type="primary"
                  htmlType="submit"
                  icon={<SaveOutlined />}
                  loading={isSavingProfile}
                >
                  Сохранить
                </Button>

                <Button
                  disabled={isSavingProfile}
                  onClick={cancelProfileEditing}
                >
                  Отмена
                </Button>
              </Space>
            </Form>
          )}
        </Card>

        <Card title="Переменные">
          <Typography.Paragraph type="secondary">
            Набор переменных определяется сценариями, доступными пользователю.
            Здесь можно изменять только персональные значения, которые будут
            подставлены при скачивании сценария.
          </Typography.Paragraph>

          <Table<UserVariable>
            rowKey="id"
            columns={columns}
            dataSource={variables}
            pagination={false}
            locale={{
              emptyText: 'Для пользователя пока нет переменных',
            }}
          />
        </Card>
      </Space>
    </main>
  );
}
