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
import {
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  loadBackendRequestUsage,
} from '../api/backendRequestMergeApi';
import {
  getJsonDiff,
} from '../model/backendRequestDiff';
import type {
  BackendRequestDto,
  BackendRequestUsage,
  ScenarioVariableMigration,
} from '../model/backendRequestMerge.types';
import type {
  BackendRequestMergeDraft,
} from '../model/backendRequestImport.types';
import {
  BackendRequestDtoEditor,
  type BackendRequestEditorTab,
} from './BackendRequestDtoEditor';
import {
  ScenarioVariableMigrationsEditor,
} from './ScenarioVariableMigrationsEditor';

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
  const [usage, setUsage] = useState<BackendRequestUsage | null>(
    null,
  );
  const [mergedRequest, setMergedRequest] =
    useState<BackendRequestDto>(() =>
      createInitialMergedRequest(existingRequest),
    );
  const [migrations, setMigrations] = useState<
    ScenarioVariableMigration[]
  >([]);
  const [isLoadingUsage, setIsLoadingUsage] = useState(false);
  const [activeEditorTab, setActiveEditorTab] =
    useState<BackendRequestEditorTab>('body');

  const existingRequestId = existingRequest.id;

  /*
   * Построчное сравнение request body.
   *
   * leftLines — для существующего метода.
   * rightLines — для импортируемого метода.
   *
   * В BackendRequestDtoEditor:
   * - different будет жёлтым на обеих сторонах;
   * - only-right будет зелёным только справа;
   * - only-left не будет дополнительно подсвечиваться.
   */
  const requestBodyDiff = useMemo(
    () =>
      getJsonDiff(
        existingRequest.requestBody,
        importedRequest.requestBody,
      ),
    [
      existingRequest.requestBody,
      importedRequest.requestBody,
    ],
  );

  /*
   * Построчное сравнение response body.
   *
   * Используется точно так же, как requestBodyDiff,
   * но только во вкладке Response body.
   */
  const responseBodyDiff = useMemo(
    () =>
      getJsonDiff(
        existingRequest.capturedResponseBody,
        importedRequest.capturedResponseBody,
      ),
    [
      existingRequest.capturedResponseBody,
      importedRequest.capturedResponseBody,
    ],
  );

  useEffect(() => {
    if (!open || typeof existingRequestId !== 'number') {
      return;
    }

    let isMounted = true;

    setIsLoadingUsage(true);
    setUsage(null);
    setMergedRequest({
      ...existingRequest,
    });
    setMigrations([]);
    setActiveEditorTab('body');

    const loadUsage = async () => {
      try {
        const loadedUsage = await loadBackendRequestUsage(
          existingRequestId,
        );

        if (!isMounted) {
          return;
        }

        setUsage(loadedUsage);
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
    // existingRequest используется для первоначального состояния
    // итогового метода в момент открытия merge-workspace.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, existingRequestId]);

  const saveMergeDraft = () => {
    const backendRequestId = existingRequest.id;

    if (typeof backendRequestId !== 'number') {
      message.error(
        'У существующего backend-метода отсутствует ID',
      );
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
        <Space
          direction="vertical"
          size={16}
          style={{ width: '100%' }}
        >
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
                activeTab={activeEditorTab}
                lockTabSelection
                diffSide="existing"
                requestBodyDiffLines={requestBodyDiff.leftLines}
                responseBodyDiffLines={responseBodyDiff.leftLines}
                onChange={() => undefined}
              />
            </div>

            <div>
              <Typography.Title level={5}>
                Итоговый метод
              </Typography.Title>

              {/*
               * Итоговый метод намеренно не получает:
               *
               * - diffSide;
               * - requestBodyDiffLines;
               * - responseBodyDiffLines.
               *
               * Он остаётся обычным редактируемым editor
               * без жёлтой или зелёной подсветки.
               */}
              <BackendRequestDtoEditor
                value={mergedRequest}
                activeTab={activeEditorTab}
                onActiveTabChange={setActiveEditorTab}
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
                activeTab={activeEditorTab}
                lockTabSelection
                diffSide="imported"
                requestBodyDiffLines={requestBodyDiff.rightLines}
                responseBodyDiffLines={responseBodyDiff.rightLines}
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
