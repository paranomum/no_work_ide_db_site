import {
  ArrowLeftOutlined,
  SaveOutlined,
} from '@ant-design/icons';
import {
  Alert,
  Button,
  Modal,
  Space,
  Spin,
  Typography,
  message,
} from 'antd';
import axios from 'axios';
import { useEffect, useState } from 'react';

import {
  loadBackendRequestUsage,
} from '../api/backendRequestMergeApi';
import type {
  BackendRequestDto,
  BackendRequestUsage,
  ScenarioVariableMigration,
} from '../model/backendRequestMerge.types';
import type {
  BackendRequestMergeDraft,
} from '../model/backendRequestImport.types';
import { BackendRequestDtoEditor } from './BackendRequestDtoEditor';
import { ScenarioVariableMigrationsEditor } from './ScenarioVariableMigrationsEditor';

interface BackendRequestMergeWorkspaceProps {
  open: boolean;
  existingRequest: BackendRequestDto;
  importedRequest: BackendRequestDto;
  onCancel: () => void;
  onSaved: (draft: BackendRequestMergeDraft) => void;
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

function createInitialMergedRequest(
  existingRequest: BackendRequestDto,
): BackendRequestDto {
  return {
    ...existingRequest,
  };
}

export function BackendRequestMergeWorkspace({
  open,
  existingRequest,
  importedRequest,
  onCancel,
  onSaved,
}: BackendRequestMergeWorkspaceProps) {
  const [usage, setUsage] = useState<BackendRequestUsage | null>(null);
  const [mergedRequest, setMergedRequest] =
    useState<BackendRequestDto>(() =>
      createInitialMergedRequest(existingRequest),
    );
  const [migrations, setMigrations] = useState<
    ScenarioVariableMigration[]
  >([]);
  const [isLoadingUsage, setIsLoadingUsage] = useState(false);

  useEffect(() => {
  const backendRequestId = existingRequest.id;

  if (!open || typeof backendRequestId !== 'number') {
    return;
  }

  let isMounted = true;

  const loadUsage = async () => {
    try {
      setIsLoadingUsage(true);

      const loadedUsage = await loadBackendRequestUsage(
        backendRequestId,
      );

      if (isMounted) {
        setUsage(loadedUsage);
        setMergedRequest(
          createInitialMergedRequest(existingRequest),
        );
        setMigrations([]);
      }
    } catch (error) {
      if (isMounted) {
        message.error(
          getApiErrorMessage(
            error,
            'Не удалось загрузить список связанных сценариев',
          ),
        );
      }
    } finally {
      if (isMounted) {
        setIsLoadingUsage(false);
      }
    }
  };

  void loadUsage();

  return () => {
    isMounted = false;
  };
}, [existingRequest, open]);

  const saveMergeDraft = () => {
  const backendRequestId = existingRequest.id;

  if (typeof backendRequestId !== 'number') {
    message.error('У существующего backend-метода отсутствует ID');
    return;
  }

  if (!mergedRequest.name.trim()) {
    message.error('Укажите название backend-метода');
    return;
  }

  if (!mergedRequest.url.trim()) {
    message.error('Укажите URL backend-метода');
    return;
  }

  onSaved({
    mergedRequest: {
      ...mergedRequest,
      id: backendRequestId,
    },
    scenarioVariableMigrations: migrations,
  });
};

  return (
    <Modal
      open={open}
      title={`Объединение метода: ${existingRequest.name}`}
      width="98vw"
      style={{ top: 12 }}
      destroyOnHidden
      footer={
        <Space>
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={onCancel}
          >
            Назад к сравнению
          </Button>

          <Button
            type="primary"
            icon={<SaveOutlined />}
            disabled={isLoadingUsage}
            onClick={saveMergeDraft}
          >
            Применить в импорте
          </Button>
        </Space>
      }
      onCancel={onCancel}
    >
      <Alert
        type="warning"
        showIcon
        message="Черновик объединения"
        description="Изменения пока не сохранены в библиотеке. Они будут применены только после нажатия «Создать сценарий»."
        style={{ marginBottom: 16 }}
      />

      {isLoadingUsage ? (
        <div
          style={{
            minHeight: 320,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Spin size="large" />
        </div>
      ) : (
        <Space direction="vertical" size={16} style={{ width: '100%' }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns:
                'minmax(260px, 1fr) minmax(420px, 1.45fr) minmax(260px, 1fr)',
              gap: 16,
              alignItems: 'start',
            }}
          >
            <div>
              <Typography.Title level={5}>
                Существующий
              </Typography.Title>

              <BackendRequestDtoEditor
                value={existingRequest}
                disabled
                onChange={() => undefined}
              />
            </div>

            <div>
              <Typography.Title level={5}>
                Итоговый метод
              </Typography.Title>

              <BackendRequestDtoEditor
                value={mergedRequest}
                onChange={setMergedRequest}
              />
            </div>

            <div>
              <Typography.Title level={5}>
                Импортируемый
              </Typography.Title>

              <BackendRequestDtoEditor
                value={importedRequest}
                disabled
                onChange={() => undefined}
              />
            </div>
          </div>

          <ScenarioVariableMigrationsEditor
            scenarios={usage?.scenarios ?? []}
            value={migrations}
            onChange={setMigrations}
          />
        </Space>
      )}
    </Modal>
  );
}
