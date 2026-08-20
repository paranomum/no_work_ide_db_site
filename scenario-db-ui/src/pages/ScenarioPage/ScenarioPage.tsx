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
  Table,
  Tag,
  Tooltip,
  Typography,
  message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Virtuoso } from 'react-virtuoso';

import { AppInput } from '../../shared/ui/AppInput/AppInput';
import { AppTextArea } from '../../shared/ui/AppInput/AppTextArea';
import { ScenarioItem } from '../../shared/ui/ScenarioItem/ScenarioItem';
import type { ScenarioListItem } from '../../shared/types/scenario';
import { AppSelectMultiple } from '../../shared/ui/AppSelectMultiple/AppSelectMultiple';
import styles from './ScenarioPage.module.css';

const { Title, Text } = Typography;

interface ScenarioVariable {
  name: string;
  defaultValue: string;
}

interface UserVariable {
  id: string;
  name: string;
  value: string;
}

interface ScenarioUserVariable {
  id: string;
  name: string;
  value: string;
  defaultValue: string;
}

interface ScenarioDetails extends ScenarioListItem {
  relatedScenarioIds: string[];
  variables: ScenarioVariable[];
  steps: string;
}

type EditableField = 'name' | 'tags' | 'steps' | null;

const FALLBACK_TAGS = [
  'вакансия',
  'заявка',
  'оффер',
  'кандидат',
  'согласование',
  'воронка',
];

const DEFAULT_SCENARIOS: ScenarioListItem[] = [
  {
    id: 'scenario-1',
    name: 'Обработка кандидата: массовый подбор',
    tags: ['вакансия', 'заявка', 'кандидат'],
  },
  {
    id: 'scenario-2',
    name: 'Создание вакансии',
    tags: ['вакансия'],
  },
  {
    id: 'scenario-3',
    name: 'Создание и согласование заявки',
    tags: ['заявка', 'согласование'],
  },
  {
    id: 'scenario-4',
    name: 'Оформление оффера',
    tags: ['оффер', 'кандидат'],
  },
  {
    id: 'scenario-5',
    name: 'Перевод кандидата на этап воронки',
    tags: ['кандидат', 'воронка'],
  },
];

const DEFAULT_SCENARIO_DETAILS: Record<string, ScenarioDetails> = {
  'scenario-1': {
    id: 'scenario-1',
    name: 'Обработка кандидата: массовый подбор',
    tags: ['вакансия', 'заявка', 'кандидат'],
    relatedScenarioIds: [
      'scenario-2',
      'scenario-3',
      'scenario-4',
      'scenario-5',
    ],
    variables: [
      { name: 'recruiter.username', defaultValue: '' },
      { name: 'recruiter.password', defaultValue: '' },
      { name: 'recruiter.uuid', defaultValue: '' },
      { name: 'hrbp.username', defaultValue: '' },
      { name: 'hrbp.password', defaultValue: '' },
      { name: 'candidate.id', defaultValue: 'json(response[0].candidateTo.id)' },
      { name: 'vacancy.id', defaultValue: 'json(response.id)' },
    ],
    steps: `Создание вакансии
Создание и согласование заявки
Создание кандидата
Получение CV кандидата
Добавление кандидата в вакансию
Прикрепление заявки к вакансии`,
  },
  'scenario-2': {
    id: 'scenario-2',
    name: 'Создание вакансии',
    tags: ['вакансия'],
    relatedScenarioIds: [],
    variables: [
      { name: 'vacancy_creator.username', defaultValue: '' },
      { name: 'vacancy_creator.password', defaultValue: '' },
      { name: 'vacancy.id', defaultValue: 'json(response.id)' },
    ],
    steps: `Получить токен создателя вакансии
Создать вакансию
Сохранить vacancy.id`,
  },
  'scenario-3': {
    id: 'scenario-3',
    name: 'Создание и согласование заявки',
    tags: ['заявка', 'согласование'],
    relatedScenarioIds: ['scenario-2'],
    variables: [
      { name: 'jr_creator.username', defaultValue: '' },
      { name: 'jr_creator.password', defaultValue: '' },
      { name: 'jr.id', defaultValue: 'json(response.id)' },
      { name: 'step.id', defaultValue: 'json(response[0].id)' },
    ],
    steps: `Получить токен создателя заявки
Создать заявку
Получить текущий шаг
Согласовать заявку`,
  },
  'scenario-4': {
    id: 'scenario-4',
    name: 'Оформление оффера',
    tags: ['оффер', 'кандидат'],
    relatedScenarioIds: ['scenario-5'],
    variables: [
      { name: 'offer_creator.username', defaultValue: '' },
      { name: 'offer_creator.password', defaultValue: '' },
      { name: 'offer_creator.uuid', defaultValue: '' },
    ],
    steps: `Создать оффер
Заполнить данные кандидата
Подтвердить оффер`,
  },
  'scenario-5': {
    id: 'scenario-5',
    name: 'Перевод кандидата на этап воронки',
    tags: ['кандидат', 'воронка'],
    relatedScenarioIds: [],
    variables: [
      { name: 'candidate.id', defaultValue: '' },
      { name: 'vacancy.id', defaultValue: '' },
      { name: 'recruiter.username', defaultValue: '' },
    ],
    steps: `Получить кандидата
Выбрать этап воронки
Перевести кандидата`,
  },
};

