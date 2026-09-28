import {
   DesktopOutlined,
   PlayCircleOutlined,
   ReloadOutlined,
   SearchOutlined,
} from '@ant-design/icons';
import {
   Alert,
   Button,
   Card,
   Empty,
   Form,
   Modal,
   Select,
   Space,
   Spin,
   Tag,
   Typography,
} from 'antd';
import axios from 'axios';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Virtuoso } from 'react-virtuoso';

import { http } from '../../shared/api/http';
import { AppInput } from '../../shared/ui/AppInput/AppInput';
import styles from './SelenoidSessionsListPage.module.css';

const { Title, Text } = Typography;

const REFRESH_INTERVAL_MS = 3000;

interface SelenoidSession {
   id: string;
   browser: string;
   version: string;
   user: string;
   vnc: boolean;
   screen: string;
   name: string;
}

interface SelenoidSessionsResponse {
   total: number;
   used: number;
   queued: number;
   pending: number;
   sessions: SelenoidSession[];
}

interface StartTestFormValues {
   scenarioId: string;
   domain: string;
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

function getSessionDisplayName(session: SelenoidSession): string {
   if (session.name.trim()) {
      return session.name;
   }

   return `${session.browser} ${session.version}`;
}

export function SelenoidSessionsListPage() {
   const navigate = useNavigate();
   const [startTestForm] = Form.useForm<StartTestFormValues>();
   const [searchValue, setSearchValue] = useState('');
   const [sessionsResponse, setSessionsResponse] =
      useState<SelenoidSessionsResponse | null>(null);
   const [isLoading, setIsLoading] = useState(true);
   const [isRefreshing, setIsRefreshing] = useState(false);
   const [errorText, setErrorText] = useState<string | null>(null);
   const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);
   const [isStartTestModalOpen, setIsStartTestModalOpen] = useState(false);

   const loadSessions = useCallback(
      async (showLoading: boolean) => {
         try {
            if (showLoading) {
               setIsLoading(true);
            } else {
               setIsRefreshing(true);
            }

            setErrorText(null);

            const { data } = await http.get<SelenoidSessionsResponse>(
               '/selenoid/sessions',
            );

            setSessionsResponse(data);
            setLastUpdatedAt(new Date());
         } catch (error) {
            setErrorText(
               getApiErrorMessage(
                  error,
                  'Не удалось загрузить список сессий Selenoid.',
               ),
            );
         } finally {
            setIsLoading(false);
            setIsRefreshing(false);
         }
      },
      [],
   );

   useEffect(() => {
      void loadSessions(true);

      const intervalId = window.setInterval(() => {
         void loadSessions(false);
      }, REFRESH_INTERVAL_MS);

      return () => {
         window.clearInterval(intervalId);
      };
   }, [loadSessions]);

   const filteredSessions = useMemo(() => {
      const normalizedSearch = searchValue
         .trim()
         .toLocaleLowerCase('ru-RU');

      const sessions = sessionsResponse?.sessions ?? [];

      if (!normalizedSearch) {
         return sessions;
      }

      return sessions.filter((session) => {
         const searchableValue = [
            session.id,
            session.name,
            session.browser,
            session.version,
            session.user,
            session.screen,
            session.vnc ? 'vnc доступен' : 'vnc недоступен',
         ]
            .join(' ')
            .toLocaleLowerCase('ru-RU');

         return searchableValue.includes(normalizedSearch);
      });
   }, [searchValue, sessionsResponse]);

   const openSession = (session: SelenoidSession) => {
      if (!session.vnc) return;
      navigate(`/selenoid/sessions/${encodeURIComponent(session.id)}`);
   };

   const closeStartTestModal = () => {
      setIsStartTestModalOpen(false);
      startTestForm.resetFields();
   };

   const handleStartTest = (_values: StartTestFormValues) => {
      // Пока только интерфейс: API запуска теста ещё не подключён.
      // Когда появится backend-метод, использовать выбранные scenarioId и domain здесь.
      closeStartTestModal();
   };

   const renderSession = (session: SelenoidSession) => {
      const displayName = getSessionDisplayName(session);

      return (
         <div className={styles.sessionItem}>
            {session.vnc ? (
               <button
                  type="button"
                  className={styles.sessionRowButton}
                  onClick={() => openSession(session)}
                  aria-label={`Открыть VNC-сессию ${displayName}`}
               >
                  <span className={styles.sessionIcon} aria-hidden="true">
                     <DesktopOutlined />
                  </span>

                  <span className={styles.sessionContent}>
                     <span className={styles.sessionTopRow}>
                        <span className={styles.sessionName}>{displayName}</span>
                        <Tag color="green" className={styles.sessionTag}>
                           VNC доступен
                        </Tag>
                     </span>

                     <span className={styles.sessionMeta}>
                        <span>Браузер: {session.browser} {session.version || '—'}</span>
                        <span>Пользователь: {session.user || '—'}</span>
                        <span>Экран: {session.screen || '—'}</span>
                     </span>

                     <span className={styles.sessionId}>{session.id}</span>
                  </span>
               </button>
            ) : (
               <div className={styles.sessionRowButton}>
                  <span className={styles.sessionIcon} aria-hidden="true">
                     <DesktopOutlined />
                  </span>

                  <span className={styles.sessionContent}>
                     <span className={styles.sessionTopRow}>
                        <span className={styles.sessionName}>{displayName}</span>
                        <Tag className={styles.sessionTag}>Без VNC</Tag>
                     </span>

                     <span className={styles.sessionMeta}>
                        <span>Браузер: {session.browser} {session.version || '—'}</span>
                        <span>Пользователь: {session.user || '—'}</span>
                        <span>Экран: {session.screen || '—'}</span>
                     </span>

                     <span className={styles.sessionId}>{session.id}</span>
                  </span>
               </div>
            )}
         </div>
      );
   };

