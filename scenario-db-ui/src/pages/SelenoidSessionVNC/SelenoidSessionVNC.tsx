import { ArrowLeftOutlined } from '@ant-design/icons';
import { Alert, Button, Card, Empty, Spin, Table, Typography } from 'antd';
import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import RFB from '@novnc/novnc/core/rfb.js';

import styles from './SelenoidSessionVNC.module.css';

const { Title, Text } = Typography;

type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

type StepRow = {
   key: string;
   number: number;
   action: string;
   value: string;
};

const columns = [
   { title: '№ шага', dataIndex: 'number', key: 'number', width: 100 },
   { title: 'Название действия', dataIndex: 'action', key: 'action' },
   { title: 'Value', dataIndex: 'value', key: 'value' },
];

export function SelenoidSessionVNC() {
   const navigate = useNavigate();
   const { sessionId } = useParams<{ sessionId: string }>();
   const screenRef = useRef<HTMLDivElement>(null);
   const [status, setStatus] = useState<ConnectionStatus>('connecting');
   const [errorText, setErrorText] = useState<string | null>(null);
   const steps: StepRow[] = [];

   useEffect(() => {
      if (!sessionId || !screenRef.current) return;

      let active = true;
      let rfb: RFB | null = null;

      const onConnect = () => {
         if (active) {
            setStatus('connected');
            setErrorText(null);
         }
      };

      const onDisconnect = (event: Event) => {
         if (!active) return;

         const clean = (event as CustomEvent<{ clean: boolean }>).detail?.clean;
         setStatus(clean ? 'disconnected' : 'error');
         setErrorText(
            clean
               ? null
               : 'Не удалось подключиться к VNC или соединение прервалось.',
         );
      };

      const onSecurityFailure = (event: Event) => {
         if (!active) return;
         console.error('VNC security failure:', event);
         setStatus('error');
         setErrorText('VNC отклонил подключение. Подробности — в консоли браузера.');
      };

      const onCredentialsRequired = (event: Event) => {
         if (!active || !rfb) return;

         const detail = (event as CustomEvent<{ types?: string[] }>).detail;

         if (detail?.types?.includes('password')) {
            try {
               // Пароль VNC для локальной проверки с браузерным образом Selenoid.
               rfb.sendCredentials({ password: 'selenoid' });
            } catch (error) {
               console.error('Ошибка передачи VNC-пароля:', error);
               setStatus('error');
               setErrorText('Не удалось передать пароль VNC. Подробности — в консоли браузера.');
            }
            return;
         }

         console.error('Неизвестные учётные данные VNC:', detail);
         setStatus('error');
         setErrorText(
            `VNC запросил неподдерживаемые данные: ${detail?.types?.join(', ') || 'неизвестно'}`,
         );
      };

      setStatus('connecting');
      setErrorText(null);

      try {
         const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
         const url = `${protocol}//${window.location.host}/selenoid-vnc/${encodeURIComponent(sessionId)}`;

         console.info('VNC URL:', url);

         rfb = new RFB(screenRef.current, url);
         rfb.viewOnly = true;
         rfb.scaleViewport = true;
         rfb.addEventListener('connect', onConnect);
         rfb.addEventListener('disconnect', onDisconnect);
         rfb.addEventListener('securityfailure', onSecurityFailure);
         rfb.addEventListener('credentialsrequired', onCredentialsRequired);
      } catch (error) {
         console.error('Ошибка создания noVNC RFB:', error);
         setStatus('error');
         setErrorText(
            error instanceof Error
               ? `Не удалось создать VNC-подключение: ${error.message}`
               : 'Не удалось создать VNC-подключение. Подробности — в консоли браузера.',
         );
      }

      return () => {
         active = false;
         if (!rfb) return;
         rfb.removeEventListener('connect', onConnect);
         rfb.removeEventListener('disconnect', onDisconnect);
         rfb.removeEventListener('securityfailure', onSecurityFailure);
         rfb.removeEventListener('credentialsrequired', onCredentialsRequired);
         rfb.disconnect();
      };
   }, [sessionId]);

   return (
      <div className={styles.page}>
         <div className={styles.content}>
            <div className={styles.header}>
               <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)}>
                  Назад
               </Button>
               <div className={styles.heading}>
                  <Title level={2} className={styles.title}>
                     Сессия Selenoid
                  </Title>
                  {sessionId && (
                     <Text type="secondary" className={styles.sessionId}>
                        {sessionId}
                     </Text>
                  )}
               </div>
            </div>

            {!sessionId ? (
               <Alert
                  type="error"
                  showIcon
                  message="Не указан ID сессии в адресе страницы"
               />
            ) : (
               <div className={styles.columns}>
                  <Card title="VNC" className={styles.vncCard}>
                     <div className={styles.vncArea}>
                        <div className={styles.screen} ref={screenRef} />
                        {status === 'connecting' && (
                           <div className={styles.overlay}>
                              <Spin tip="Подключение к VNC…" size="large">
                                 <div />
                              </Spin>
                           </div>
                        )}
                        {(status === 'disconnected' || status === 'error') && (
                           <div className={styles.overlay}>
                              <Empty
                                 description={
                                    errorText ??
                                    'VNC-соединение закрыто. Возможно, сессия завершилась.'
                                 }
                              />
                           </div>
                        )}
                     </div>
                  </Card>

                  <Card title="Шаги" className={styles.stepsCard}>
                     <Table<StepRow>
                        rowKey="key"
                        columns={columns}
                        dataSource={steps}
                        pagination={false}
                        locale={{ emptyText: 'Шагов пока нет' }}
                        scroll={{ x: 420 }}
                     />
                  </Card>
               </div>
            )}
         </div>
      </div>
   );
}