function readStorage<T>(key: string, fallback: T): T {
  const rawValue = localStorage.getItem(key);

  if (!rawValue) {
    return fallback;
  }

  try {
    return JSON.parse(rawValue) as T;
  } catch {
    return fallback;
  }
}

function getScenarioList(): ScenarioListItem[] {
  const scenarios = readStorage(
    'scenario-db.scenarios',
    DEFAULT_SCENARIOS,
  );

  return scenarios.length > 0 ? scenarios : DEFAULT_SCENARIOS;
}

function getScenarioDetails(scenarioId: string): ScenarioDetails {
  const storedScenario = localStorage.getItem(
    `scenario-db.scenario-details.${scenarioId}`,
  );

  if (storedScenario) {
    try {
      return JSON.parse(storedScenario) as ScenarioDetails;
    } catch {
      // Используем fallback.
    }
  }

  return (
    DEFAULT_SCENARIO_DETAILS[scenarioId] ?? {
      id: scenarioId,
      name: 'Новый сценарий',
      tags: [],
      relatedScenarioIds: [],
      variables: [],
      steps: '',
    }
  );
}

function getUserVariables(): UserVariable[] {
  return readStorage<UserVariable[]>('scenario-db.user-variables', []);
}

function getAvailableTags(): string[] {
  const storedTags = readStorage<Array<{ name: string }>>(
    'scenario-db.tags',
    [],
  );

  if (storedTags.length === 0) {
    return FALLBACK_TAGS;
  }

  return storedTags.map((tag) => tag.name);
}

interface EditableCardProps {
  title: string;
  isEditing: boolean;
  onStartEditing: () => void;
  onSave: () => void;
  onCancel: () => void;
  display: React.ReactNode;
  editor: React.ReactNode;
}

