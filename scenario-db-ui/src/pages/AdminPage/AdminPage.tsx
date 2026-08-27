import { AppInputPassword } from '../../shared/ui/AppInput/AppInputPassword';
import { AppInput } from '../../shared/ui/AppInput/AppInput';
import {
  ArrowLeftOutlined,
  ClearOutlined,
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  SearchOutlined,
  UserAddOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Button,
  Card,
  ColorPicker,
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
import axios from 'axios';
import type { ColumnsType } from 'antd/es/table';
import { useEffect, useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';

import { http } from '../../shared/api/http';
import styles from './AdminPage.module.css';

const { Sider, Content } = Layout;
const { Title } = Typography;

type AdminSection = 'tags' | 'users';

interface ScenarioTag {
  id: string;
  name: string;
  color: string;
}

interface TagResponse {
  id: number;
  name: string;
  color: string;
}

interface PlatformUser {
  id: string;
  fullName: string;
  login: string;
}

interface UserResponse {
  id: number;
  name: string;
  username: string;
}

const DEFAULT_TAG_COLOR = '#6B7280';

const tagSchema = z.object({
  name: z.string().trim().min(1, 'Введите название тега'),
  color: z.string().regex(
    /^#[0-9A-Fa-f]{6}$/,
    'Выберите корректный цвет',
  ),
});

const createUserSchema = z
  .object({
    fullName: z.string().trim().min(2, 'Введите ФИО'),
    login: z
      .string()
      .trim()
      .min(3, 'Логин должен содержать минимум 3 символа'),
    password: z
      .string()
      .min(4, 'Пароль должен содержать минимум 4 символа'),
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

const editUserSchema = z
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
    const confirmationWasChanged = values.confirmPassword.length > 0;

    if (!passwordWasChanged && !confirmationWasChanged) {
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

type TagFormValues = z.infer<typeof tagSchema>;
type UserFormValues = {
  fullName: string;
  login: string;
  password: string;
  confirmPassword: string;
};

function createEmptyUser(): UserFormValues {
  return {
    fullName: '',
    login: '',
    password: '',
    confirmPassword: '',
  };
}

function mapTagResponse(tag: TagResponse): ScenarioTag {
  return {
    id: String(tag.id),
    name: tag.name,
    color: tag.color,
  };
}

function mapUserResponse(user: UserResponse): PlatformUser {
  return {
    id: String(user.id),
    fullName: user.name,
    login: user.username,
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

export function AdminPage() {
  const navigate = useNavigate();

  const [activeSection, setActiveSection] =
    useState<AdminSection>('tags');

  const [tags, setTags] = useState<ScenarioTag[]>([]);
  const [isTagsLoading, setIsTagsLoading] = useState(true);

  const [users, setUsers] = useState<PlatformUser[]>([]);
  const [isUsersLoading, setIsUsersLoading] = useState(true);

  const [tagSearch, setTagSearch] = useState('');
  const [userSearch, setUserSearch] = useState('');

  const [isTagModalOpen, setIsTagModalOpen] = useState(false);
  const [editingTag, setEditingTag] = useState<ScenarioTag | null>(
    null,
  );
  const [isSavingTag, setIsSavingTag] = useState(false);

  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] =
    useState<PlatformUser | null>(null);
  const [isSavingUser, setIsSavingUser] = useState(false);
  const [isResettingUserId, setIsResettingUserId] = useState<
    string | null
  >(null);

  const {
    control: tagControl,
    handleSubmit: handleTagSubmit,
    reset: resetTagForm,
    formState: { errors: tagErrors },
  } = useForm<TagFormValues>({
    resolver: zodResolver(tagSchema),
    defaultValues: {
      name: '',
      color: DEFAULT_TAG_COLOR,
    },
  });

  const {
    control: userControl,
    handleSubmit: handleUserSubmit,
    reset: resetUserForm,
    formState: { errors: userErrors },
  } = useForm<UserFormValues>({
    defaultValues: createEmptyUser(),
  });

  const loadTags = async () => {
    try {
      setIsTagsLoading(true);

      const { data } = await http.get<TagResponse[]>('/tags');

      setTags(data.map(mapTagResponse));
    } catch (error) {
      message.error(
        getApiErrorMessage(error, 'Не удалось загрузить список тегов'),
      );
    } finally {
      setIsTagsLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      setIsUsersLoading(true);

      const { data } = await http.get<UserResponse[]>('/users');

      setUsers(data.map(mapUserResponse));
    } catch (error) {
      message.error(
        getApiErrorMessage(
          error,
          'Не удалось загрузить список пользователей',
        ),
      );
    } finally {
      setIsUsersLoading(false);
    }
  };

  useEffect(() => {
    void loadTags();
    void loadUsers();
  }, []);

  const filteredTags = useMemo(() => {
    const normalizedSearch = tagSearch
      .trim()
      .toLocaleLowerCase('ru-RU');

    if (!normalizedSearch) {
      return tags;
    }

    return tags.filter((tag) =>
      tag.name.toLocaleLowerCase('ru-RU').includes(normalizedSearch),
    );
  }, [tagSearch, tags]);

  const filteredUsers = useMemo(() => {
    const normalizedSearch = userSearch
      .trim()
      .toLocaleLowerCase('ru-RU');

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
      color: DEFAULT_TAG_COLOR,
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
      color: DEFAULT_TAG_COLOR,
    });
  };

  const saveTag = async (values: TagFormValues) => {
    const normalizedName = values.name.trim();

    try {
      setIsSavingTag(true);

      if (editingTag) {
        await http.put(`/tags/${editingTag.id}`, {
          name: normalizedName,
          color: values.color,
        });

        message.success('Тег сохранён');
      } else {
        await http.post('/tags', {
          name: normalizedName,
          color: values.color,
        });

        message.success('Тег добавлен');
      }

      closeTagModal();
      await loadTags();
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 409) {
        message.error('Тег с таким названием уже существует');
        return;
      }

      message.error(
        getApiErrorMessage(error, 'Не удалось сохранить тег'),
      );
    } finally {
      setIsSavingTag(false);
    }
  };

  const deleteTag = async (tagId: string) => {
    try {
      await http.delete(`/tags/${tagId}`);

      message.success('Тег удалён');
      await loadTags();
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 409) {
        message.error(
          'Тег нельзя удалить, пока он используется в сценариях',
        );
        return;
      }

      message.error(
        getApiErrorMessage(error, 'Не удалось удалить тег'),
      );
    }
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
      password: '',
      confirmPassword: '',
    });
    setIsUserModalOpen(true);
  };

  const closeUserModal = () => {
    setIsUserModalOpen(false);
    setEditingUser(null);
    resetUserForm(createEmptyUser());
  };

  const saveUser = async (values: UserFormValues) => {
    const normalizedName = values.fullName.trim();
    const normalizedUsername = values.login.trim();

    const schema = editingUser ? editUserSchema : createUserSchema;
    const validationResult = schema.safeParse(values);

    if (!validationResult.success) {
      const firstIssue = validationResult.error.issues[0];

      if (firstIssue) {
        message.error(firstIssue.message);
      }

      return;
    }

    try {
      setIsSavingUser(true);

      if (editingUser) {
        await http.put(`/users/${editingUser.id}`, {
          name: normalizedName,
          username: normalizedUsername,
        });

        if (values.password.length > 0) {
          await http.put(`/users/${editingUser.id}/password`, {
            password: values.password,
          });
        }

        message.success('Данные пользователя сохранены');
      } else {
        await http.post('/users', {
          name: normalizedName,
          username: normalizedUsername,
          password: values.password,
        });

        message.success('Пользователь добавлен');
      }

      closeUserModal();
      await loadUsers();
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 409) {
        message.error('Пользователь с таким логином уже существует');
        return;
      }

      message.error(
        getApiErrorMessage(
          error,
          'Не удалось сохранить данные пользователя',
        ),
      );
    } finally {
      setIsSavingUser(false);
    }
  };

  const resetUserVariables = async (userId: string) => {
    try {
      setIsResettingUserId(userId);

      await http.post(`/users/${userId}/reset`);

      message.success('Персональные переменные пользователя очищены');
    } catch (error) {
      message.error(
        getApiErrorMessage(
          error,
          'Не удалось очистить персональные переменные пользователя',
        ),
      );
    } finally {
      setIsResettingUserId(null);
    }
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
            onConfirm={() => void deleteTag(tag.id)}
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
    },
    {
      title: 'Логин',
      dataIndex: 'login',
      key: 'login',
    },
    {
      title: 'Пароль',
      key: 'password',
      render: () => '••••••••',
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
            title="Очистить персональные переменные?"
            description={`У пользователя «${user.login}» будут удалены сохранённые значения всех персональных переменных. ФИО, логин и пароль не изменятся.`}
            okText="Очистить"
            cancelText="Отмена"
            okButtonProps={{ danger: true }}
            onConfirm={() => void resetUserVariables(user.id)}
          >
            <Button
              type="text"
              danger
              icon={<ClearOutlined />}
              loading={isResettingUserId === user.id}
              aria-label={`Очистить переменные пользователя ${user.login}`}
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
                loading={isTagsLoading}
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
                loading={isUsersLoading}
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
        confirmLoading={isSavingTag}
        onCancel={closeTagModal}
        onOk={() => void handleTagSubmit(saveTag)()}
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
                <Input
                  {...field}
                  autoFocus
                  placeholder="Например, вакансия"
                />
              )}
            />
          </Form.Item>

          <Form.Item
  label="Цвет"
  validateStatus={tagErrors.color ? 'error' : ''}
  help={tagErrors.color?.message}
>
  <Controller
    name="color"
    control={tagControl}
    render={({ field }) => (
      <ColorPicker
        value={field.value}
        onChange={(color) => {
          field.onChange(color.toHexString());
        }}
        showText
      />
    )}
  />
</Form.Item>
        </Form>
      </Modal>

      <Modal
        title={
          editingUser
            ? 'Редактирование пользователя'
            : 'Новый пользователь'
        }
        open={isUserModalOpen}
        okText={editingUser ? 'Сохранить' : 'Добавить'}
        cancelText="Отмена"
        confirmLoading={isSavingUser}
        onCancel={closeUserModal}
        onOk={() => void handleUserSubmit(saveUser)()}
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
                <Input
                  {...field}
                  autoFocus
                  placeholder="Иванов Иван Иванович"
                />
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
            label={editingUser ? 'Новый пароль' : 'Пароль'}
            extra={
              editingUser
                ? 'Оставьте оба поля пустыми, если пароль менять не нужно.'
                : undefined
            }
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
            label={
              editingUser
                ? 'Повторите новый пароль'
                : 'Повторите пароль'
            }
            validateStatus={
              userErrors.confirmPassword ? 'error' : ''
            }
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
