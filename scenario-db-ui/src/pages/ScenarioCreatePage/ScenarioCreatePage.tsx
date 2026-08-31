import {
  ArrowLeftOutlined,
  SaveOutlined,
  UploadOutlined,
} from '@ant-design/icons';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Alert,
  Button,
  Card,
  Form,
  Input,
  Space,
  Spin,
  Tabs,
  Typography,
  Upload,
  message,
} from 'antd';
import axios from 'axios';
import { useEffect, useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import {
  useBackendRequestImport,
} from '../../features/backendRequestMerge/hooks/useBackendRequestImport';
import {
  parseImportedBackendRequests,
} from '../../features/backendRequestMerge/model/importedBackendRequest';
import type {
  BackendRequestDto,
} from '../../features/backendRequestMerge/model/backendRequestMerge.types';
import {
  BackendRequestDiffModal,
} from '../../features/backendRequestMerge/ui/BackendRequestDiffModal';
import {
  BackendRequestMergeWorkspace,
} from '../../features/backendRequestMerge/ui/BackendRequestMergeWorkspace';
import {
  useScenarioCustomMethodImport,
} from '../../features/scenarioCustomMethodImport/hooks/useScenarioCustomMethodImport';
import {
  MissingScenarioCustomMethodsModal,
} from '../../features/scenarioCustomMethodImport/ui/MissingScenarioCustomMethodsModal';
import {
  ScenarioCustomMethodTable,
} from '../../features/scenarioCustomMethodImport/ui/ScenarioCustomMethodTable';
import {
  persistScenarioImport,
} from '../../features/scenarioImport/model/persistScenarioImport';
import {
  ScenarioJsonEditor,
} from '../../features/scenarioImport/ui/ScenarioJsonEditor';
import {
  useRelatedScenarioVariableUsages,
} from '../../features/scenarioCustomMethodImport/hooks/useRelatedScenarioVariableUsages';
import {
  CreateVariableTable,
} from '../../features/variableImport/ui/CreateVariableTable';
import { http } from '../../shared/api/http';
import type {
  TagResponse,
} from '../../shared/types/scenario';
import type {
  VariableDto,
} from '../../shared/types/variable';
import { AppTextArea } from '../../shared/ui/AppInput/AppTextArea';
import { AppSelectMultiple } from '../../shared/ui/AppSelectMultiple/AppSelectMultiple';
import styles from './ScenarioCreatePage.module.css';
import {
  useVariableImport,
} from '../../features/variableImport/hooks/useVariableImport';

const { Title, Text } = Typography;

const createScenarioSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Введите название сценария')
    .max(255, 'Название не должно быть длиннее 255 символов'),
  description: z
    .string()
    .max(2000, 'Описание не должно быть длиннее 2000 символов'),
  tagIds: z.array(z.string()),
});

type CreateScenarioFormValues = z.infer<typeof createScenarioSchema>;

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

function getScenarioNameFromFileName(fileName: string): string {
  return fileName.replace(/\.json$/i, '').trim();
}

function isJsonObject(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value)
  );
}

export function ScenarioCreatePage() {
  const navigate = useNavigate();

  const [tags, setTags] = useState<TagResponse[]>([]);
  const [isTagsLoading, setIsTagsLoading] = useState(true);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parsedPayload, setParsedPayload] = useState<
    Record<string, unknown> | null
  >(null);

  const [existingBackendRequests, setExistingBackendRequests] = useState<
    BackendRequestDto[]
  >([]);

  const backendImport = useBackendRequestImport({
  existingBackendRequests,
});

