import {
  ArrowLeftOutlined,
  EditOutlined,
  SaveOutlined,
} from '@ant-design/icons';
import {
  Button,
  Card,
  Empty,
  Space,
  Spin,
  Table,
  Tabs,
  Tag,
  Tooltip,
  Typography,
  message,
} from 'antd';
import axios from 'axios';
import type { ColumnsType } from 'antd/es/table';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Virtuoso } from 'react-virtuoso';

import {
  ScenarioJsonEditor,
} from '../../features/scenarioImport/ui/ScenarioJsonEdit';
import { http } from '../../shared/api/http';
import type {
  ScenarioCustomMethodResponse,
  ScenarioListItem,
  ScenarioResponse,
  ScenarioTagsRequest,
  ScenarioVariableResponse,
  TagResponse,
  UserVariableResponse,
} from '../../shared/types/scenario';
import { AppInput } from '../../shared/ui/AppInput/AppInput';
import { AppTextArea } from '../../shared/ui/AppInput/AppTextArea';
import { AppSelectMultiple } from '../../shared/ui/AppSelectMultiple/AppSelectMultiple';
import { ScenarioItem } from '../../shared/ui/ScenarioItem/ScenarioItem';
import styles from './ScenarioPage.module.css';

const { Title, Text } = Typography;

type EditableField = 'name' | 'tags' | 'description' | null;

interface ScenarioUserVariable {
  id: number;
  name: string;
  description: string | null;
  isUserVariable: boolean;
  value: string;
  isSet: boolean;
}

interface EditableCardProps {
  title: string;
  isEditing: boolean;
  isSaving: boolean;
  onStartEditing: () => void;
  onSave: () => void;
  onCancel: () => void;
  display: React.ReactNode;
  editor: React.ReactNode;
}

