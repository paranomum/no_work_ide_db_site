import { AppInputPassword } from '../../shared/ui/AppInput/AppInputPassword';
import styles from './ProfilePage.module.css';
import { AppInput } from '../../shared/ui/AppInput/AppInput';
import {
  ArrowLeftOutlined,
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
  Table,
  Typography,
  message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useEffect, useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';

const { Title, Text } = Typography;

interface UserProfile {
  id: string;
  fullName: string;
  login: string;
}

interface UserVariable {
  id: string;
  name: string;
  value: string;
}

const profileSchema = z
  .object({
    fullName: z.string().trim().min(2, 'Введите ФИО'),
    login: z.string().trim().min(3, 'Логин должен содержать минимум 3 символа'),
    password: z.string(),
    confirmPassword: z.string(),
  })
  .superRefine((values, context) => {
    const passwordWasChanged = values.password.length > 0;
    const confirmPasswordWasChanged = values.confirmPassword.length > 0;

    if (!passwordWasChanged && !confirmPasswordWasChanged) {
      return;
    }

    if (values.password.length < 6) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['password'],
        message: 'Пароль должен содержать минимум 6 символов',
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

const DEFAULT_VARIABLES: UserVariable[] = [
  {
    id: '1',
    name: 'recruiter.username',
    value: '',
  },
  {
    id: '2',
    name: 'recruiter.password',
    value: '',
  },
  {
    id: '3',
    name: 'recruiter.uuid',
    value: '',
  },
  {
    id: '4',
    name: 'hrbp.username',
    value: '',
  },
  {
    id: '5',
    name: 'hrbp.password',
    value: '',
  },
];

function getStoredProfile(): UserProfile {
  const storedUser = localStorage.getItem('scenario-db.user');

  if (!storedUser) {
    return {
      id: 'local-user',
      fullName: 'Тестовый пользователь',
      login: 'test',
    };
  }

  const parsedUser = JSON.parse(storedUser) as {
    id?: string;
    name?: string;
    fullName?: string;
    login?: string;
  };

  return {
    id: parsedUser.id ?? 'local-user',
    fullName:
      parsedUser.fullName ??
      parsedUser.name ??
      'Тестовый пользователь',
    login: parsedUser.login ?? 'test',
  };
}

function getStoredVariables(): UserVariable[] {
  const storedVariables = localStorage.getItem('scenario-db.user-variables');

  if (!storedVariables) {
    return DEFAULT_VARIABLES;
  }

  return JSON.parse(storedVariables) as UserVariable[];
}

export function ProfilePage() {
  const navigate = useNavigate();

  const [profile, setProfile] = useState<UserProfile>(getStoredProfile);
  const [variables, setVariables] =
    useState<UserVariable[]>(getStoredVariables);

  const [isProfileEditing, setIsProfileEditing] = useState(false);

  const {
    control: profileControl,
    handleSubmit: handleProfileSubmit,
    reset: resetProfileForm,
    formState: { errors: profileErrors },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      fullName: profile.fullName,
      login: profile.login,
      password: '',
      confirmPassword: '',
    },
  });

  const [editingVariableId, setEditingVariableId] = useState<string | null>(
  null,
);
  const [editingVariableValue, setEditingVariableValue] = useState('');

  const startVariableEditing = (variable: UserVariable) => {
  setEditingVariableId(variable.id);
  setEditingVariableValue(variable.value);
};

const cancelVariableEditing = () => {
  setEditingVariableId(null);
  setEditingVariableValue('');
};

const saveVariableValue = (variableId: string) => {
  setVariables((currentVariables) =>
    currentVariables.map((variable) =>
      variable.id === variableId
        ? {
            ...variable,
            value: editingVariableValue,
          }
        : variable,
    ),
  );

  cancelVariableEditing();
  message.success('Значение переменной сохранено');
};

  useEffect(() => {
    localStorage.setItem('scenario-db.user-variables', JSON.stringify(variables));
  }, [variables]);

  const startProfileEditing = () => {
    resetProfileForm({
      fullName: profile.fullName,
      login: profile.login,
      password: '',
      confirmPassword: '',
    });

    setIsProfileEditing(true);
  };

  const cancelProfileEditing = () => {
    resetProfileForm({
      fullName: profile.fullName,
      login: profile.login,
      password: '',
      confirmPassword: '',
    });

    setIsProfileEditing(false);
  };

  const saveProfile = (values: ProfileFormValues) => {
    const updatedProfile: UserProfile = {
      id: profile.id,
      fullName: values.fullName,
      login: values.login,
    };

    setProfile(updatedProfile);

    localStorage.setItem(
      'scenario-db.user',
      JSON.stringify({
        id: updatedProfile.id,
        name: updatedProfile.fullName,
        fullName: updatedProfile.fullName,
        login: updatedProfile.login,
      }),
    );

    setIsProfileEditing(false);
    message.success('Данные профиля сохранены');
  };

  const columns = useMemo<ColumnsType<UserVariable>>(
  () => [
    {
      title: 'Переменная',
      dataIndex: 'name',
      key: 'name',
      width: '42%',
      render: (name: string) => (
        <Typography.Text code>{name}</Typography.Text>
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
      value={editingVariableValue}
      placeholder="Введите значение"
      onChange={(event) => {
        setEditingVariableValue(event.target.value);
      }}
      onKeyDown={(event) => {
        if (event.key === 'Enter') {
          event.preventDefault();
          saveVariableValue(variable.id);
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
      width: 140,
      align: 'right',
      render: (_, variable: UserVariable) => {
        const isEditing = editingVariableId === variable.id;

        if (isEditing) {
          return (
            <Space size={4}>
              <Button
                type="link"
                onClick={() => saveVariableValue(variable.id)}
              >
                Сохранить
              </Button>

              <Button type="link" onClick={cancelVariableEditing}>
                Отмена
              </Button>
            </Space>
          );
        }

        return (
          <Button
            type="text"
            icon={<EditOutlined />}
            aria-label={`Редактировать значение ${variable.name}`}
            onClick={() => startVariableEditing(variable)}
          />
        );
      },
    },
  ],
  [editingVariableId, editingVariableValue],
);

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
              <Button icon={<EditOutlined />} onClick={startProfileEditing}>
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
                    <Input {...field} placeholder="Иванов Иван Иванович" />
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
                validateStatus={profileErrors.confirmPassword ? 'error' : ''}
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
                >
                  Сохранить
                </Button>

                <Button onClick={cancelProfileEditing}>Отмена</Button>
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