const customMethodImport = useScenarioCustomMethodImport();

  const [platformVariables, setPlatformVariables] = useState<
    VariableDto[]
  >([]);

    const variableImport = useVariableImport({
  platformVariables,
  setPayload: setParsedPayload,
  replaceBackendResolutions:
    backendImport.replaceResolutions,
});

  const relatedScenarioVariableUsages =
  useRelatedScenarioVariableUsages(customMethodImport.resolutions);

  const [isVariablesLoading, setIsVariablesLoading] = useState(false);
  const [isParsingFile, setIsParsingFile] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<CreateScenarioFormValues>({
    resolver: zodResolver(createScenarioSchema),
    defaultValues: {
      name: '',
      description: '',
      tagIds: [],
    },
  });

  useEffect(() => {
    let isMounted = true;

    const loadTags = async () => {
      try {
        setIsTagsLoading(true);

        const { data } = await http.get<TagResponse[]>('/tags');

        if (isMounted) {
          setTags(data);
        }
      } catch (error) {
        if (isMounted) {
          message.error(
            getApiErrorMessage(
              error,
              'Не удалось загрузить список тегов',
            ),
          );
        }
      } finally {
        if (isMounted) {
          setIsTagsLoading(false);
        }
      }
    };

    void loadTags();

    return () => {
      isMounted = false;
    };
  }, []);

  const resetImportedFileState = () => {
    setSelectedFile(null);
    setParsedPayload(null);
    setExistingBackendRequests([]);
    backendImport.reset();
    variableImport.setResolutions([]);
    setPlatformVariables([]);
    customMethodImport.reset();
  };

  const selectFile = async (file: File) => {
    const isJsonFile =
      file.name.toLocaleLowerCase('ru-RU').endsWith('.json') ||
      file.type === 'application/json';

    if (!isJsonFile) {
      message.error('Можно выбрать только JSON-файл');
      return Upload.LIST_IGNORE;
    }

    try {
      resetImportedFileState();
      setIsParsingFile(true);
      setIsVariablesLoading(true);

      const rawJson = await file.text();
      const nextParsedPayload: unknown = JSON.parse(rawJson);

      if (!isJsonObject(nextParsedPayload)) {
        message.error(
          'JSON сценария должен содержать объект в корневом уровне',
        );
        return Upload.LIST_IGNORE;
      }

      const importedBackendRequests =
        parseImportedBackendRequests(nextParsedPayload);

      const [
  backendRequestsResponse,
  variablesResponse,
] = await Promise.all([
  http.get<BackendRequestDto[]>('/backend-requests'),
  http.get<VariableDto[]>('/variables'),
]);

const backendRequestsFromApi = backendRequestsResponse.data;
const variablesFromApi = variablesResponse.data;

      const nextBackendImportState = backendImport.initialize(
  importedBackendRequests,
  backendRequestsFromApi,
);

      const initialVariableResolutions =
  variableImport.rebuildResolutions(
    nextParsedPayload,
    nextBackendImportState.resolutions,
    variablesFromApi,
  );

  const initialCustomMethodResolutions =
  await customMethodImport.initializeFromApi(
    nextParsedPayload,
  );

      setSelectedFile(file);
      setParsedPayload(nextParsedPayload);
      setExistingBackendRequests(backendRequestsFromApi);
      setPlatformVariables(variablesFromApi);
      variableImport.setResolutions(initialVariableResolutions);

      const nameFromFile = getScenarioNameFromFileName(file.name);

      if (nameFromFile) {
        setValue('name', nameFromFile, {
          shouldDirty: true,
          shouldValidate: true,
        });
      }

      message.success(
        `Файл разобран. Backend-методов: ${importedBackendRequests.length}. Переменных: ${initialVariableResolutions.length}. Переиспользуемых сценариев: ${initialCustomMethodResolutions.length}.`,
      );
    } catch (error) {
      resetImportedFileState();

      if (error instanceof SyntaxError) {
        message.error('Выбранный файл содержит некорректный JSON');
      } else {
        message.error(
          getApiErrorMessage(
            error,
            'Не удалось разобрать файл сценария',
          ),
        );
      }

      return Upload.LIST_IGNORE;
    } finally {
      setIsParsingFile(false);
      setIsVariablesLoading(false);
    }

    return false;
  };

  const cancelImport = () => {
    resetImportedFileState();
    message.info('Импорт сценария отменён');
  };

  const unresolvedVariables =
  variableImport.unresolvedResolutions;

  const unresolvedCustomMethods =
  customMethodImport.unresolvedResolutions;

const existingCustomMethodsCount =
  customMethodImport.resolutions.filter(
    (resolution) => resolution.kind === 'existing',
  ).length;

const selectedCustomMethodsCount =
  customMethodImport.resolutions.filter(
    (resolution) => resolution.kind === 'selected-existing',
  ).length;

  const existingVariablesCount = useMemo(
    () =>
      variableImport.resolutions.filter(
        (resolution) => resolution.kind === 'existing',
      ).length,
    [variableImport.resolutions],
  );

  const selectedExistingVariablesCount = useMemo(
    () =>
      variableImport.resolutions.filter(
        (resolution) =>
          resolution.kind === 'selected-existing',
      ).length,
    [variableImport.resolutions],
  );

  const newUserVariablesCount = useMemo(
    () =>
      variableImport.resolutions.filter(
        (resolution) =>
          resolution.kind === 'create-new-user',
      ).length,
    [variableImport.resolutions],
  );

  const isBackendImportResolved =
  selectedFile !== null &&
  parsedPayload !== null &&
  backendImport.isResolved;

