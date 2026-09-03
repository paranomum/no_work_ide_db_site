import {
  DeleteOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import {
  Button,
  Card,
  Input,
  Modal,
  Select,
  Space,
  Table,
  Tag,
  Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

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

interface ScenarioVariableMigrationTableRow
  extends ScenarioVariableMigration {
  key: string;
  migrationIndex: number;
}

function getScenarioLabel(
  scenario: BackendRequestUsageScenario,
): string {
  return (
    scenario.scenarioName ??
    `Сценарий #${scenario.scenarioId}`
  );
}

function getVariableTypeLabel(isUserVariable: boolean): string {
  return isUserVariable
    ? 'Пользовательская'
    : 'Сценарная';
}

function getVariableTypeColor(isUserVariable: boolean): string {
  return isUserVariable ? 'blue' : 'purple';
}

function createMigrationKey(): string {
  return crypto.randomUUID();
}

export function ScenarioVariableMigrationsEditor({
  scenarios,
  value,
  disabled = false,
  onChange,
}: ScenarioVariableMigrationsEditorProps) {
  const [
    typeEditingMigrationIndex,
    setTypeEditingMigrationIndex,
  ] = useState<number | null>(null);

  const [editedIsUserVariable, setEditedIsUserVariable] =
    useState(false);

  /*
   * Нельзя использовать variable.name в rowKey:
   * имя меняется во время ввода, строка Table размонтируется,
   * поэтому Input теряет фокус.
   *
   * UI-ключи не добавляются в ScenarioVariableMigration:
   * этот объект затем уходит в merge/import DTO.
   */
  const migrationKeysRef = useRef<string[]>(
    value.map(() => createMigrationKey()),
  );

  /*
   * value может быть заменён родительским компонентом:
   * например, при открытии другого merge draft или сбросе формы.
   * Поддерживаем число ключей синхронным с числом migration.
   */
  useEffect(() => {
    const migrationKeys = migrationKeysRef.current;

    while (migrationKeys.length < value.length) {
      migrationKeys.push(createMigrationKey());
    }

    if (migrationKeys.length > value.length) {
      migrationKeys.splice(value.length);
    }
  }, [value.length]);

  const rows = useMemo<ScenarioVariableMigrationTableRow[]>(
    () =>
      value.map((migration, migrationIndex) => ({
        ...migration,
        key: migrationKeysRef.current[migrationIndex],
        migrationIndex,
      })),
    [value],
  );

  const typeEditingMigration = useMemo(
    () =>
      rows.find(
        (row) =>
          row.migrationIndex === typeEditingMigrationIndex,
      ) ?? null,
    [rows, typeEditingMigrationIndex],
  );

  const addMigration = () => {
    migrationKeysRef.current.push(createMigrationKey());

    onChange([
      ...value,
      {
        variable: {
          name: '',
          /*
           * Поле требуется текущим типом, но в этой таблице
           * описание намеренно не показываем.
           */
          description: '',
          isUserVariable: false,
        },
        scenarioValues: scenarios.map((scenario) => ({
          scenarioId: scenario.scenarioId,
          defaultValue: '',
        })),
        importedScenarioDefaultValue: '',
      },
    ]);
  };

  const updateMigration = (
    migrationIndex: number,
    updater: (
      currentMigration: ScenarioVariableMigration,
    ) => ScenarioVariableMigration,
  ) => {
    onChange(
      value.map((migration, index) =>
        index === migrationIndex
          ? updater(migration)
          : migration,
      ),
    );
  };

  const removeMigration = (migrationIndex: number) => {
    migrationKeysRef.current.splice(migrationIndex, 1);

    onChange(
      value.filter((_, index) => index !== migrationIndex),
    );

    setTypeEditingMigrationIndex((currentIndex) => {
      if (currentIndex === null) {
        return null;
      }

      if (currentIndex === migrationIndex) {
        return null;
      }

      return currentIndex > migrationIndex
        ? currentIndex - 1
        : currentIndex;
    });
  };

  const updateExistingScenarioValue = (
    migrationIndex: number,
    scenarioId: number,
    defaultValue: string,
  ) => {
    updateMigration(migrationIndex, (migration) => {
      const hasScenarioValue = migration.scenarioValues.some(
        (item) => item.scenarioId === scenarioId,
      );

      return {
        ...migration,
        scenarioValues: hasScenarioValue
          ? migration.scenarioValues.map((item) =>
              item.scenarioId === scenarioId
                ? {
                    ...item,
                    defaultValue,
                  }
                : item,
            )
          : [
              ...migration.scenarioValues,
              {
                scenarioId,
                defaultValue,
              },
            ],
      };
    });
  };

  const openVariableTypeModal = (migrationIndex: number) => {
    const migration = value[migrationIndex];

    if (!migration) {
      return;
    }

    setTypeEditingMigrationIndex(migrationIndex);
    setEditedIsUserVariable(
      migration.variable.isUserVariable,
    );
  };

  const closeVariableTypeModal = () => {
    setTypeEditingMigrationIndex(null);
  };

  const saveVariableType = () => {
    if (typeEditingMigrationIndex === null) {
      return;
    }

    updateMigration(
      typeEditingMigrationIndex,
      (migration) => ({
        ...migration,
        variable: {
          ...migration.variable,
          isUserVariable: editedIsUserVariable,
        },
      }),
    );

    closeVariableTypeModal();
  };

  const columns = useMemo<
    ColumnsType<ScenarioVariableMigrationTableRow>
  >(
    () => [
      {
        title: 'Переменная',
        key: 'variable',
        width: 280,
        fixed: 'left',
        render: (_, row) => (
          <Space
            direction="vertical"
            size={6}
            style={{ width: '100%' }}
          >
            <Input
              value={row.variable.name}
              disabled={disabled}
              placeholder="Например funnel.templateId"
              onChange={(event) =>
                updateMigration(
                  row.migrationIndex,
                  (migration) => ({
                    ...migration,
                    variable: {
                      ...migration.variable,
                      name: event.target.value,
                    },
                  }),
                )
              }
            />

            <Button
              type="text"
              size="small"
              disabled={disabled}
              onClick={() =>
                openVariableTypeModal(row.migrationIndex)
              }
              style={{
                width: 'fit-content',
                height: 'auto',
                padding: 0,
              }}
            >
              <Tag
                color={getVariableTypeColor(
                  row.variable.isUserVariable,
                )}
                style={{ marginInlineEnd: 0 }}
              >
                {getVariableTypeLabel(
                  row.variable.isUserVariable,
                )}
              </Tag>
            </Button>
          </Space>
        ),
      },

      ...scenarios.map<
        ColumnsType<ScenarioVariableMigrationTableRow>[number]
      >((scenario) => ({
        title: getScenarioLabel(scenario),
        key: `scenario-${scenario.scenarioId}`,
        width: 220,
        render: (_, row) => {
          const scenarioValue = row.scenarioValues.find(
            (item) => item.scenarioId === scenario.scenarioId,
          );

          return (
            <Input
              value={scenarioValue?.defaultValue ?? ''}
              disabled={disabled}
              placeholder="Значение"
              onChange={(event) =>
                updateExistingScenarioValue(
                  row.migrationIndex,
                  scenario.scenarioId,
                  event.target.value,
                )
              }
            />
          );
        },
      })),

      {
        title: 'Импортируемый сценарий',
        key: 'importedScenario',
        width: 240,
        render: (_, row) => (
          <Input
            value={row.importedScenarioDefaultValue}
            disabled={disabled}
            placeholder="Значение"
            onChange={(event) =>
              updateMigration(
                row.migrationIndex,
                (migration) => ({
                  ...migration,
                  importedScenarioDefaultValue:
                    event.target.value,
                }),
              )
            }
          />
        ),
      },

      {
        title: 'Действия',
        key: 'actions',
        fixed: 'right',
        width: 88,
        render: (_, row) => (
          <Button
            type="text"
            danger
            icon={<DeleteOutlined />}
            aria-label={`Удалить переменную ${
              row.variable.name || 'без названия'
            }`}
            disabled={disabled}
            onClick={() =>
              removeMigration(row.migrationIndex)
            }
          />
        ),
      },
    ],
    [
      disabled,
      scenarios,
      value,
    ],
  );

  return (
    <>
      <Card
        size="small"
        title="Миграции сценарных переменных"
        extra={
          <Button
            size="small"
            type="primary"
            icon={<PlusOutlined />}
            disabled={disabled}
            onClick={addMigration}
          >
            Добавить переменную
          </Button>
        }
      >
        <Table<ScenarioVariableMigrationTableRow>
          size="middle"
          rowKey="key"
          columns={columns}
          dataSource={rows}
          pagination={false}
          tableLayout="auto"
          scroll={{ x: 'max-content' }}
          locale={{
            emptyText: (
              <Typography.Text type="secondary">
                Переменные не добавлены. Нажмите «Добавить
                переменную», если итоговый метод требует новое
                значение.
              </Typography.Text>
            ),
          }}
        />
      </Card>

      <Modal
        open={typeEditingMigration !== null}
        title="Изменение типа переменной"
        okText="Сохранить"
        cancelText="Отмена"
        destroyOnHidden
        okButtonProps={{ disabled }}
        onOk={saveVariableType}
        onCancel={closeVariableTypeModal}
      >
        {typeEditingMigration && (
          <Space
            direction="vertical"
            size={16}
            style={{ width: '100%' }}
          >
            <div>
              <Typography.Text type="secondary">
                Переменная
              </Typography.Text>

              <Input
                readOnly
                value={
                  typeEditingMigration.variable.name ||
                  'Новая переменная'
                }
                style={{ marginTop: 6 }}
              />
            </div>

            <div>
              <Typography.Text type="secondary">
                Тип
              </Typography.Text>

              <Select
                value={editedIsUserVariable}
                disabled={disabled}
                style={{ width: '100%', marginTop: 6 }}
                options={[
                  {
                    value: false,
                    label: 'Сценарная',
                  },
                  {
                    value: true,
                    label: 'Пользовательская',
                  },
                ]}
                onChange={(nextValue: boolean) => {
                  setEditedIsUserVariable(nextValue);
                }}
              />
            </div>
          </Space>
        )}
      </Modal>
    </>
  );
}
