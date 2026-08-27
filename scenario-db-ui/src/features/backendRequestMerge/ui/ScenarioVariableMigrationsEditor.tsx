import {
  DeleteOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import {
  Alert,
  Button,
  Card,
  Checkbox,
  Input,
  Space,
  Table,
  Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';

import type {
  BackendRequestUsageScenario,
  ScenarioVariableMigration,
} from '../model/backendRequestMerge.types';

interface ScenarioVariableMigrationsEditorProps {
  scenarios: BackendRequestUsageScenario[];
  value: ScenarioVariableMigration[];
  disabled?: boolean;
  onChange: (value: ScenarioVariableMigration[]) => void;
}

export function ScenarioVariableMigrationsEditor({
  scenarios,
  value,
  disabled = false,
  onChange,
}: ScenarioVariableMigrationsEditorProps) {
  const addMigration = () => {
    onChange([
      ...value,
      {
        variable: {
          name: '',
          description: '',
          isUserVariable: false,
        },
        scenarioValues: scenarios.map((scenario) => ({
          scenarioId: scenario.scenarioId,
          defaultValue: '',
        })),
      },
    ]);
  };

  const updateMigration = (
    index: number,
    updater: (
      currentMigration: ScenarioVariableMigration,
    ) => ScenarioVariableMigration,
  ) => {
    onChange(
      value.map((migration, itemIndex) =>
        itemIndex === index ? updater(migration) : migration,
      ),
    );
  };

  const removeMigration = (index: number) => {
    onChange(value.filter((_, itemIndex) => itemIndex !== index));
  };

  const columns: ColumnsType<BackendRequestUsageScenario> = [
    {
      title: 'Сценарий',
      key: 'scenarioName',
      render: (_, scenario) =>
        scenario.scenarioName ??
        `Сценарий #${scenario.scenarioId}`,
    },
    {
      title: 'Значение по умолчанию',
      key: 'defaultValue',
      render: (_, scenario, migrationIndex) => {
        const migration = value[migrationIndex];

        const scenarioValue = migration?.scenarioValues.find(
          (item) => item.scenarioId === scenario.scenarioId,
        );

        return (
          <Input
            value={scenarioValue?.defaultValue ?? ''}
            disabled={disabled}
            placeholder="Введите значение"
            onChange={(event) => {
              updateMigration(migrationIndex, (currentMigration) => ({
                ...currentMigration,
                scenarioValues: currentMigration.scenarioValues.map(
                  (item) =>
                    item.scenarioId === scenario.scenarioId
                      ? {
                          ...item,
                          defaultValue: event.target.value,
                        }
                      : item,
                ),
              }));
            }}
          />
        );
      },
    },
  ];

  return (
    <Card
      size="small"
      title="Миграции сценарных переменных"
      extra={
        <Button
          size="small"
          icon={<PlusOutlined />}
          disabled={disabled}
          onClick={addMigration}
        >
          Добавить переменную
        </Button>
      }
    >
      <Alert
        type="warning"
        showIcon
        message="Изменение общего backend-метода"
        description="Для каждой добавленной переменной укажите значение для каждого существующего сценария, который использует этот backend-метод. Это сохранит прежнее поведение сценариев."
        style={{ marginBottom: 16 }}
      />

      {scenarios.length === 0 && (
        <Typography.Paragraph type="secondary">
          Метод пока не используется существующими сценариями. Миграции
          для старых сценариев не требуются.
        </Typography.Paragraph>
      )}

      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        {value.map((migration, migrationIndex) => (
          <Card
            key={`${migration.variable.name}-${migrationIndex}`}
            size="small"
            title={`Переменная ${migrationIndex + 1}`}
            extra={
              <Button
                type="text"
                danger
                icon={<DeleteOutlined />}
                aria-label="Удалить миграцию переменной"
                disabled={disabled}
                onClick={() => removeMigration(migrationIndex)}
              />
            }
          >
            <Space
              direction="vertical"
              size={10}
              style={{ width: '100%' }}
            >
              <Space style={{ width: '100%', display: 'flex' }}>
                <Input
                  placeholder="Имя, например funnel.templateId"
                  value={migration.variable.name}
                  disabled={disabled}
                  style={{ flex: 1 }}
                  onChange={(event) =>
                    updateMigration(migrationIndex, (currentMigration) => ({
                      ...currentMigration,
                      variable: {
                        ...currentMigration.variable,
                        name: event.target.value,
                      },
                    }))
                  }
                />

                <Checkbox
                  checked={migration.variable.isUserVariable}
                  disabled={disabled}
                  onChange={(event) =>
                    updateMigration(migrationIndex, (currentMigration) => ({
                      ...currentMigration,
                      variable: {
                        ...currentMigration.variable,
                        isUserVariable: event.target.checked,
                      },
                    }))
                  }
                >
                  Пользовательская
                </Checkbox>
              </Space>

              <Input
                placeholder="Описание переменной"
                value={migration.variable.description}
                disabled={disabled}
                onChange={(event) =>
                  updateMigration(migrationIndex, (currentMigration) => ({
                    ...currentMigration,
                    variable: {
                      ...currentMigration.variable,
                      description: event.target.value,
                    },
                  }))
                }
              />

              {migration.variable.isUserVariable && (
                <Alert
                  type="info"
                  showIcon
                  message="Пользовательская переменная"
                  description="Значение будет храниться в профиле пользователя. Для сохранения существующих сценариев всё равно укажите их текущие значения ниже."
                />
              )}

              <Table<BackendRequestUsageScenario>
                size="small"
                rowKey="scenarioId"
                columns={columns.map((column) => ({
                  ...column,
                  render:
                    column.key === 'defaultValue'
                      ? (_, scenario) => {
                          const scenarioValue =
                            migration.scenarioValues.find(
                              (item) =>
                                item.scenarioId === scenario.scenarioId,
                            );

                          return (
                            <Input
                              value={scenarioValue?.defaultValue ?? ''}
                              disabled={disabled}
                              placeholder="Введите значение"
                              onChange={(event) =>
                                updateMigration(
                                  migrationIndex,
                                  (currentMigration) => ({
                                    ...currentMigration,
                                    scenarioValues:
                                      currentMigration.scenarioValues.map(
                                        (item) =>
                                          item.scenarioId ===
                                          scenario.scenarioId
                                            ? {
                                                ...item,
                                                defaultValue:
                                                  event.target.value,
                                              }
                                            : item,
                                      ),
                                  }),
                                )
                              }
                            />
                          );
                        }
                      : column.render,
                }))}
                dataSource={scenarios}
                pagination={false}
                locale={{ emptyText: 'Нет связанных сценариев' }}
              />
            </Space>
          </Card>
        ))}

        {value.length === 0 && (
          <Typography.Text type="secondary">
            Миграции не добавлены. Добавляй их, если в итоговом методе
            появляется новая переменная, например
            <Typography.Text code>
              {' ${funnel.templateId}'}
            </Typography.Text>
            .
          </Typography.Text>
        )}
      </Space>
    </Card>
  );
}