const resolvedBackendMethodsCount =
  backendImport.resolvedCount;

const activeConflict = backendImport.activeConflict;

const existingConflictRequest =
  backendImport.existingConflictRequest;

  const isVariableImportResolved =
  selectedFile !== null &&
  !isVariablesLoading &&
  variableImport.isResolved;

  const isCustomMethodImportResolved =
  selectedFile !== null &&
  !customMethodImport.isLoading &&
  customMethodImport.isResolved;

  const applyJsonPayload = async (
    nextPayload: Record<string, unknown>,
  ) => {
    const importedBackendRequests =
      parseImportedBackendRequests(nextPayload);

    const nextBackendImportState = backendImport.initialize(
        importedBackendRequests,
        existingBackendRequests,
      );

    const nextVariableResolutions =
  variableImport.rebuildResolutions(
    nextPayload,
    nextBackendImportState.resolutions,
    platformVariables,
    variableImport.resolutions,
  );

    setParsedPayload(nextPayload);
    try {
  await customMethodImport.refresh(nextPayload);
} catch (error) {
  message.error(
    getApiErrorMessage(
      error,
      'Не удалось обновить список сценариев',
    ),
  );
  return;
}
    variableImport.setResolutions(nextVariableResolutions);

    message.success(
      'JSON применён. Зависимости сценария пересчитаны.',
    );
  };

  const createScenario = async (
    values: CreateScenarioFormValues,
  ) => {
    if (!parsedPayload) {
      message.error('Выберите и дождитесь разбора JSON-файла');
      return;
    }

    if (!isBackendImportResolved) {
      message.error(
        'Сначала выберите действие для всех конфликтов backend-методов',
      );
      return;
    }

    if (!isVariableImportResolved) {
      message.error(
        'Заполните значения сценарных переменных и разрешите пользовательские переменные',
      );
      return;
    }

    if (!isCustomMethodImportResolved) {
      message.error(
        'Сначала разрешите все переиспользуемые сценарии',
      );
      return;
    }

    try {
      setIsCreating(true);

      const createdScenario = await persistScenarioImport({
  payload: parsedPayload,
  backendResolutions: backendImport.state.resolutions,
  variableResolutions: variableImport.resolutions,
  customMethodResolutions:
  customMethodImport.resolutions,
  values: {
    name: values.name.trim(),
    description: values.description.trim(),
    tagIds: values.tagIds.map(Number),
  },
});

      message.success(
        'Сценарий, backend-методы, переменные и связи сохранены',
      );

      navigate(`/scenarios/${createdScenario.id}`, {
        replace: true,
      });
    } catch (error) {
      message.error(
        getApiErrorMessage(
          error,
          'Не удалось полностью сохранить сценарий. Часть сущностей могла быть создана.',
        ),
      );
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <main className={styles.page}>
      <div className={styles.content}>
        <Space className={styles.pageTitle} size={12}>
          <Button
            type="text"
            size="large"
            icon={<ArrowLeftOutlined />}
            aria-label="Вернуться к списку сценариев"
            disabled={isCreating || isParsingFile}
            onClick={() => navigate(-1)}
          />

          <Title level={2} style={{ margin: 0 }}>
            Новый сценарий
          </Title>
        </Space>

        <Tabs
          defaultActiveKey="main"
          items={[
            {
              key: 'main',
              label: 'Основная информация',
              children: (
                <Card>
                  <Form
                    layout="vertical"
                    requiredMark={false}
                    onFinish={handleSubmit(createScenario)}
                  >
                    <Form.Item
                      label="JSON-файл сценария"
                      required
                      extra="Файл разбирается в браузере: backend-методы, пользовательские переменные и переиспользуемые сценарии разрешаются до сохранения."
                    >
                      <Upload
                        accept=".json,application/json"
                        maxCount={1}
                        disabled={isCreating || isParsingFile}
                        beforeUpload={selectFile}
                        onRemove={resetImportedFileState}
                      >
                        <Button
                          icon={<UploadOutlined />}
                          disabled={isCreating || isParsingFile}
                          loading={isParsingFile}
                        >
                          Выбрать JSON-файл
                        </Button>
                      </Upload>

                      {!selectedFile && !isParsingFile && (
                        <Text type="secondary">
                          Файл ещё не выбран
                        </Text>
                      )}
                    </Form.Item>

                    {selectedFile && (
                      <Alert
                        type={
                          isBackendImportResolved
                            ? 'success'
                            : 'warning'
                        }
                        showIcon
                        style={{ marginBottom: 24 }}
                        message={
                          isBackendImportResolved
                            ? 'Backend-методы разрешены'
                            : 'Нужно обработать конфликты backend-методов'
                        }
                        description={
                          isBackendImportResolved
                            ? `Разрешено методов: ${resolvedBackendMethodsCount}. Новые методы будут созданы, а объединённые — обновлены только после нажатия «Создать сценарий».`
                            : `Осталось конфликтов: ${backendImport.state.pendingConflicts.length}.`
                        }
                      />
                    )}

                    {selectedFile && customMethodImport.isLoading && (
                      <Alert
                        type="info"
                        showIcon
                        style={{ marginBottom: 24 }}
                        message="Проверяем переиспользуемые сценарии"
                      />
                    )}

                    {selectedFile && !customMethodImport.isLoading && (
                      <Alert
                        type={
                          isCustomMethodImportResolved
                            ? 'success'
                            : 'warning'
                        }
                        showIcon
                        style={{ marginBottom: 24 }}
                        message={
                          isCustomMethodImportResolved
                            ? 'Переиспользуемые сценарии разрешены'
                            : 'Нужно разрешить переиспользуемые сценарии'
                        }
                        description={
                          isCustomMethodImportResolved
                            ? `Всего: ${customMethodImport.resolutions.length}. Найдено автоматически: ${existingCustomMethodsCount}. Выбрано вручную: ${selectedCustomMethodsCount}.`
                            : `Не найдено сценариев: ${unresolvedCustomMethods.length}. Выберите существующие сценарии или создайте недостающие и нажмите «Проверить снова».`
                        }
                      />
                    )}

                    {selectedFile && !customMethodImport.isLoading && (
                      <ScenarioCustomMethodTable
                        resolutions={customMethodImport.resolutions}
                        availableScenarios={
                          customMethodImport.availableScenarios
                        }
                        disabled={isCreating || isParsingFile}
                        onSelectScenario={customMethodImport.selectScenario}
                      />
                    )}

                    {selectedFile && isVariablesLoading && (
                      <Alert
                        type="info"
                        showIcon
                        style={{ marginBottom: 24 }}
                        message="Проверяем пользовательские переменные в библиотеке"
                      />
                    )}

                    {selectedFile && !isVariablesLoading && (
                      <Alert
                        type={
                          isVariableImportResolved
                            ? 'success'
                            : 'warning'
                        }
                        showIcon
                        style={{ marginBottom: 24 }}
                        message={
                          isVariableImportResolved
                            ? 'Переменные разрешены'
                            : 'Нужно заполнить или разрешить переменные'
                        }
                        description={
                          isVariableImportResolved
                            ? `Всего: ${variableImport.resolutions.length}. Сценарные переменные создаются вместе со сценарием. Найдено пользовательских: ${existingVariablesCount}. Выбрано вручную: ${selectedExistingVariablesCount}. Будет создано пользовательских: ${newUserVariablesCount}.`
                            : `Требуют внимания: ${unresolvedVariables.length}. Для сценарной переменной обязательно заполните значение. Для пользовательской переменной выберите существующую переменную платформы либо подтвердите создание новой.`
                        }
                      />
                    )}

                    {selectedFile && !isVariablesLoading && (
                      <CreateVariableTable
  resolutions={variableImport.resolutions}
  platformVariables={platformVariables}
  disabled={isCreating || isParsingFile}
  onSelectPlatformVariable={
    variableImport.selectPlatformVariable
  }
  onCreateUserVariable={
    variableImport.markUserVariableForCreation
  }
  onResetResolution={
    variableImport.resetVariableResolution
  }
  onChangeVariableType={
    variableImport.changeVariableType
  }
  onChangeVariableValue={
    variableImport.changeVariableValue
  }
  onDeleteVariable={variableImport.deleteVariable}
  getRelatedScenarioUsages={
    relatedScenarioVariableUsages.getUsages
  }
  isRelatedScenarioVariablesLoading={
  relatedScenarioVariableUsages.isLoading
}
relatedScenarioVariablesError={
  relatedScenarioVariableUsages.error
}
/>
                    )}

                    <Form.Item
                      label="Название"
                      required
                      validateStatus={errors.name ? 'error' : ''}
                      help={errors.name?.message}
                    >
                      <Controller
                        name="name"
                        control={control}
                        render={({ field }) => (
                          <Input
                            {...field}
                            autoFocus
                            disabled={isCreating || isParsingFile}
                            placeholder="Например, создание вакансии"
                          />
                        )}
                      />
                    </Form.Item>

                    <Form.Item
                      label="Описание"
                      validateStatus={
                        errors.description ? 'error' : ''
                      }
                      help={errors.description?.message}
                    >
                      <Controller
                        name="description"
                        control={control}
                        render={({ field }) => (
                          <AppTextArea
                            {...field}
                            disabled={isCreating || isParsingFile}
                            autoSize={{
                              minRows: 5,
                              maxRows: 14,
                            }}
                            placeholder="Кратко опишите назначение сценария"
                          />
                        )}
                      />
                    </Form.Item>

                    <Form.Item label="Теги">
                      {isTagsLoading ? (
                        <Spin size="small" />
                      ) : (
                        <Controller
                          name="tagIds"
                          control={control}
                          render={({ field }) => (
                            <AppSelectMultiple
                              allowClear
                              size="large"
                              disabled={isCreating || isParsingFile}
                              placeholder="Выберите теги"
                              value={field.value}
                              options={tags.map((tag) => ({
                                value: String(tag.id),
                                label: tag.name,
                              }))}
                              onChange={field.onChange}
                            />
                          )}
                        />
                      )}
                    </Form.Item>

                    <Space>
                      <Button
                        type="primary"
                        htmlType="submit"
                        icon={<SaveOutlined />}
                        loading={isCreating}
                        disabled={
                          !selectedFile ||
                          !parsedPayload ||
                          !isBackendImportResolved ||
                          !isVariableImportResolved ||
                          !isCustomMethodImportResolved ||
                          isParsingFile ||
                          isCreating
                        }
                      >
                        Создать сценарий
                      </Button>

                      <Button
                        disabled={isCreating || isParsingFile}
                        onClick={() => navigate(-1)}
                      >
                        Отмена
                      </Button>
                    </Space>
                  </Form>
                </Card>
              ),
            },
            {
              key: 'details',
              label: 'Подробнее',
              children: (
                <ScenarioJsonEditor
                  payload={parsedPayload}
                  disabled={isCreating || isParsingFile}
                  onApply={applyJsonPayload}
                />
              ),
            },
          ]}
        />
      </div>

      {activeConflict && existingConflictRequest && (
        <BackendRequestDiffModal
          open={!backendImport.isMergeWorkspaceOpen}
          existingRequest={existingConflictRequest}
          importedRequest={activeConflict}
          onCancelImport={cancelImport}
          onUseExisting={() => {
  const nextState = backendImport.useExisting();

  if (!nextState || !parsedPayload) {
    return;
  }

  variableImport.setResolutions((currentResolutions) =>
    variableImport.rebuildResolutions(
      parsedPayload,
      nextState.resolutions,
      platformVariables,
      currentResolutions,
    ),
  );
}}
          onRenameImported={() => {
  const result = backendImport.renameImported();

  if (!result || !parsedPayload) {
    return;
  }

  variableImport.setResolutions((currentResolutions) =>
    variableImport.rebuildResolutions(
      parsedPayload,
      result.nextState.resolutions,
      platformVariables,
      currentResolutions,
    ),
  );

  message.info(
    `Импортируемый метод будет создан как «${result.nextName}»`,
  );
}}
          onOpenMergeWorkspace={backendImport.openMergeWorkspace}
        />
      )}

      {activeConflict && existingConflictRequest && (
        <BackendRequestMergeWorkspace
          open={backendImport.isMergeWorkspaceOpen}
          existingRequest={existingConflictRequest}
          importedRequest={activeConflict}
          onCancel={backendImport.closeMergeWorkspace}
          onSaved={(mergeDraft) => {
  const nextState = backendImport.saveMerged(mergeDraft);

  if (!nextState || !parsedPayload) {
    return;
  }

  variableImport.setResolutions((currentResolutions) =>
    variableImport.rebuildResolutions(
      parsedPayload,
      nextState.resolutions,
      platformVariables,
      currentResolutions,
    ),
  );
}}
        />
      )}

      <MissingScenarioCustomMethodsModal
  open={customMethodImport.isMissingModalOpen}
  missingMethodNames={
    customMethodImport.unresolvedMethodNames
  }
  isRefreshing={customMethodImport.isLoading}
  onClose={customMethodImport.closeMissingModal}
  onOpenScenarioCreate={
    customMethodImport.openScenarioCreateInNewTab
  }
  onRefresh={() => {
    if (!parsedPayload) {
      return;
    }

    void customMethodImport.refresh(parsedPayload).catch(
      (error: unknown) => {
        message.error(
          getApiErrorMessage(
            error,
            'Не удалось обновить список сценариев',
          ),
        );
      },
    );
  }}
/>
    </main>
  );
}