function EditableCard({
  title,
  isEditing,
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
              onClick={onSave}
            >
              Сохранить
            </Button>

            <Button size="small" onClick={onCancel}>
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

  const [scenario, setScenario] = useState<ScenarioDetails>(() =>
    getScenarioDetails(currentScenarioId),
  );

  const [editingField, setEditingField] = useState<EditableField>(null);

  const [draftName, setDraftName] = useState(scenario.name);
  const [draftTags, setDraftTags] = useState<string[]>(scenario.tags);
  const [draftSteps, setDraftSteps] = useState(scenario.steps);

  const [userVariables, setUserVariables] =
    useState<UserVariable[]>(getUserVariables);

  const [editingVariableId, setEditingVariableId] = useState<string | null>(
    null,
  );
  const [editingVariableValue, setEditingVariableValue] = useState('');

  const allScenarios = useMemo(getScenarioList, []);
  const availableTags = useMemo(getAvailableTags, []);

  useEffect(() => {
    if (!currentScenarioId) {
      return;
    }

    localStorage.setItem(
      `scenario-db.scenario-details.${currentScenarioId}`,
      JSON.stringify(scenario),
    );
  }, [currentScenarioId, scenario]);

  useEffect(() => {
    localStorage.setItem(
      'scenario-db.user-variables',
      JSON.stringify(userVariables),
    );
  }, [userVariables]);

  const relatedScenarios = useMemo(() => {
    return scenario.relatedScenarioIds
      .map((relatedScenarioId) =>
        allScenarios.find((item) => item.id === relatedScenarioId),
      )
      .filter((item): item is ScenarioListItem => Boolean(item));
  }, [allScenarios, scenario.relatedScenarioIds]);

  const scenarioUserVariables = useMemo<ScenarioUserVariable[]>(() => {
    return scenario.variables.map((scenarioVariable) => {
      const savedUserValue = userVariables.find(
        (userVariable) => userVariable.name === scenarioVariable.name,
      );

      return {
        id: savedUserValue?.id ?? scenarioVariable.name,
        name: scenarioVariable.name,
        value: savedUserValue?.value ?? '',
        defaultValue: scenarioVariable.defaultValue,
      };
    });
  }, [scenario.variables, userVariables]);

  const startFieldEditing = (field: Exclude<EditableField, null>) => {
    setDraftName(scenario.name);
    setDraftTags(scenario.tags);
    setDraftSteps(scenario.steps);
    setEditingField(field);
  };

  const cancelFieldEditing = () => {
    setDraftName(scenario.name);
    setDraftTags(scenario.tags);
    setDraftSteps(scenario.steps);
    setEditingField(null);
  };

  const saveField = () => {
    if (editingField === 'name') {
      const normalizedName = draftName.trim();

      if (!normalizedName) {
        message.error('Название сценария не может быть пустым');
        return;
      }

      setScenario((currentScenario) => ({
        ...currentScenario,
        name: normalizedName,
      }));
    }

    if (editingField === 'tags') {
      setScenario((currentScenario) => ({
        ...currentScenario,
        tags: draftTags,
      }));
    }

    if (editingField === 'steps') {
      setScenario((currentScenario) => ({
        ...currentScenario,
        steps: draftSteps,
      }));
    }

    setEditingField(null);
    message.success('Изменения сохранены');
  };

  const startVariableEditing = (
    variableId: string,
    currentValue: string,
  ) => {
    setEditingVariableId(variableId);
    setEditingVariableValue(currentValue);
  };

  const cancelVariableEditing = () => {
    setEditingVariableId(null);
    setEditingVariableValue('');
  };

  const saveVariableValue = (variableName: string) => {
    setUserVariables((currentVariables) => {
      const existingVariable = currentVariables.find(
        (variable) => variable.name === variableName,
      );

      if (existingVariable) {
        return currentVariables.map((variable) =>
          variable.name === variableName
            ? {
                ...variable,
                value: editingVariableValue,
              }
            : variable,
        );
      }

      return [
        ...currentVariables,
        {
          id: crypto.randomUUID(),
          name: variableName,
          value: editingVariableValue,
        },
      ];
    });

    cancelVariableEditing();
    message.success('Значение переменной сохранено');
  };

  const variableColumns: ColumnsType<ScenarioUserVariable> = [
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
              onChange={(event) => {
                setEditingVariableValue(event.target.value);
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  saveVariableValue(variable.name);
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
                onClick={() => saveVariableValue(variable.name)}
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
            aria-label={`Редактировать значение: ${variable.name}`}
            onClick={() =>
              startVariableEditing(variable.id, variable.value)
            }
          />
        );
      },
    },
  ];

  const openRelatedScenario = (relatedScenarioId: string) => {
    navigate(`/scenarios/${relatedScenarioId}`);
  };

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
      onChange={(event) => setDraftName(event.target.value)}
      onKeyDown={(event) => {
        if (event.key === 'Enter') {
          event.preventDefault();
          saveField();
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
    {scenario.name || 'Название не задано'}
  </Title>
</button>
  )}
</div>

    {editingField === 'name' ? (
      <Space size={4}>
        <Button
          type="primary"
          icon={<SaveOutlined />}
          onClick={saveField}
        >
          Сохранить
        </Button>

        <Button onClick={cancelFieldEditing}>Отмена</Button>
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
    value: tag,
    label: tag,
  }))}
  onChange={setDraftTags}
  onCancelEditing={cancelFieldEditing}
  onSaveEditing={saveField}
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
                <Tag key={tag} color="blue" className={styles.scenarioTag}>
                  {tag}
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
          onClick={saveField}
        >
          Сохранить
        </Button>

        <Button onClick={cancelFieldEditing}>Отмена</Button>
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

        <Card title={`Связанные сценарии: ${relatedScenarios.length}`}>
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
                  onDownload={() => undefined}
                  onDownloadWithoutRelated={() => undefined}
                  onDelete={() => undefined}
                />
              )}
            />
          )}
        </Card>

        <Card title="Переменные">
          <Typography.Paragraph type="secondary">
            Набор переменных определяется сценарием. Здесь редактируются
            только персональные значения текущего пользователя.
          </Typography.Paragraph>

          <Table<ScenarioUserVariable>
            rowKey="id"
            columns={variableColumns}
            dataSource={scenarioUserVariables}
            pagination={false}
            locale={{
              emptyText: 'В сценарии нет переменных',
            }}
          />
        </Card>

        <EditableCard
          title="Шаги"
          isEditing={editingField === 'steps'}
          onStartEditing={() => startFieldEditing('steps')}
          onSave={saveField}
          onCancel={cancelFieldEditing}
          display={
            scenario.steps ? (
              <Typography.Paragraph className={styles.stepsValue}>
                {scenario.steps}
              </Typography.Paragraph>
            ) : (
              <Text type="secondary">Шаги не заданы</Text>
            )
          }
          editor={
            <AppTextArea
              autoFocus
              value={draftSteps}
              autoSize={{ minRows: 8, maxRows: 24 }}
              placeholder="Введите шаги сценария"
              onChange={(event) => setDraftSteps(event.target.value)}
              onKeyDown={(event) => {
                const isSaveShortcut =
                  event.key === 'Enter' &&
                  (event.metaKey || event.ctrlKey);

                if (isSaveShortcut) {
                  event.preventDefault();
                  saveField();
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
      </div>
    </main>
  );
}
