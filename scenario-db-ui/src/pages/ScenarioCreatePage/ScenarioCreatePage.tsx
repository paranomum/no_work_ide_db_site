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
  createBackendRequestImportState,
  getNextAvailableMethodName,
  resolveBackendRequestConflict,
} from '../../features/backendRequestMerge/model/backendRequestImportPlan';
import type {
  BackendRequestImportState,
  BackendRequestMergeDraft,
  BackendRequestResolution,
} from '../../features/backendRequestMerge/model/backendRequestImport.types';
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
  createScenarioCustomMethodResolutions,
} from '../../features/scenarioCustomMethodImport/model/scenarioCustomMethodImportPlan';
import {
  parseImportedScenarioCustomMethods,
} from '../../features/scenarioCustomMethodImport/model/importedScenarioCustomMethod';
import type {
  ScenarioCustomMethodResolution,
} from '../../features/scenarioCustomMethodImport/model/scenarioCustomMethodImport.types';
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
  parseImportedScenarioVariables,
  type ImportedScenarioVariable,
} from '../../features/variableImport/model/importedScenarioVariable';
import type {
  VariableResolution,
} from '../../features/variableImport/model/variableImport.types';
import {
  CreateVariableTable,
} from '../../features/variableImport/ui/CreateVariableTable';
import { http } from '../../shared/api/http';
import type {
  ScenarioResponse,
  TagResponse,
} from '../../shared/types/scenario';
import type {
  VariableDto,
} from '../../shared/types/variable';
import { AppTextArea } from '../../shared/ui/AppInput/AppTextArea';
import { AppSelectMultiple } from '../../shared/ui/AppSelectMultiple/AppSelectMultiple';
import styles from './ScenarioCreatePage.module.css';

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

const initialBackendImportState: BackendRequestImportState = {
  resolutions: [],
  pendingConflicts: [],
  activeConflict: null,
  existingConflictRequest: null,
};

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

function createVariableResolution(
  importedVariable: ImportedScenarioVariable,
  platformVariables: VariableDto[],
  previousResolution?: VariableResolution,
): VariableResolution {
  if (!importedVariable.isUserVariable) {
    return {
      importedVariable,
      targetVariable: null,
      kind: 'existing',
    };
  }

  if (
    previousResolution &&
    previousResolution.importedVariable.isUserVariable
  ) {
    if (previousResolution.kind === 'create-new-user') {
      return {
        importedVariable,
        targetVariable: null,
        kind: 'create-new-user',
      };
    }

    if (
      previousResolution.targetVariable &&
      previousResolution.targetVariable.isUserVariable
    ) {
      return {
        importedVariable,
        targetVariable: previousResolution.targetVariable,
        kind:
          previousResolution.kind === 'existing'
            ? 'existing'
            : 'selected-existing',
      };
    }
  }

  const platformVariableWithSameName = platformVariables.find(
    (variable) =>
      variable.isUserVariable &&
      variable.name.toLocaleLowerCase('ru-RU') ===
        importedVariable.name.toLocaleLowerCase('ru-RU'),
  );

  if (platformVariableWithSameName) {
    return {
      importedVariable,
      targetVariable: platformVariableWithSameName,
      kind: 'existing',
    };
  }

  return {
    importedVariable,
    targetVariable: null,
    kind: 'unresolved',
  };
}