   return (
      <div className={styles.page}>
         <div className={styles.content}>
            <div className={styles.header}>
               <div>
                  <Title className={styles.title} level={2}>
                     Сессии Selenoid
                  </Title>

                  <Text type="secondary">
                     Активные браузерные сессии в кластере
                  </Text>
               </div>

               <Space size={8} className={styles.headerActions}>
                  <Button
                     icon={<ReloadOutlined spin={isRefreshing} />}
                     loading={isRefreshing}
                     onClick={() => void loadSessions(false)}
                  >
                     Обновить
                  </Button>
                  <Button
                     type="primary"
                     icon={<PlayCircleOutlined />}
                     onClick={() => setIsStartTestModalOpen(true)}
                  >
                     Запустить тест
                  </Button>
               </Space>
            </div>

            <div className={styles.searchRow}>
               <AppInput
                  allowClear
                  placeholder="Поиск по имени, браузеру, пользователю или ID сессии"
                  prefix={<SearchOutlined />}
                  value={searchValue}
                  onChange={(event) => setSearchValue(event.target.value)}
               />
            </div>

            {sessionsResponse && (
               <div className={styles.statistics}>
                  <Text type="secondary">
                     Всего слотов: <Text strong>{sessionsResponse.total}</Text>
                  </Text>

                  <Text type="secondary">
                     Используется: <Text strong>{sessionsResponse.used}</Text>
                  </Text>

                  <Text type="secondary">
                     В очереди: <Text strong>{sessionsResponse.queued}</Text>
                  </Text>

                  <Text type="secondary">
                     Ожидают: <Text strong>{sessionsResponse.pending}</Text>
                  </Text>

                  <Text className={styles.counter} type="secondary">
                     Найдено сессий: {filteredSessions.length}
                  </Text>

                  {lastUpdatedAt && (
                     <Text className={styles.updatedAt} type="secondary">
                        Обновлено: {lastUpdatedAt.toLocaleTimeString('ru-RU')}
                     </Text>
                  )}
               </div>
            )}

            {errorText && (
               <Alert
                  showIcon
                  className={styles.alert}
                  message="Не удалось обновить сессии Selenoid"
                  description={errorText}
                  type="error"
               />
            )}

            <Card className={styles.listCard}>
               {isLoading ? (
                  <div className={styles.loading}>
                     <Spin size="large" />
                  </div>
               ) : filteredSessions.length === 0 ? (
                  <div className={styles.empty}>
                     <Empty
                        description={
                           searchValue.trim()
                              ? 'По вашему запросу сессии не найдены'
                              : 'Сейчас нет активных сессий Selenoid'
                        }
                     />
                  </div>
               ) : (
                  <Virtuoso
                     className={styles.virtuoso}
                     data={filteredSessions}
                     computeItemKey={(_, session) => session.id}
                     itemContent={(_, session) => renderSession(session)}
                  />
               )}
            </Card>
         </div>

         <Modal
            title="Запустить тест"
            open={isStartTestModalOpen}
            onCancel={closeStartTestModal}
            onOk={() => startTestForm.submit()}
            okText="Запустить"
            cancelText="Отмена"
            okButtonProps={{ disabled: true }}
            destroyOnHidden
         >
            <Form<StartTestFormValues>
               form={startTestForm}
               layout="vertical"
               onFinish={handleStartTest}
            >
               <Form.Item
                  name="scenarioId"
                  label="Сценарий для запуска"
                  rules={[{ required: true, message: 'Выберите сценарий' }]}
               >
                  <Select
                     showSearch
                     optionFilterProp="label"
                     placeholder="Выберите сценарий"
                     options={[]}
                  />
               </Form.Item>

               <Form.Item
                  name="domain"
                  label="Домен"
                  rules={[{ required: true, message: 'Выберите домен' }]}
               >
                  <Select
                     showSearch
                     optionFilterProp="label"
                     placeholder="Выберите домен"
                     options={[]}
                  />
               </Form.Item>
            </Form>
            <Text type="secondary">
               Загрузка вариантов и запуск теста будут подключены позже.
            </Text>
         </Modal>
      </div>
   );
}
