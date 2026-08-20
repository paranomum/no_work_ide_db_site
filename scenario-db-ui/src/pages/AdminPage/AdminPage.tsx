import { AppInputPassword } from '../../shared/ui/AppInput/AppInputPassword';
import { AppInput } from '../../shared/ui/AppInput/AppInput';
import {
  ArrowLeftOutlined,
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  ReloadOutlined,
  SaveOutlined,
  SearchOutlined,
  UserAddOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Button,
  Card,
  Form,
  Input,
  Layout,
  Menu,
  Modal,
  Popconfirm,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useEffect, useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';

import styles from './AdminPage.module.css';

const { Sider, Content } = Layout;
const { Title, Text } = Typography;

type AdminSection = 'tags' | 'users';

interface ScenarioTag {
  id: string;
  name: string;
  color: string;
}

interface PlatformUser {
  id: string;
  fullName: string;
  login: string;
  password: string;
  isReset: boolean;
}

const tagSchema = z.object({
  name: z.string().trim().min(1, 'Введите название тега'),
  color: z.string().trim().min(1),
});

const userSchema = z
  .object({
    fullName: z.string().trim().min(2, 'Введите ФИО'),
    login: z.string().trim().min(3, 'Логин должен содержать минимум 3 символа'),
    password: z.string().min(6, 'Пароль должен содержать минимум 6 символов'),
    confirmPassword: z.string(),
  })
  .superRefine((values, context) => {
    if (values.password !== values.confirmPassword) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['confirmPassword'],
        message: 'Пароли не совпадают',
      });
    }
  });

type TagFormValues = z.infer<typeof tagSchema>;
type UserFormValues = z.infer<typeof userSchema>;

const DEFAULT_TAGS: ScenarioTag[] = [
  { id: 'tag-1', name: 'вакансия', color: 'blue' },
  { id: 'tag-2', name: 'заявка', color: 'purple' },
  { id: 'tag-3', name: 'оффер', color: 'green' },
  { id: 'tag-4', name: 'кандидат', color: 'orange' },
];

const DEFAULT_USERS: PlatformUser[] = [
  {
    id: 'user-1',
    fullName: 'Тестовый пользователь',
    login: 'test',
    password: 'test123',
    isReset: false,
  },
];

function readFromStorage<T>(key: string, fallback: T): T {
  const savedValue = localStorage.getItem(key);

  if (!savedValue) {
    return fallback;
  }

  try {
    return JSON.parse(savedValue) as T;
  } catch {
    return fallback;
  }
}

function createEmptyUser(): UserFormValues {
  return {
    fullName: '',
    login: '',
    password: '',
    confirmPassword: '',
  };
}