function mapScenarioToListItem(
  scenario: ScenarioCustomMethodResponse,
): ScenarioListItem {
  return {
    id: String(scenario.scenarioId),
    name: scenario.name,
    tags: [],
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

function EditableCard({
  title,
  isEditing,
  isSaving,
  onStartEditing,
  onSave,
  onCancel,
  display,
  editor,
}: EditableCardProps) {
  return (
    <Card
      title={title}
      extra={
        isEditing ? (
          <Space size={4}>
            <Button
              type="primary"
              size="small"
              icon={<SaveOutlined />}
              loading={isSaving}
              onClick={onSave}
            >
              Сохранить
            </Button>

            <Button
              size="small"
              disabled={isSaving}
              onClick={onCancel}
            >
              Отмена
            </Button>
          </Space>
        ) : (
          <Button
            type="text"
            icon={<EditOutlined />}
            aria-label={`Редактировать: ${title}`}
            onClick={onStartEditing}
          />
        )
      }
    >
      {isEditing ? (
        editor
      ) : (
        <div
          className={styles.editableValue}
          title="Дважды кликните, чтобы изменить"
          onDoubleClick={onStartEditing}
        >
          {display}
        </div>
      )}
    </Card>
  );
}

export function ScenarioPage() {
  const navigate = useNavigate();
  const { scenarioId } = useParams();

  const currentScenarioId = scenarioId ?? '';

  const [scenario, setScenario] = useState<ScenarioResponse | null>(
    null,
  );
  const [availableTags, setAvailableTags] = useState<TagResponse[]>([]);
  const [relatedScenarios, setRelatedScenarios] = useState<
    ScenarioListItem[]
  >([]);
  const [scenarioVariables, setScenarioVariables] = useState<
    ScenarioVariableResponse[]
  >([]);
  const [userVariables, setUserVariables] = useState<
    UserVariableResponse[]
  >([]);

  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [editingField, setEditingField] =
    useState<EditableField>(null);
  const [draftName, setDraftName] = useState('');
  const [draftTags, setDraftTags] = useState<string[]>([]);
  const [draftDescription, setDraftDescription] = useState('');
  const [isSavingField, setIsSavingField] = useState(false);

  const [editingVariableId, setEditingVariableId] = useState<
    number | null
  >(null);
  const [editingVariableValue, setEditingVariableValue] = useState('');
  const [isSavingVariable, setIsSavingVariable] = useState(false);

  useEffect(() => {
    if (!currentScenarioId) {
      setLoadError('Не указан идентификатор сценария');
      setIsLoading(false);
      return;
    }

    let isMounted = true;

    const loadPage = async () => {
      try {
        setIsLoading(true);
        setLoadError(null);

        const [
          scenarioResponse,
          tagsResponse,
          relatedScenariosResponse,
          scenarioVariablesResponse,
          userVariablesResponse,
        ] = await Promise.all([
          http.get<ScenarioResponse>(`/scenarios/${currentScenarioId}`),
          http.get<TagResponse[]>('/tags'),
          http.get<ScenarioCustomMethodResponse[]>(
            `/scenarios/${currentScenarioId}/custom-methods`,
          ),
          http.get<ScenarioVariableResponse[]>(
            `/scenarios/${currentScenarioId}/variables`,
          ),
          http.get<UserVariableResponse[]>('/users/me/variables'),
        ]);

        if (!isMounted) {
          return;
        }

        setScenario(scenarioResponse.data);
        setAvailableTags(tagsResponse.data);
        setRelatedScenarios(
          relatedScenariosResponse.data.map(mapScenarioToListItem),
        );
        setScenarioVariables(scenarioVariablesResponse.data);
        setUserVariables(userVariablesResponse.data);
      } catch (error) {
        if (isMounted) {
          setLoadError(
            getApiErrorMessage(
              error,
              'Не удалось загрузить данные сценария',
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
  }, [currentScenarioId]);

  const scenarioUserVariables = useMemo<ScenarioUserVariable[]>(() => {
    return scenarioVariables
      .filter((scenarioVariable) => scenarioVariable.isUserVariable)
      .map((scenarioVariable) => {
        const userVariable = userVariables.find(
          (item) => item.variableId === scenarioVariable.variableId,
        );

        return {
          id: scenarioVariable.variableId,
          name: scenarioVariable.name,
          description: scenarioVariable.description,
          isUserVariable: scenarioVariable.isUserVariable,
          value: userVariable?.value ?? '',
          isSet: userVariable?.isSet ?? false,
        };
      });
  }, [scenarioVariables, userVariables]);

  const startFieldEditing = (
    field: Exclude<EditableField, null>,
  ) => {
    if (!scenario) {
      return;
    }

    setDraftName(scenario.name);
    setDraftTags(scenario.tags.map((tag) => tag.name));
    setDraftDescription(scenario.description ?? '');
    setEditingField(field);
  };

  const cancelFieldEditing = () => {
    if (scenario) {
      setDraftName(scenario.name);
      setDraftTags(scenario.tags.map((tag) => tag.name));
      setDraftDescription(scenario.description ?? '');
    }

    setEditingField(null);
  };

  const saveScenarioData = async (
    updatedName: string,
    updatedDescription: string,
  ) => {
    if (!scenario) {
      return null;
    }

    const { data } = await http.put<ScenarioResponse>(
      `/scenarios/${scenario.id}`,
      {
        name: updatedName,
        description: updatedDescription,
        scenarioPayloadJson: scenario.scenarioPayloadJson,
      },
    );

    setScenario(data);

    return data;
  };

  const saveField = async () => {
    if (!scenario || !editingField) {
      return;
    }

    try {
      setIsSavingField(true);

      if (editingField === 'name') {
        const normalizedName = draftName.trim();

        if (!normalizedName) {
          message.error('Название сценария не может быть пустым');
          return;
        }

        await saveScenarioData(
          normalizedName,
          scenario.description ?? '',
        );

        message.success('Название сценария сохранено');
      }

      if (editingField === 'description') {
        await saveScenarioData(
          scenario.name,
          draftDescription.trim(),
        );

        message.success('Описание сценария сохранено');
      }

      if (editingField === 'tags') {
        const tagIds = draftTags
          .map((tagName) =>
            availableTags.find((tag) => tag.name === tagName),
          )
          .filter((tag): tag is TagResponse => Boolean(tag))
          .map((tag) => tag.id);

        const request: ScenarioTagsRequest = { tagIds };

        const { data } = await http.put<TagResponse[]>(
          `/scenarios/${scenario.id}/tags`,
          request,
        );

        setScenario((currentScenario) =>
          currentScenario
            ? {
                ...currentScenario,
                tags: data,
              }
            : currentScenario,
        );

        message.success('Теги сценария сохранены');
      }

      setEditingField(null);
    } catch (error) {
      message.error(
        getApiErrorMessage(
          error,
          'Не удалось сохранить изменения сценария',
        ),
      );
    } finally {
      setIsSavingField(false);
    }
  };

  const startVariableEditing = (
    variableId: number,
    currentValue: string,
  ) => {
    setEditingVariableId(variableId);
    setEditingVariableValue(currentValue);
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

      setUserVariables((currentVariables) => {
        const existingVariable = currentVariables.find(
          (item) => item.variableId === variableId,
        );

        if (existingVariable) {
          return currentVariables.map((item) =>
            item.variableId === variableId
              ? {
                  ...item,
                  value: editingVariableValue,
                  isSet: true,
                }
              : item,
          );
        }

        const scenarioVariable = scenarioVariables.find(
          (item) => item.variableId === variableId,
        );

        if (!scenarioVariable) {
          return currentVariables;
        }

        return [
          ...currentVariables,
          {
            variableId,
            name: scenarioVariable.name,
            description: scenarioVariable.description,
            value: editingVariableValue,
            isSet: true,
          },
        ];
      });

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

  const openRelatedScenario = (relatedScenarioId: string) => {
    navigate(`/scenarios/${relatedScenarioId}`);
  };

  const variableColumns: ColumnsType<ScenarioUserVariable> = [
    {
      title: 'Переменная',
      dataIndex: 'name',
      key: 'name',
      width: '42%',
      render: (name: string, variable) => (
        <Space direction="vertical" size={0}>
          <Typography.Text code>{name}</Typography.Text>

          {variable.description && (
            <Text type="secondary">{variable.description}</Text>
          )}
        </Space>
      ),
    },
    {
      title: 'Значение пользователя',
      dataIndex: 'value',
      key: 'value',
      render: (value: string, variable: ScenarioUserVariable) => {
        const isEditing = editingVariableId === variable.id;

        if (isEditing) {
          return (
            <AppInput
              autoFocus
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
            onDoubleClick={() =>
              startVariableEditing(variable.id, variable.value)
            }
          >
            {value || 'Дважды кликните, чтобы задать значение'}
          </div>
        );
      },
    },
    {
      title: '',
      key: 'actions',
      width: 150,
      align: 'right',
      render: (_, variable: ScenarioUserVariable) => {
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
          <Button
            type="text"
            icon={<EditOutlined />}
            aria-label={`Редактировать значение: ${variable.name}`}
            onClick={() =>
              startVariableEditing(variable.id, variable.value)
            }
          />
        );
      },
    },
  ];

  if (isLoading) {
    return (
      <main className={styles.page}>
        <div className={styles.content}>
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
        </div>
      </main>
    );
  }

  if (loadError || !scenario) {
    return (
      <main className={styles.page}>
        <div className={styles.content}>
          <Button
            type="text"
            size="large"
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate(-1)}
          >
            Назад
          </Button>

          <Empty
            description={loadError ?? 'Сценарий не найден'}
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        </div>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <div className={styles.content}>
        <section className={styles.scenarioHeader}>
          <div className={styles.scenarioTitleRow}>
            <div className={styles.scenarioTitleContent}>
              <Button
                type="text"
                size="large"
                icon={<ArrowLeftOutlined />}
                aria-label="Вернуться к списку сценариев"
                onClick={() => navigate(-1)}
              />

              {editingField === 'name' ? (
                <AppInput
                  autoFocus
                  size="large"
                  className={styles.scenarioNameInput}
                  value={draftName}
                  placeholder="Введите название сценария"
                  disabled={isSavingField}
                  onChange={(event) => setDraftName(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      void saveField();
                      return;
                    }

                    if (event.key === 'Escape') {
                      event.preventDefault();
                      cancelFieldEditing();
                    }
                  }}
                />
              ) : (
                <button
                  type="button"
                  className={styles.scenarioNameButton}
                  title="Нажмите, чтобы изменить название"
                  onClick={() => startFieldEditing('name')}
                >
                  <Title level={2} className={styles.scenarioName}>
                    {scenario.name}
                  </Title>
                </button>
              )}
            </div>

            {editingField === 'name' ? (
              <Space size={4}>
                <Button
                  type="primary"
                  icon={<SaveOutlined />}
                  loading={isSavingField}
                  onClick={() => void saveField()}
                >
                  Сохранить
                </Button>

                <Button
                  disabled={isSavingField}
                  onClick={cancelFieldEditing}
                >
                  Отмена
                </Button>
              </Space>
            ) : (
              <Tooltip title="Редактировать название">
                <Button
                  type="text"
                  size="large"
                  icon={<EditOutlined />}
                  aria-label="Редактировать название сценария"
                  onClick={() => startFieldEditing('name')}
                />
              </Tooltip>
            )}
          </div>

          <div className={styles.scenarioTagsRow}>
            <div className={styles.scenarioTagsContent}>
              {editingField === 'tags' ? (
                <AppSelectMultiple
                  autoFocus
                  allowClear
                  size="large"
                  className={styles.tagSelect}
                  placeholder="Выберите теги"
                  value={draftTags}
                  options={availableTags.map((tag) => ({
                    value: tag.name,
                    label: tag.name,
                  }))}
                  disabled={isSavingField}
                  onChange={setDraftTags}
                  onCancelEditing={cancelFieldEditing}
                  onSaveEditing={() => void saveField()}
                />
              ) : (
                <div
                  className={styles.tagsList}
                  title="Дважды кликните, чтобы изменить теги"
                  onDoubleClick={() => startFieldEditing('tags')}
                >
                  {scenario.tags.length > 0 ? (
                    <Space size={[8, 8]} wrap>
                      {scenario.tags.map((tag) => (
                        <Tag
                          key={tag.id}
                          color={tag.color}
                          className={styles.scenarioTag}
                        >
                          {tag.name}
                        </Tag>
                      ))}
                    </Space>
                  ) : (
                    <Text type="secondary">Теги не заданы</Text>
                  )}
                </div>
              )}
            </div>

            {editingField === 'tags' ? (
              <Space size={4}>
                <Button
                  type="primary"
                  icon={<SaveOutlined />}
                  loading={isSavingField}
                  onClick={() => void saveField()}
                >
                  Сохранить
                </Button>

                <Button
                  disabled={isSavingField}
                  onClick={cancelFieldEditing}
                >
                  Отмена
                </Button>
              </Space>
            ) : (
              <Tooltip title="Редактировать теги">
                <Button
                  type="text"
                  size="large"
                  icon={<EditOutlined />}
                  aria-label="Редактировать теги сценария"
                  onClick={() => startFieldEditing('tags')}
                />
              </Tooltip>
            )}
          </div>
        </section>

        <Tabs
          defaultActiveKey="main"
          items={[
            {
              key: 'main',
              label: 'Основная информация',
              children: (
                <>
                  <Card
                    title={`Связанные сценарии: ${relatedScenarios.length}`}
                  >
                    {relatedScenarios.length === 0 ? (
                      <Empty
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                        description="Связанных сценариев нет"
                      />
                    ) : (
                      <Virtuoso
                        className={styles.relatedList}
                        data={relatedScenarios}
                        computeItemKey={(_, item) => item.id}
                        itemContent={(_, relatedScenario) => (
                          <ScenarioItem
  scenario={relatedScenario}
  hideActions
  onOpen={openRelatedScenario}
  onEdit={openRelatedScenario}
  onDownloadOriginal={() => undefined}
  onDownloadFull={() => undefined}
  onDownloadZip={() => undefined}
  onDelete={async () => undefined}
/>
                        )}
                      />
                    )}
                  </Card>

                  <Card title="Переменные">
                    <Typography.Paragraph type="secondary">
                      Набор переменных определяется сценарием. Здесь
                      редактируются только персональные значения текущего
                      пользователя.
                    </Typography.Paragraph>

                    <Table<ScenarioUserVariable>
                      rowKey="id"
                      columns={variableColumns}
                      dataSource={scenarioUserVariables}
                      pagination={false}
                      locale={{
                        emptyText:
                          'В сценарии нет персональных переменных пользователя',
                      }}
                    />
                  </Card>

                  <EditableCard
                    title="Описание"
                    isEditing={editingField === 'description'}
                    isSaving={isSavingField}
                    onStartEditing={() =>
                      startFieldEditing('description')
                    }
                    onSave={() => void saveField()}
                    onCancel={cancelFieldEditing}
                    display={
                      scenario.description ? (
                        <Typography.Paragraph
                          className={styles.stepsValue}
                        >
                          {scenario.description}
                        </Typography.Paragraph>
                      ) : (
                        <Text type="secondary">Описание не задано</Text>
                      )
                    }
                    editor={
                      <AppTextArea
                        autoFocus
                        value={draftDescription}
                        disabled={isSavingField}
                        autoSize={{ minRows: 6, maxRows: 16 }}
                        placeholder="Введите описание сценария"
                        onChange={(event) =>
                          setDraftDescription(event.target.value)
                        }
                        onKeyDown={(event) => {
                          const isSaveShortcut =
                            event.key === 'Enter' &&
                            (event.metaKey || event.ctrlKey);

                          if (isSaveShortcut) {
                            event.preventDefault();
                            void saveField();
                            return;
                          }

                          if (event.key === 'Escape') {
                            event.preventDefault();
                            cancelFieldEditing();
                          }
                        }}
                      />
                    }
                  />
                </>
              ),
            },
            {
              key: 'details',
              label: 'Подробнее',
              children: (
                <ScenarioJsonEditor
  scenarioId={scenario.id}
  initialPayloadJson={scenario.scenarioPayloadJson}
  disabled={isSavingField || isSavingVariable}
  onSaved={(scenarioPayloadJson) => {
    setScenario((currentScenario) =>
      currentScenario
        ? {
            ...currentScenario,
            scenarioPayloadJson,
          }
        : currentScenario,
    );
  }}
/>
              ),
            },
          ]}
        />
      </div>
    </main>
  );
}