function rebuildVariableResolutions(
  payload: Record<string, unknown>,
  backendResolutions: BackendRequestResolution[],
  platformVariables: VariableDto[],
  currentResolutions: VariableResolution[],
): VariableResolution[] {
  const previousResolutionsByName = new Map(
    currentResolutions.map((resolution) => [
      resolution.importedVariable.name.toLocaleLowerCase('ru-RU'),
      resolution,
    ]),
  );

  const resolvedBackendRequests = backendResolutions.map(
    (resolution) => resolution.resolvedRequest,
  );

  const importedVariables = parseImportedScenarioVariables(
    payload,
    resolvedBackendRequests,
  );

  return importedVariables.map((importedVariable) =>
    createVariableResolution(
      importedVariable,
      platformVariables,
      previousResolutionsByName.get(
        importedVariable.name.toLocaleLowerCase('ru-RU'),
      ),
    ),
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

  const [backendImportState, setBackendImportState] =
    useState<BackendRequestImportState>(initialBackendImportState);

  const [isMergeWorkspaceOpen, setIsMergeWorkspaceOpen] =
    useState(false);

  const [variableResolutions, setVariableResolutions] = useState<
    VariableResolution[]
  >([]);

  const [platformVariables, setPlatformVariables] = useState<
    VariableDto[]
  >([]);

  const [availableScenarios, setAvailableScenarios] = useState<
    ScenarioResponse[]
  >([]);

  const [customMethodResolutions, setCustomMethodResolutions] = useState<
    ScenarioCustomMethodResolution[]
  >([]);

  const [isCustomMethodsLoading, setIsCustomMethodsLoading] =
    useState(false);

  const [isMissingCustomMethodsModalOpen, setIsMissingCustomMethodsModalOpen] =
    useState(false);

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
    setBackendImportState(initialBackendImportState);
    setIsMergeWorkspaceOpen(false);
    setVariableResolutions([]);
    setPlatformVariables([]);
    setAvailableScenarios([]);
    setCustomMethodResolutions([]);
    setIsCustomMethodsLoading(false);
    setIsMissingCustomMethodsModalOpen(false);
  };

  const rebuildCustomMethodResolutions = (
    payload: Record<string, unknown>,
    scenarios: ScenarioResponse[],
    previousResolutions: ScenarioCustomMethodResolution[] = [],
  ) => {
    const importedCustomMethods =
      parseImportedScenarioCustomMethods(payload);

    return createScenarioCustomMethodResolutions(
      importedCustomMethods,
      scenarios,
      previousResolutions,
    );
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
      setIsCustomMethodsLoading(true);

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
        scenariosResponse,
      ] = await Promise.all([
        http.get<BackendRequestDto[]>('/backend-requests'),
        http.get<VariableDto[]>('/variables'),
        http.get<ScenarioResponse[]>('/scenarios'),
      ]);

      const backendRequestsFromApi = backendRequestsResponse.data;
      const variablesFromApi = variablesResponse.data;
      const scenariosFromApi = scenariosResponse.data;

      const nextBackendImportState =
        createBackendRequestImportState(
          importedBackendRequests,
          backendRequestsFromApi,
        );

      const initialVariableResolutions =
        rebuildVariableResolutions(
          nextParsedPayload,
          nextBackendImportState.resolutions,
          variablesFromApi,
          [],
        );

      const initialCustomMethodResolutions =
        rebuildCustomMethodResolutions(
          nextParsedPayload,
          scenariosFromApi,
        );

      const hasUnresolvedCustomMethods =
        initialCustomMethodResolutions.some(
          (resolution) => resolution.kind === 'unresolved',
        );

      setSelectedFile(file);
      setParsedPayload(nextParsedPayload);
      setExistingBackendRequests(backendRequestsFromApi);
      setBackendImportState(nextBackendImportState);
      setPlatformVariables(variablesFromApi);
      setVariableResolutions(initialVariableResolutions);
      setAvailableScenarios(scenariosFromApi);
      setCustomMethodResolutions(initialCustomMethodResolutions);
      setIsMissingCustomMethodsModalOpen(
        hasUnresolvedCustomMethods,
      );

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
      setIsCustomMethodsLoading(false);
    }

    return false;
  };

  const refreshCustomMethodScenarios = async () => {
    if (!parsedPayload) {
      return;
    }

    try {
      setIsCustomMethodsLoading(true);

      const { data: scenariosFromApi } = await http.get<
        ScenarioResponse[]
      >('/scenarios');

      const nextCustomMethodResolutions =
        rebuildCustomMethodResolutions(
          parsedPayload,
          scenariosFromApi,
          customMethodResolutions,
        );

      const hasUnresolvedCustomMethods =
        nextCustomMethodResolutions.some(
          (resolution) => resolution.kind === 'unresolved',
        );

      setAvailableScenarios(scenariosFromApi);
      setCustomMethodResolutions(nextCustomMethodResolutions);
      setIsMissingCustomMethodsModalOpen(
        hasUnresolvedCustomMethods,
      );

      if (!hasUnresolvedCustomMethods) {
        message.success('Все переиспользуемые сценарии разрешены');
      }
    } catch (error) {
      message.error(
        getApiErrorMessage(
          error,
          'Не удалось обновить список сценариев',
        ),
      );
    } finally {
      setIsCustomMethodsLoading(false);
    }
  };

  const selectCustomMethodScenario = (
    importedCustomMethodName: string,
    selectedScenarioId: number,
  ) => {
    const selectedScenario = availableScenarios.find(
      (scenario) => scenario.id === selectedScenarioId,
    );

    if (!selectedScenario) {
      message.error('Не удалось найти выбранный сценарий');
      return;
    }

    setCustomMethodResolutions((currentResolutions) => {
      const nextResolutions = currentResolutions.map(
        (resolution) => {
          if (
            resolution.importedCustomMethod.name !==
            importedCustomMethodName
          ) {
            return resolution;
          }

          return {
            ...resolution,
            targetScenario: selectedScenario,
            kind: 'selected-existing' as const,
          };
        },
      );

      const hasUnresolvedCustomMethods = nextResolutions.some(
        (resolution) => resolution.kind === 'unresolved',
      );

      if (!hasUnresolvedCustomMethods) {
        setIsMissingCustomMethodsModalOpen(false);
      }

      return nextResolutions;
    });
  };

  const openScenarioCreateInNewTab = () => {
    window.open('/scenarios/new', '_blank', 'noopener,noreferrer');
  };

  const resolveCurrentConflict = (
    resolution: BackendRequestResolution,
  ) => {
    setBackendImportState((currentState) => {
      const nextBackendImportState =
        resolveBackendRequestConflict(
          currentState,
          resolution,
          existingBackendRequests,
        );

      if (parsedPayload) {
        setVariableResolutions((currentVariableResolutions) =>
          rebuildVariableResolutions(
            parsedPayload,
            nextBackendImportState.resolutions,
            platformVariables,
            currentVariableResolutions,
          ),
        );
      }

      return nextBackendImportState;
    });
  };

  const cancelImport = () => {
    resetImportedFileState();
    message.info('Импорт сценария отменён');
  };

  const useExistingBackendRequest = () => {
    const activeConflict = backendImportState.activeConflict;
    const existingConflictRequest =
      backendImportState.existingConflictRequest;

    if (!activeConflict || !existingConflictRequest) {
      return;
    }

    resolveCurrentConflict({
      importedRequest: activeConflict,
      resolvedRequest: existingConflictRequest,
      kind: 'existing',
    });
  };

  const renameImportedBackendRequest = () => {
    const activeConflict = backendImportState.activeConflict;

    if (!activeConflict) {
      return;
    }

    const nextName = getNextAvailableMethodName(
      activeConflict.name,
      existingBackendRequests,
      backendImportState.resolutions,
    );

    resolveCurrentConflict({
      importedRequest: activeConflict,
      resolvedRequest: {
        ...activeConflict,
        name: nextName,
      },
      kind: 'renamed',
    });

    message.info(
      `Импортируемый метод будет создан как «${nextName}»`,
    );
  };

  const openMergeWorkspace = () => {
    setIsMergeWorkspaceOpen(true);
  };

  const saveMergedBackendRequest = (
    mergeDraft: BackendRequestMergeDraft,
  ) => {
    const activeConflict = backendImportState.activeConflict;

    if (!activeConflict) {
      return;
    }

    resolveCurrentConflict({
      importedRequest: activeConflict,
      resolvedRequest: mergeDraft.mergedRequest,
      kind: 'merged',
      mergeDraft,
    });

    setIsMergeWorkspaceOpen(false);
  };

  const selectPlatformVariable = (
    importedVariableName: string,
    selectedVariableId: number,
  ) => {
    const selectedVariable = platformVariables.find(
      (variable) => variable.id === selectedVariableId,
    );

    if (!selectedVariable) {
      message.error('Не удалось найти выбранную переменную');
      return;
    }

    if (!selectedVariable.isUserVariable) {
      message.error(
        'Можно выбрать только пользовательскую переменную',
      );
      return;
    }

    setVariableResolutions((currentResolutions) =>
      currentResolutions.map((resolution) => {
        if (
          resolution.importedVariable.name !== importedVariableName
        ) {
          return resolution;
        }

        if (!resolution.importedVariable.isUserVariable) {
          return resolution;
        }

        return {
          ...resolution,
          targetVariable: selectedVariable,
          kind: 'selected-existing',
        };
      }),
    );
  };

  const markUserVariableForCreation = (
    importedVariableName: string,
  ) => {
    setVariableResolutions((currentResolutions) =>
      currentResolutions.map((resolution) => {
        if (
          resolution.importedVariable.name !== importedVariableName
        ) {
          return resolution;
        }

        if (!resolution.importedVariable.isUserVariable) {
          return resolution;
        }

        const variableWithSameName = platformVariables.find(
          (variable) =>
            variable.name.toLocaleLowerCase('ru-RU') ===
            resolution.importedVariable.name.toLocaleLowerCase(
              'ru-RU',
            ),
        );

        if (variableWithSameName) {
          message.error(
            `Имя «${resolution.importedVariable.name}» уже занято в библиотеке`,
          );
          return resolution;
        }

        return {
          ...resolution,
          targetVariable: null,
          kind: 'create-new-user',
        };
      }),
    );
  };

  const resetVariableResolution = (
    importedVariableName: string,
  ) => {
    setVariableResolutions((currentResolutions) =>
      currentResolutions.map((resolution) => {
        if (
          resolution.importedVariable.name !== importedVariableName
        ) {
          return resolution;
        }

        if (!resolution.importedVariable.isUserVariable) {
          return {
            ...resolution,
            targetVariable: null,
            kind: 'existing',
          };
        }

        return {
          ...resolution,
          targetVariable: null,
          kind: 'unresolved',
        };
      }),
    );
  };

    const changeVariableType = (
    importedVariableName: string,
    isUserVariable: boolean,
  ) => {
    setVariableResolutions((currentResolutions) =>
      currentResolutions.map((resolution) => {
        if (
          resolution.importedVariable.name !== importedVariableName
        ) {
          return resolution;
        }

        const importedVariable = {
          ...resolution.importedVariable,
          isUserVariable,
        };

        if (!isUserVariable) {
          return {
            importedVariable,
            targetVariable: null,
            kind: 'existing' as const,
          };
        }

        const platformVariableWithSameName = platformVariables.find(
          (variable) =>
            variable.isUserVariable &&
            variable.name.toLocaleLowerCase('ru-RU') ===
              importedVariable.name.toLocaleLowerCase('ru-RU'),
        );

        if (platformVariableWithSameName) {
          return {
            importedVariable,
            targetVariable: platformVariableWithSameName,
            kind: 'existing' as const,
          };
        }

        return {
          importedVariable,
          targetVariable: null,
          kind: 'unresolved' as const,
        };
      }),
    );
  };

  const unresolvedVariables = useMemo(
    () =>
      variableResolutions.filter((resolution) => {
        if (!resolution.importedVariable.isUserVariable) {
          return (
            resolution.importedVariable.defaultValue.trim().length ===
            0
          );
        }

        return resolution.kind === 'unresolved';
      }),
    [variableResolutions],
  );

  const unresolvedCustomMethods = useMemo(
    () =>
      customMethodResolutions.filter(
        (resolution) => resolution.kind === 'unresolved',
      ),
    [customMethodResolutions],
  );

  const existingVariablesCount = useMemo(
    () =>
      variableResolutions.filter(
        (resolution) => resolution.kind === 'existing',
      ).length,
    [variableResolutions],
  );

  const selectedExistingVariablesCount = useMemo(
    () =>
      variableResolutions.filter(
        (resolution) =>
          resolution.kind === 'selected-existing',
      ).length,
    [variableResolutions],
  );

  const newUserVariablesCount = useMemo(
    () =>
      variableResolutions.filter(
        (resolution) =>
          resolution.kind === 'create-new-user',
      ).length,
    [variableResolutions],
  );

  const existingCustomMethodsCount = useMemo(
    () =>
      customMethodResolutions.filter(
        (resolution) => resolution.kind === 'existing',
      ).length,
    [customMethodResolutions],
  );

  const selectedCustomMethodsCount = useMemo(
    () =>
      customMethodResolutions.filter(
        (resolution) =>
          resolution.kind === 'selected-existing',
      ).length,
    [customMethodResolutions],
  );

  const isBackendImportResolved =
    selectedFile !== null &&
    parsedPayload !== null &&
    backendImportState.pendingConflicts.length === 0 &&
    backendImportState.activeConflict === null;

  const isVariableImportResolved =
    selectedFile !== null &&
    !isVariablesLoading &&
    unresolvedVariables.length === 0;

  const isCustomMethodImportResolved =
    selectedFile !== null &&
    !isCustomMethodsLoading &&
    unresolvedCustomMethods.length === 0;

  const resolvedBackendMethodsCount = useMemo(
    () => backendImportState.resolutions.length,
    [backendImportState.resolutions],
  );

  const applyJsonPayload = (
    nextPayload: Record<string, unknown>,
  ) => {
    const importedBackendRequests =
      parseImportedBackendRequests(nextPayload);

    const nextBackendImportState =
      createBackendRequestImportState(
        importedBackendRequests,
        existingBackendRequests,
      );

    const nextVariableResolutions =
      rebuildVariableResolutions(
        nextPayload,
        nextBackendImportState.resolutions,
        platformVariables,
        variableResolutions,
      );

    const nextCustomMethodResolutions =
      rebuildCustomMethodResolutions(
        nextPayload,
        availableScenarios,
        customMethodResolutions,
      );

    const hasUnresolvedCustomMethods =
      nextCustomMethodResolutions.some(
        (resolution) => resolution.kind === 'unresolved',
      );

    setParsedPayload(nextPayload);
    setBackendImportState(nextBackendImportState);
    setIsMergeWorkspaceOpen(false);
    setVariableResolutions(nextVariableResolutions);
    setCustomMethodResolutions(nextCustomMethodResolutions);
    setIsMissingCustomMethodsModalOpen(
      hasUnresolvedCustomMethods,
    );

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
        backendResolutions: backendImportState.resolutions,
        variableResolutions,
        customMethodResolutions,
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

  const activeConflict = backendImportState.activeConflict;
  const existingConflictRequest =
    backendImportState.existingConflictRequest;

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
                            : `Осталось конфликтов: ${backendImportState.pendingConflicts.length}.`
                        }
                      />
                    )}

                    {selectedFile && isCustomMethodsLoading && (
                      <Alert
                        type="info"
                        showIcon
                        style={{ marginBottom: 24 }}
                        message="Проверяем переиспользуемые сценарии"
                      />
                    )}

                    {selectedFile && !isCustomMethodsLoading && (
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
                            ? `Всего: ${customMethodResolutions.length}. Найдено автоматически: ${existingCustomMethodsCount}. Выбрано вручную: ${selectedCustomMethodsCount}.`
                            : `Не найдено сценариев: ${unresolvedCustomMethods.length}. Выберите существующие сценарии или создайте недостающие и нажмите «Проверить снова».`
                        }
                      />
                    )}

                    {selectedFile && !isCustomMethodsLoading && (
                      <ScenarioCustomMethodTable
                        resolutions={customMethodResolutions}
                        availableScenarios={availableScenarios}
                        disabled={isCreating || isParsingFile}
                        onSelectScenario={selectCustomMethodScenario}
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
                            ? `Всего: ${variableResolutions.length}. Сценарные переменные создаются вместе со сценарием. Найдено пользовательских: ${existingVariablesCount}. Выбрано вручную: ${selectedExistingVariablesCount}. Будет создано пользовательских: ${newUserVariablesCount}.`
                            : `Требуют внимания: ${unresolvedVariables.length}. Для сценарной переменной обязательно заполните значение. Для пользовательской переменной выберите существующую переменную платформы либо подтвердите создание новой.`
                        }
                      />
                    )}

                    {selectedFile && !isVariablesLoading && (
                      <CreateVariableTable
  resolutions={variableResolutions}
  platformVariables={platformVariables}
  disabled={isCreating || isParsingFile}
  onSelectPlatformVariable={
    selectPlatformVariable
  }
  onCreateUserVariable={
    markUserVariableForCreation
  }
  onResetResolution={
    resetVariableResolution
  }
  onChangeVariableType={changeVariableType}
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
          open={!isMergeWorkspaceOpen}
          existingRequest={existingConflictRequest}
          importedRequest={activeConflict}
          onCancelImport={cancelImport}
          onUseExisting={useExistingBackendRequest}
          onRenameImported={renameImportedBackendRequest}
          onOpenMergeWorkspace={openMergeWorkspace}
        />
      )}

      {activeConflict && existingConflictRequest && (
        <BackendRequestMergeWorkspace
          open={isMergeWorkspaceOpen}
          existingRequest={existingConflictRequest}
          importedRequest={activeConflict}
          onCancel={() => setIsMergeWorkspaceOpen(false)}
          onSaved={saveMergedBackendRequest}
        />
      )}

      <MissingScenarioCustomMethodsModal
        open={isMissingCustomMethodsModalOpen}
        missingMethodNames={unresolvedCustomMethods.map(
          (resolution) => resolution.importedCustomMethod.name,
        )}
        isRefreshing={isCustomMethodsLoading}
        onClose={() => setIsMissingCustomMethodsModalOpen(false)}
        onOpenScenarioCreate={openScenarioCreateInNewTab}
        onRefresh={() => void refreshCustomMethodScenarios()}
      />
    </main>
  );
}
