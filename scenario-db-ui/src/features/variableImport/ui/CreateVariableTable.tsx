import {
  Alert,
  Button,
  Card,
  Checkbox,
  Input,
  Modal,
  Select,
  Space,
  Table,
  Tag,
  Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useMemo, useState } from 'react';

import type { VariableDto } from '../../../shared/types/variable';
import type {
  VariableResolution,
} from '../model/variableImport.types';

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

  const userPlatformVariables = useMemo(
    () =>
      platformVariables.filter(
        (variable) => variable.isUserVariable,
      ),
    [platformVariables],
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

  const columns = useMemo<ColumnsType<VariableResolutionTableRow>>(
    () => [
      {
        title: 'Переменная',
        key: 'name',
        width: '34%',
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
        width: '36%',
        render: (_, row) => {
          const { defaultValue, isUserVariable } =
            row.importedVariable;

          const isValid =
            isUserVariable
              ? !hasValue(defaultValue)
              : hasValue(defaultValue);

          return (
            <Input
              readOnly
              status={isValid ? undefined : 'error'}
              value={defaultValue || undefined}
              placeholder={
                isUserVariable
                  ? 'Для пользовательской переменной значение должно быть пустым'
                  : 'Заполните значение сценарной переменной'
              }
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

          if (!isUserVariable) {
            return hasValue(defaultValue) ? (
              <Tag color="success">Готово</Tag>
            ) : (
              <Text type="danger">
                Заполните значение сценарной переменной
              </Text>
            );
          }

          if (hasValue(defaultValue)) {
            return (
              <Text type="danger">
                Для пользовательской переменной значение должно быть пустым
              </Text>
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
                    openResolutionModal(
                      importedVariable.name,
                    )
                  }
                >
                  Изменить
                </Button>
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
                    openResolutionModal(
                      importedVariable.name,
                    )
                  }
                >
                  Изменить
                </Button>
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
                    openResolutionModal(
                      importedVariable.name,
                    )
                  }
                >
                  Изменить
                </Button>
              </Space>
            );
          }

          return (
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
          );
        },
      },
    ],
    [disabled, rows],
  );

  return (
    <>
      <Card
        size="small"
        title="Разрешение переменных"
        style={{ marginBottom: 24 }}
      >
        <Typography.Paragraph type="secondary">
          Нажмите на имя переменной, чтобы изменить её тип.
          Сценарная переменная создаётся внутри сценария и должна
          содержать значение. Пользовательская переменная должна иметь
          пустое значение: её можно сопоставить с существующей
          переменной платформы либо создать новую.
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
        confirmLoading={false}
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

              <Input
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

            {editedIsUserVariable ? (
              <Alert
                type="info"
                showIcon
                message="Пользовательская переменная"
                description="Значение в импортируемом JSON должно быть пустым. После сохранения выберите существующую пользовательскую переменную платформы или подтвердите создание новой."
              />
            ) : (
              <Alert
                type="info"
                showIcon
                message="Сценарная переменная"
                description="Эта переменная будет создана вместе со сценарием и не требует сопоставления с каталогом платформы. Убедитесь, что её значение заполнено."
              />
            )}
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
              description="Перед созданием новой переменной убедитесь, что на платформе нет подходящей пользовательской переменной. Дубли будет сложно удалить или объединить."
            />

            <div>
              <Text type="secondary">
                Импортируемая переменная
              </Text>

              <Input
                readOnly
                value={activeResolution.importedVariable.name}
                style={{ marginTop: 6 }}
              />

              <Tag
                color="blue"
                style={{ marginTop: 8, marginInlineEnd: 0 }}
              >
                Пользовательская
              </Tag>
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
                пользовательскую переменную.
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
    </>
  );
}
