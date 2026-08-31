import {
  Alert,
  Button,
  Card,
  Checkbox,
  Modal,
  Select,
  Space,
  Table,
  Tag,
  Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { DeleteOutlined } from '@ant-design/icons';
import { useMemo, useState } from 'react';

import type { VariableDto } from '../../../shared/types/variable';
import { AppInput } from '../../../shared/ui/AppInput/AppInput';
import type {
  VariableResolution,
} from '../model/variableImport.types';
import type {
  RelatedScenarioVariableUsage,
} from '../../scenarioCustomMethodImport/hooks/useRelatedScenarioVariableUsages';

const { Text } = Typography;

interface VariableResolutionTableRow extends VariableResolution {
  key: string;
}

interface CreateVariableTableProps {
  resolutions: VariableResolution[];
  platformVariables: VariableDto[];
  disabled?: boolean;
  onSelectPlatformVariable: (
    importedVariableName: string,
    variableId: number,
  ) => void;
  onCreateUserVariable: (
    importedVariableName: string,
  ) => void;
  onResetResolution: (
    importedVariableName: string,
  ) => void;
  onChangeVariableType: (
    importedVariableName: string,
    isUserVariable: boolean,
  ) => void;
  onChangeVariableValue: (
    importedVariableName: string,
    defaultValue: string,
  ) => void;
    onDeleteVariable: (
    importedVariableName: string,
    replacementVariableName?: string,
  ) => void;
  getRelatedScenarioUsages: (
    importedVariableName: string,
  ) => RelatedScenarioVariableUsage[];
  isRelatedScenarioVariablesLoading: boolean;
  relatedScenarioVariablesError: string | null;
}

function getVariableTypeLabel(isUserVariable: boolean): string {
  return isUserVariable
    ? 'Пользовательская'
    : 'Сценарная';
}

function getVariableTypeColor(isUserVariable: boolean): string {
  return isUserVariable ? 'blue' : 'purple';
}

function hasValue(value: string): boolean {
  return value.trim().length > 0;
}

export function CreateVariableTable({
  resolutions,
  platformVariables,
  disabled = false,
  onSelectPlatformVariable,
  onCreateUserVariable,
  onResetResolution,
  onChangeVariableType,
  onChangeVariableValue,
  onDeleteVariable,
  getRelatedScenarioUsages,
  isRelatedScenarioVariablesLoading,
  relatedScenarioVariablesError,
}: CreateVariableTableProps) {
  const [activeResolutionName, setActiveResolutionName] = useState<
    string | null
  >(null);

  const [selectedPlatformVariableId, setSelectedPlatformVariableId] =
    useState<number | undefined>(undefined);

  const [isCreationConfirmed, setIsCreationConfirmed] =
    useState(false);

  const [typeEditingResolutionName, setTypeEditingResolutionName] =
    useState<string | null>(null);

  const [editedIsUserVariable, setEditedIsUserVariable] =
    useState(true);

  const [deletingResolutionName, setDeletingResolutionName] =
    useState<string | null>(null);

  const [replacementVariableName, setReplacementVariableName] =
    useState<string | undefined>(undefined);

  const rows = useMemo<VariableResolutionTableRow[]>(
    () =>
      resolutions.map((resolution) => ({
        ...resolution,
        key: resolution.importedVariable.name,
      })),
    [resolutions],
  );

  const activeResolution = useMemo(
    () =>
      rows.find(
        (row) =>
          row.importedVariable.name === activeResolutionName,
      ) ?? null,
    [activeResolutionName, rows],
  );

  const typeEditingResolution = useMemo(
    () =>
      rows.find(
        (row) =>
          row.importedVariable.name === typeEditingResolutionName,
      ) ?? null,
    [rows, typeEditingResolutionName],
  );

  const deletingResolution = useMemo(
    () =>
      rows.find(
        (row) =>
          row.importedVariable.name === deletingResolutionName,
      ) ?? null,
    [deletingResolutionName, rows],
  );

    const relatedScenarioUsages = useMemo(
    () =>
      deletingResolution
        ? getRelatedScenarioUsages(
            deletingResolution.importedVariable.name,
          )
        : [],
    [deletingResolution, getRelatedScenarioUsages],
  );

  const isUsedInRelatedScenario =
    relatedScenarioUsages.length > 0;

  const isDeleteBlockedByRelatedScenarios =
    isRelatedScenarioVariablesLoading ||
    relatedScenarioVariablesError !== null ||
    isUsedInRelatedScenario;

  const userPlatformVariables = useMemo(
    () =>
      platformVariables.filter(
        (variable) => variable.isUserVariable,
      ),
    [platformVariables],
  );

  const replacementOptions = useMemo(() => {
    if (!deletingResolution) {
      return [];
    }

    return rows
      .filter(
        (row) =>
          row.importedVariable.name !==
          deletingResolution.importedVariable.name,
      )
      .filter(
        (row) =>
          row.importedVariable.isUserVariable ===
          deletingResolution.importedVariable.isUserVariable,
      )
      .map((row) => ({
        value: row.importedVariable.name,
        label: row.importedVariable.name,
      }));
  }, [deletingResolution, rows]);

  const isDeletingVariableUsed = Boolean(
  deletingResolution?.importedVariable.sources.some(
    (source) => source !== 'variables',
  ),
);

  const closeResolutionModal = () => {
    setActiveResolutionName(null);
    setSelectedPlatformVariableId(undefined);
    setIsCreationConfirmed(false);
  };

  const openResolutionModal = (
    importedVariableName: string,
  ) => {
    const resolution = rows.find(
      (row) =>
        row.importedVariable.name === importedVariableName,
    );

    if (!resolution || !resolution.importedVariable.isUserVariable) {
      return;
    }

    setActiveResolutionName(importedVariableName);
    setSelectedPlatformVariableId(resolution.targetVariable?.id);
    setIsCreationConfirmed(false);
  };

  const closeTypeModal = () => {
    setTypeEditingResolutionName(null);
  };

  const openTypeModal = (importedVariableName: string) => {
    const resolution = rows.find(
      (row) =>
        row.importedVariable.name === importedVariableName,
    );

    if (!resolution) {
      return;
    }

    setTypeEditingResolutionName(importedVariableName);
    setEditedIsUserVariable(
      resolution.importedVariable.isUserVariable,
    );
  };

  const saveVariableType = () => {
    if (!typeEditingResolutionName) {
      return;
    }

    onChangeVariableType(
      typeEditingResolutionName,
      editedIsUserVariable,
    );

    closeTypeModal();
  };

  const openDeleteModal = (importedVariableName: string) => {
    setDeletingResolutionName(importedVariableName);
    setReplacementVariableName(undefined);
  };

  const closeDeleteModal = () => {
    setDeletingResolutionName(null);
    setReplacementVariableName(undefined);
  };

  const confirmDeleteVariable = () => {
    if (!deletingResolution || isDeleteBlockedByRelatedScenarios) {
      return;
    }

    const importedVariableName =
      deletingResolution.importedVariable.name;

    if (isDeletingVariableUsed) {
      if (!replacementVariableName) {
        return;
      }

      onDeleteVariable(
        importedVariableName,
        replacementVariableName,
      );
    } else {
      onDeleteVariable(importedVariableName);
    }

    closeDeleteModal();
  };

  const useSelectedPlatformVariable = () => {
    if (
      !activeResolution ||
      typeof selectedPlatformVariableId !== 'number'
    ) {
      return;
    }

    onSelectPlatformVariable(
      activeResolution.importedVariable.name,
      selectedPlatformVariableId,
    );

    closeResolutionModal();
  };

  const createNewUserVariable = () => {
    if (!activeResolution || !isCreationConfirmed) {
      return;
    }

    onCreateUserVariable(
      activeResolution.importedVariable.name,
    );

    closeResolutionModal();
  };

  const columns: ColumnsType<VariableResolutionTableRow> = [
      {
        title: 'Переменная',
        key: 'name',
        width: '30%',
        render: (_, row) => (
          <button
            type="button"
            disabled={disabled}
            onClick={() =>
              openTypeModal(row.importedVariable.name)
            }
            style={{
              display: 'block',
              width: '100%',
              padding: 0,
              border: 0,
              background: 'transparent',
              textAlign: 'left',
              cursor: disabled ? 'default' : 'pointer',
            }}
          >
            <Space direction="vertical" size={4}>
              <Typography.Text code>
                {row.importedVariable.name}
              </Typography.Text>

              <Tag
                color={getVariableTypeColor(
                  row.importedVariable.isUserVariable,
                )}
                style={{
                  width: 'fit-content',
                  marginInlineEnd: 0,
                }}
              >
                {getVariableTypeLabel(
                  row.importedVariable.isUserVariable,
                )}
              </Tag>
            </Space>
          </button>
        ),
      },
      {
        title: 'Значение',
        key: 'defaultValue',
        width: '40%',
        render: (_, row) => {
          const { defaultValue, isUserVariable } =
            row.importedVariable;

          const isValid =
            isUserVariable
              ? !hasValue(defaultValue)
              : hasValue(defaultValue);

          return (
            <AppInput
              value={defaultValue}
              disabled={disabled}
              status={isValid ? undefined : 'error'}
              placeholder={
                isUserVariable
                  ? 'Для пользовательской переменной значение должно быть пустым'
                  : 'Введите значение сценарной переменной'
              }
              onChange={(event) => {
                onChangeVariableValue(
                  row.importedVariable.name,
                  event.target.value,
                );
              }}
            />
          );
        },
      },
      {
        title: 'Действия',
        key: 'actions',
        width: '30%',
        render: (_, row) => {
          const { importedVariable } = row;
          const { isUserVariable, defaultValue } = importedVariable;

          if (!isUserVariable && !hasValue(defaultValue)) {
            return (
              <Space size={8} wrap>
                <Text type="danger">
                  Заполните значение
                </Text>

                <Button
                  type="text"
                  danger
                  icon={<DeleteOutlined />}
                  disabled={disabled}
                  aria-label={`Удалить ${importedVariable.name}`}
                  onClick={() =>
                    openDeleteModal(importedVariable.name)
                  }
                />
              </Space>
            );
          }

          if (isUserVariable && hasValue(defaultValue)) {
            return (
              <Space size={8} wrap>
                <Text type="danger">
                  Значение должно быть пустым
                </Text>

                <Button
                  type="text"
                  danger
                  icon={<DeleteOutlined />}
                  disabled={disabled}
                  aria-label={`Удалить ${importedVariable.name}`}
                  onClick={() =>
                    openDeleteModal(importedVariable.name)
                  }
                />
              </Space>
            );
          }

          if (!isUserVariable) {
            return (
              <Space size={8}>
                <Tag color="success">Готово</Tag>

                <Button
                  type="text"
                  danger
                  icon={<DeleteOutlined />}
                  disabled={disabled}
                  aria-label={`Удалить ${importedVariable.name}`}
                  onClick={() =>
                    openDeleteModal(importedVariable.name)
                  }
                />
              </Space>
            );
          }

          if (row.kind === 'existing') {
            return (
              <Space size={8} wrap>
                <Tag color="success">
                  Найдена на платформе
                </Tag>

                <Button
                  type="link"
                  disabled={disabled}
                  onClick={() =>
                    openResolutionModal(importedVariable.name)
                  }
                >
                  Изменить
                </Button>

                <Button
                  type="text"
                  danger
                  icon={<DeleteOutlined />}
                  disabled={disabled}
                  aria-label={`Удалить ${importedVariable.name}`}
                  onClick={() =>
                    openDeleteModal(importedVariable.name)
                  }
                />
              </Space>
            );
          }

          if (row.kind === 'selected-existing') {
            return (
              <Space size={8} wrap>
                <Tag color="processing">
                  Используется: {row.targetVariable?.name}
                </Tag>

                <Button
                  type="link"
                  disabled={disabled}
                  onClick={() =>
                    openResolutionModal(importedVariable.name)
                  }
                >
                  Изменить
                </Button>

                <Button
                  type="text"
                  danger
                  icon={<DeleteOutlined />}
                  disabled={disabled}
                  aria-label={`Удалить ${importedVariable.name}`}
                  onClick={() =>
                    openDeleteModal(importedVariable.name)
                  }
                />
              </Space>
            );
          }

          if (row.kind === 'create-new-user') {
            return (
              <Space size={8} wrap>
                <Tag color="gold">
                  Будет создана
                </Tag>

                <Button
                  type="link"
                  disabled={disabled}
                  onClick={() =>
                    openResolutionModal(importedVariable.name)
                  }
                >
                  Изменить
                </Button>

                <Button
                  type="text"
                  danger
                  icon={<DeleteOutlined />}
                  disabled={disabled}
                  aria-label={`Удалить ${importedVariable.name}`}
                  onClick={() =>
                    openDeleteModal(importedVariable.name)
                  }
                />
              </Space>
            );
          }

          return (
            <Space size={8}>
              <Button
                type="primary"
                ghost
                disabled={disabled}
                onClick={() =>
                  openResolutionModal(importedVariable.name)
                }
              >
                Решить
              </Button>

              <Button
                type="text"
                danger
                icon={<DeleteOutlined />}
                disabled={disabled}
                aria-label={`Удалить ${importedVariable.name}`}
                onClick={() =>
                  openDeleteModal(importedVariable.name)
                }
              />
            </Space>
          );
        },
      },
    ];

  return (
    <>
      <Card
        size="small"
        title="Разрешение переменных"
        style={{ marginBottom: 24 }}
      >
        <Typography.Paragraph type="secondary">
          Нажмите на имя, чтобы изменить тип переменной. Сценарная
          переменная должна содержать значение. Пользовательская
          переменная должна иметь пустое значение и быть сопоставлена с
          переменной платформы либо отмечена для создания.
        </Typography.Paragraph>

        <Table<VariableResolutionTableRow>
          rowKey="key"
          columns={columns}
          dataSource={rows}
          pagination={false}
          scroll={{ x: 900 }}
          locale={{
            emptyText: 'В импортируемом сценарии нет переменных',
          }}
        />
      </Card>

      <Modal
        open={typeEditingResolution !== null}
        title="Изменение типа переменной"
        okText="Сохранить"
        cancelText="Отмена"
        destroyOnHidden
        okButtonProps={{ disabled }}
        onOk={saveVariableType}
        onCancel={closeTypeModal}
      >
        {typeEditingResolution && (
          <Space
            direction="vertical"
            size={16}
            style={{ width: '100%' }}
          >
            <div>
              <Text type="secondary">Переменная</Text>

              <AppInput
                readOnly
                value={
                  typeEditingResolution.importedVariable.name
                }
                style={{ marginTop: 6 }}
              />
            </div>

            <div>
              <Text type="secondary">Тип</Text>

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
                onChange={(value: boolean) => {
                  setEditedIsUserVariable(value);
                }}
              />
            </div>
          </Space>
        )}
      </Modal>

      <Modal
        open={activeResolution !== null}
        title="Разрешение пользовательской переменной"
        destroyOnHidden
        closable={!disabled}
        maskClosable={!disabled}
        footer={null}
        onCancel={closeResolutionModal}
      >
        {activeResolution && (
          <Space
            direction="vertical"
            size={16}
            style={{ width: '100%' }}
          >
            <Alert
              type="warning"
              showIcon
              message="Проверьте каталог переменных"
              description="Перед созданием переменной убедитесь, что в каталоге нет подходящей пользовательской переменной."
            />

            <div>
              <Text type="secondary">
                Импортируемая переменная
              </Text>

              <AppInput
                readOnly
                value={activeResolution.importedVariable.name}
                style={{ marginTop: 6 }}
              />
            </div>

            <div>
              <Text type="secondary">
                Переменные в базе
              </Text>

              <Space
                align="start"
                style={{
                  width: '100%',
                  display: 'flex',
                  marginTop: 6,
                }}
              >
                <Select
                  allowClear
                  showSearch
                  optionFilterProp="label"
                  placeholder="Выберите пользовательскую переменную"
                  value={selectedPlatformVariableId}
                  disabled={disabled}
                  style={{ flex: 1 }}
                  options={userPlatformVariables.map((variable) => ({
                    value: variable.id,
                    label: variable.name,
                  }))}
                  onChange={(value: number | undefined) => {
                    setSelectedPlatformVariableId(value);
                  }}
                />

                <Button
                  type="primary"
                  disabled={
                    disabled ||
                    typeof selectedPlatformVariableId !== 'number'
                  }
                  onClick={useSelectedPlatformVariable}
                >
                  Использовать
                </Button>
              </Space>
            </div>

            <Space
              align="start"
              style={{
                width: '100%',
                display: 'flex',
              }}
            >
              <Checkbox
                checked={isCreationConfirmed}
                disabled={disabled}
                onChange={(event) => {
                  setIsCreationConfirmed(event.target.checked);
                }}
              >
                Я проверил(а) каталог и понимаю, что создаю новую
                пользовательскую переменную, которую потом сложно будет удалить.
              </Checkbox>

              <Button
                danger
                disabled={disabled || !isCreationConfirmed}
                onClick={createNewUserVariable}
              >
                Создать новую
              </Button>
            </Space>

            <Button
              disabled={disabled}
              onClick={() => {
                if (!activeResolution) {
                  return;
                }

                onResetResolution(
                  activeResolution.importedVariable.name,
                );

                closeResolutionModal();
              }}
            >
              Сбросить решение
            </Button>
          </Space>
        )}
      </Modal>

      <Modal
        open={deletingResolution !== null}
        title="Удаление переменной"
        okText="Удалить"
        okButtonProps={{
          danger: true,
          disabled:
            isDeleteBlockedByRelatedScenarios ||
            (
              isDeletingVariableUsed &&
              (
                replacementOptions.length === 0 ||
                !replacementVariableName
              )
            ),
        }}
        cancelText="Отмена"
        destroyOnHidden
        onOk={confirmDeleteVariable}
        onCancel={closeDeleteModal}
      >
        {deletingResolution && (
          <Space
            direction="vertical"
            size={16}
            style={{ width: '100%' }}
          >
            <Text>
              Удалить переменную{' '}
              <Typography.Text code>
                {deletingResolution.importedVariable.name}
              </Typography.Text>
              ?
            </Text>

            {isRelatedScenarioVariablesLoading ? (
  <Alert
    type="info"
    showIcon
    message="Проверяем связанные сценарии"
    description="Удаление будет доступно после проверки использования переменной в связанных сценариях."
  />
) : relatedScenarioVariablesError ? (
  <Alert
    type="error"
    showIcon
    message="Нельзя проверить связанные сценарии"
    description={relatedScenarioVariablesError}
  />
) : isUsedInRelatedScenario ? (
  <Alert
    type="error"
    showIcon
    message="Нельзя удалить переменную"
    description={`Переменная используется в связанных сценариях: ${relatedScenarioUsages
      .map((usage) => `«${usage.scenarioName}»`)
      .join(', ')}.`}
  />
) : !isDeletingVariableUsed ? (
  <Alert
    type="info"
    showIcon
    message="Эта переменная нигде не используется"
    description="Вы желаете удалить её из импортируемого сценария?"
  />
) : replacementOptions.length === 0 ? (
  <Alert
    type="error"
    showIcon
    message="Невозможно удалить переменную"
    description="Переменная используется в текущем сценарии, но нет другой переменной того же типа, на которую можно заменить ссылки."
  />
) : (
  <>
    <Alert
      type="warning"
      showIcon
      message="Переменная используется в сценарии"
      description="Выберите другую переменную того же типа. После подтверждения все ссылки на удаляемую переменную будут заменены выбранным именем."
    />

    <Select
      showSearch
      optionFilterProp="label"
      placeholder="Выберите замену"
      value={replacementVariableName}
      options={replacementOptions}
      onChange={(value: string) => {
        setReplacementVariableName(value);
      }}
    />
  </>
)}
          </Space>
        )}
      </Modal>
    </>
  );
}