export function AdminPage() {
  const navigate = useNavigate();

  const [activeSection, setActiveSection] = useState<AdminSection>('tags');
  const [tags, setTags] = useState<ScenarioTag[]>(() =>
    readFromStorage('scenario-db.tags', DEFAULT_TAGS),
  );
  const [users, setUsers] = useState<PlatformUser[]>(() =>
    readFromStorage('scenario-db.platform-users', DEFAULT_USERS),
  );

  const [tagSearch, setTagSearch] = useState('');
  const [userSearch, setUserSearch] = useState('');

  const [isTagModalOpen, setIsTagModalOpen] = useState(false);
  const [editingTag, setEditingTag] = useState<ScenarioTag | null>(null);

  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<PlatformUser | null>(null);

  const {
    control: tagControl,
    handleSubmit: handleTagSubmit,
    reset: resetTagForm,
    formState: { errors: tagErrors },
  } = useForm<TagFormValues>({
    resolver: zodResolver(tagSchema),
    defaultValues: {
      name: '',
      color: 'blue',
    },
  });

  const {
    control: userControl,
    handleSubmit: handleUserSubmit,
    reset: resetUserForm,
    formState: { errors: userErrors },
  } = useForm<UserFormValues>({
    resolver: zodResolver(userSchema),
    defaultValues: createEmptyUser(),
  });

  useEffect(() => {
    localStorage.setItem('scenario-db.tags', JSON.stringify(tags));
  }, [tags]);

  useEffect(() => {
    localStorage.setItem('scenario-db.platform-users', JSON.stringify(users));
  }, [users]);

  const filteredTags = useMemo(() => {
    const normalizedSearch = tagSearch.trim().toLocaleLowerCase('ru-RU');

    if (!normalizedSearch) {
      return tags;
    }

    return tags.filter((tag) =>
      tag.name.toLocaleLowerCase('ru-RU').includes(normalizedSearch),
    );
  }, [tagSearch, tags]);

  const filteredUsers = useMemo(() => {
    const normalizedSearch = userSearch.trim().toLocaleLowerCase('ru-RU');

    if (!normalizedSearch) {
      return users;
    }

    return users.filter((user) =>
      `${user.fullName} ${user.login}`
        .toLocaleLowerCase('ru-RU')
        .includes(normalizedSearch),
    );
  }, [userSearch, users]);

  const openCreateTagModal = () => {
    setEditingTag(null);
    resetTagForm({
      name: '',
      color: 'blue',
    });
    setIsTagModalOpen(true);
  };

  const openEditTagModal = (tag: ScenarioTag) => {
    setEditingTag(tag);
    resetTagForm({
      name: tag.name,
      color: tag.color,
    });
    setIsTagModalOpen(true);
  };

  const closeTagModal = () => {
    setIsTagModalOpen(false);
    setEditingTag(null);
    resetTagForm({
      name: '',
      color: 'blue',
    });
  };

  const saveTag = (values: TagFormValues) => {
    const normalizedName = values.name.trim();

    const duplicateTagExists = tags.some(
      (tag) =>
        tag.name.toLocaleLowerCase('ru-RU') ===
          normalizedName.toLocaleLowerCase('ru-RU') &&
        tag.id !== editingTag?.id,
    );

    if (duplicateTagExists) {
      message.error('Тег с таким названием уже существует');
      return;
    }

    if (editingTag) {
      setTags((currentTags) =>
        currentTags.map((tag) =>
          tag.id === editingTag.id
            ? {
                ...tag,
                name: normalizedName,
                color: values.color,
              }
            : tag,
        ),
      );

      message.success('Тег сохранён');
    } else {
      setTags((currentTags) => [
        ...currentTags,
        {
          id: crypto.randomUUID(),
          name: normalizedName,
          color: values.color,
        },
      ]);

      message.success('Тег добавлен');
    }

    closeTagModal();
  };

  const deleteTag = (tagId: string) => {
    setTags((currentTags) =>
      currentTags.filter((tag) => tag.id !== tagId),
    );

    message.success('Тег удалён');
  };

  const openCreateUserModal = () => {
    setEditingUser(null);
    resetUserForm(createEmptyUser());
    setIsUserModalOpen(true);
  };

  const openEditUserModal = (user: PlatformUser) => {
    setEditingUser(user);
    resetUserForm({
      fullName: user.fullName,
      login: user.login,
      password: user.password,
      confirmPassword: user.password,
    });
    setIsUserModalOpen(true);
  };

  const closeUserModal = () => {
    setIsUserModalOpen(false);
    setEditingUser(null);
    resetUserForm(createEmptyUser());
  };

  const saveUser = (values: UserFormValues) => {
    const normalizedLogin = values.login.trim();

    const duplicateLoginExists = users.some(
      (user) =>
        user.login.toLocaleLowerCase('ru-RU') ===
          normalizedLogin.toLocaleLowerCase('ru-RU') &&
        user.id !== editingUser?.id,
    );

    if (duplicateLoginExists) {
      message.error('Пользователь с таким логином уже существует');
      return;
    }

    if (editingUser) {
      setUsers((currentUsers) =>
        currentUsers.map((user) =>
          user.id === editingUser.id
            ? {
                ...user,
                fullName: values.fullName.trim(),
                login: normalizedLogin,
                password: values.password,
                isReset: false,
              }
            : user,
        ),
      );

      message.success('Данные пользователя сохранены');
    } else {
      setUsers((currentUsers) => [
        ...currentUsers,
        {
          id: crypto.randomUUID(),
          fullName: values.fullName.trim(),
          login: normalizedLogin,
          password: values.password,
          isReset: false,
        },
      ]);

      message.success('Пользователь добавлен');
    }

    closeUserModal();
  };

  const resetUser = (userId: string) => {
    setUsers((currentUsers) =>
      currentUsers.map((user) =>
        user.id === userId
          ? {
              ...user,
              fullName: '',
              login: '',
              password: '',
              isReset: true,
            }
          : user,
      ),
    );

    message.success('Данные пользователя очищены');
  };

  const tagColumns: ColumnsType<ScenarioTag> = [
    {
      title: 'Тег',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, tag) => (
        <Tag color={tag.color}>{name}</Tag>
      ),
    },
    {
      title: '',
      key: 'actions',
      width: 150,
      align: 'right',
      render: (_, tag) => (
        <Space size={4}>
          <Button
            type="text"
            icon={<EditOutlined />}
            aria-label={`Редактировать тег ${tag.name}`}
            onClick={() => openEditTagModal(tag)}
          />

          <Popconfirm
            title="Удалить тег?"
            description={`Тег «${tag.name}» будет удалён.`}
            okText="Удалить"
            cancelText="Отмена"
            okButtonProps={{ danger: true }}
            onConfirm={() => deleteTag(tag.id)}
          >
            <Button
              type="text"
              danger
              icon={<DeleteOutlined />}
              aria-label={`Удалить тег ${tag.name}`}
            />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const userColumns: ColumnsType<PlatformUser> = [
    {
      title: 'ФИО',
      dataIndex: 'fullName',
      key: 'fullName',
      render: (fullName: string, user) =>
        user.isReset ? (
          <Text type="secondary">Данные очищены</Text>
        ) : (
          fullName
        ),
    },
    {
      title: 'Логин',
      dataIndex: 'login',
      key: 'login',
      render: (login: string) =>
        login || <Text type="secondary">Не задан</Text>,
    },
    {
      title: 'Пароль',
      dataIndex: 'password',
      key: 'password',
      render: (password: string) =>
        password ? '••••••••' : <Text type="secondary">Не задан</Text>,
    },
    {
      title: '',
      key: 'actions',
      width: 150,
      align: 'right',
      render: (_, user) => (
        <Space size={4}>
          <Button
            type="text"
            icon={<EditOutlined />}
            aria-label={`Редактировать пользователя ${user.login}`}
            onClick={() => openEditUserModal(user)}
          />

          <Popconfirm
            title="Сбросить пользователя?"
            description="ФИО, логин и пароль будут очищены. Сам пользователь останется в системе."
            okText="Сбросить"
            cancelText="Отмена"
            okButtonProps={{ danger: true }}
            onConfirm={() => resetUser(user.id)}
          >
            <Button
              type="text"
              danger
              icon={<ReloadOutlined />}
              aria-label="Сбросить данные пользователя"
            />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const menuItems = [
    {
      key: 'tags',
      icon: <Tag />,
      label: 'Теги',
    },
    {
      key: 'users',
      icon: <UserOutlined />,
      label: 'Пользователи',
    },
  ];

  return (
    <main className={styles.page}>
      <Space className={styles.pageTitle} size={12}>
        <Button
          type="text"
          size="large"
          icon={<ArrowLeftOutlined />}
          aria-label="Вернуться назад"
          onClick={() => navigate(-1)}
        />

        <Title level={2} style={{ margin: 0 }}>
          Администрирование
        </Title>
      </Space>

      <Layout className={styles.adminLayout}>
        <Sider
          className={styles.sider}
          width={220}
          breakpoint="md"
          collapsedWidth="0"
        >
          <Menu
            mode="inline"
            selectedKeys={[activeSection]}
            items={menuItems}
            onClick={({ key }) => setActiveSection(key as AdminSection)}
          />
        </Sider>

        <Content className={styles.content}>
          {activeSection === 'tags' && (
            <Card
              title="Теги"
              extra={
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={openCreateTagModal}
                >
                  Добавить тег
                </Button>
              }
            >
              <AppInput
  allowClear
  size="large"
  prefix={<SearchOutlined />}
  placeholder="Поиск по тегам"
  value={tagSearch}
  onChange={(event) => setTagSearch(event.target.value)}
/>

              <Table<ScenarioTag>
                className={styles.table}
                rowKey="id"
                columns={tagColumns}
                dataSource={filteredTags}
                pagination={{
                  pageSize: 10,
                  showSizeChanger: false,
                }}
                locale={{
                  emptyText: 'Теги не найдены',
                }}
              />
            </Card>
          )}

          {activeSection === 'users' && (
            <Card
              title="Пользователи"
              extra={
                <Button
                  type="primary"
                  icon={<UserAddOutlined />}
                  onClick={openCreateUserModal}
                >
                  Добавить пользователя
                </Button>
              }
            >
              <AppInput
  allowClear
  size="large"
  prefix={<SearchOutlined />}
  placeholder="Поиск по ФИО или логину"
  value={userSearch}
  onChange={(event) => setUserSearch(event.target.value)}
/>

              <Table<PlatformUser>
                className={styles.table}
                rowKey="id"
                columns={userColumns}
                dataSource={filteredUsers}
                pagination={{
                  pageSize: 10,
                  showSizeChanger: false,
                }}
                locale={{
                  emptyText: 'Пользователи не найдены',
                }}
              />
            </Card>
          )}
        </Content>
      </Layout>

      <Modal
        title={editingTag ? 'Редактирование тега' : 'Новый тег'}
        open={isTagModalOpen}
        okText={editingTag ? 'Сохранить' : 'Добавить'}
        cancelText="Отмена"
        onCancel={closeTagModal}
        onOk={handleTagSubmit(saveTag)}
        destroyOnHidden
      >
        <Form layout="vertical" requiredMark={false}>
          <Form.Item
            label="Название"
            validateStatus={tagErrors.name ? 'error' : ''}
            help={tagErrors.name?.message}
          >
            <Controller
              name="name"
              control={tagControl}
              render={({ field }) => (
                <Input {...field} autoFocus placeholder="Например, вакансия" />
              )}
            />
          </Form.Item>

          <Form.Item label="Цвет">
            <Controller
              name="color"
              control={tagControl}
              render={({ field }) => (
                <Input {...field} placeholder="blue, green, orange..." />
              )}
            />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={editingUser ? 'Редактирование пользователя' : 'Новый пользователь'}
        open={isUserModalOpen}
        okText={editingUser ? 'Сохранить' : 'Добавить'}
        cancelText="Отмена"
        onCancel={closeUserModal}
        onOk={handleUserSubmit(saveUser)}
        destroyOnHidden
      >
        <Form layout="vertical" requiredMark={false}>
          <Form.Item
            label="ФИО"
            validateStatus={userErrors.fullName ? 'error' : ''}
            help={userErrors.fullName?.message}
          >
            <Controller
              name="fullName"
              control={userControl}
              render={({ field }) => (
                <Input {...field} autoFocus placeholder="Иванов Иван Иванович" />
              )}
            />
          </Form.Item>

          <Form.Item
            label="Логин"
            validateStatus={userErrors.login ? 'error' : ''}
            help={userErrors.login?.message}
          >
            <Controller
              name="login"
              control={userControl}
              render={({ field }) => <Input {...field} />}
            />
          </Form.Item>

          <Form.Item
            label="Пароль"
            validateStatus={userErrors.password ? 'error' : ''}
            help={userErrors.password?.message}
          >
            <Controller
              name="password"
              control={userControl}
              render={({ field }) => (
                <AppInputPassword
  {...field}
  autoComplete="new-password"
/>
              )}
            />
          </Form.Item>

          <Form.Item
            label="Повторите пароль"
            validateStatus={userErrors.confirmPassword ? 'error' : ''}
            help={userErrors.confirmPassword?.message}
          >
            <Controller
              name="confirmPassword"
              control={userControl}
              render={({ field }) => (
                <AppInputPassword
  {...field}
  autoComplete="new-password"
/>
              )}
            />
          </Form.Item>
        </Form>
      </Modal>
    </main>
  );
}
