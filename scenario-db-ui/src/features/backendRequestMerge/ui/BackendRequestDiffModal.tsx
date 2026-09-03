import {
  CloseOutlined,
  MergeCellsOutlined,
  SwapOutlined,
} from '@ant-design/icons';
import {
  Alert,
  Button,
  Descriptions,
  Modal,
  Space,
  Table,
  Tabs,
  Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  useMemo,
  useState,
} from 'react';


import {
  getDifferentSettings,
  getFieldOverridesDiff,
  getFormDataDiff,
  getJsonDiff,
  getResponseExtractorsDiff,
} from '../model/backendRequestDiff';
import type {
  BackendCollectionDiffRow,
  BackendDiffState,
  BackendFieldOverride,
  BackendFormDataDiffRow,
  BackendRequestDto,
  BackendResponseExtractor,
  JsonDiffLine,
} from '../model/backendRequestMerge.types';


interface BackendRequestDiffModalProps {
  open: boolean;
  existingRequest: BackendRequestDto;
  importedRequest: BackendRequestDto;
  onCancelImport: () => void;
  onOpenUseExistingWorkspace: () => void;
  onRenameImported: (importedName: string) => void;
  onOpenMergeWorkspace: () => void;
}


function getLineClassName(line: JsonDiffLine): string {
  if (line.state === 'different') {
    return 'backendDiffLineDifferent';
  }

  if (line.state === 'only-left') {
    return 'backendDiffLineOnlyLeft';
  }

  if (line.state === 'only-right') {
    return 'backendDiffLineOnlyRight';
  }

  return '';
}


function getTableRowClassName(
  state: BackendDiffState,
): string {
  if (state === 'different') {
    return 'backendDiffRowDifferent';
  }

  if (state === 'only-left') {
    return 'backendDiffRowOnlyLeft';
  }

  if (state === 'only-right') {
    return 'backendDiffRowOnlyRight';
  }

  return '';
}


function JsonDiffViewer({
  leftTitle,
  rightTitle,
  leftValue,
  rightValue,
}: {
  leftTitle: string;
  rightTitle: string;
  leftValue: string | null | undefined;
  rightValue: string | null | undefined;
}) {
  const diff = useMemo(
    () => getJsonDiff(leftValue, rightValue),
    [leftValue, rightValue],
  );

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)',
        gap: 12,
      }}
    >
      <div>
        <Typography.Text strong>{leftTitle}</Typography.Text>

        <pre
          style={{
            marginTop: 8,
            minHeight: 260,
            maxHeight: 420,
            overflow: 'auto',
            padding: 12,
            border: '1px solid #d9d9d9',
            borderRadius: 6,
            background: '#fafafa',
            fontSize: 12,
            lineHeight: 1.55,
          }}
        >
          {diff.leftLines.map((item, index) => (
            <div
              key={`${item.line}-${index}`}
              className={getLineClassName(item)}
            >
              {String(index + 1).padStart(3, ' ')} {item.line}
            </div>
          ))}
        </pre>
      </div>

      <div>
        <Typography.Text strong>{rightTitle}</Typography.Text>

        <pre
          style={{
            marginTop: 8,
            minHeight: 260,
            maxHeight: 420,
            overflow: 'auto',
            padding: 12,
            border: '1px solid #d9d9d9',
            borderRadius: 6,
            background: '#fafafa',
            fontSize: 12,
            lineHeight: 1.55,
          }}
        >
          {diff.rightLines.map((item, index) => (
            <div
              key={`${item.line}-${index}`}
              className={getLineClassName(item)}
            >
              {String(index + 1).padStart(3, ' ')} {item.line}
            </div>
          ))}
        </pre>
      </div>
    </div>
  );
}


function isFormBodyType(
  bodyType: BackendRequestDto['bodyType'],
): boolean {
  const normalizedBodyType = String(bodyType).toUpperCase();

  return (
    normalizedBodyType === 'FORM_URLENCODED' ||
    normalizedBodyType === 'FORM_DATA'
  );
}


function FormDataDiffTable({
  existingRequest,
  importedRequest,
}: {
  existingRequest: BackendRequestDto;
  importedRequest: BackendRequestDto;
}) {
  const rows = useMemo(
    () =>
      getFormDataDiff(
        existingRequest.formDataJson,
        importedRequest.formDataJson,
      ),
    [
      existingRequest.formDataJson,
      importedRequest.formDataJson,
    ],
  );

  const existingColumns: ColumnsType<BackendFormDataDiffRow> = [
    {
      title: 'Поле',
      dataIndex: 'key',
      key: 'key',
      width: '35%',
      render: (key, row) =>
        row.occurrence > 0
          ? `${key} [${row.occurrence + 1}]`
          : key,
    },
    {
      title: 'Значение',
      dataIndex: 'existingValue',
      key: 'existingValue',
      render: (value: string | null) => value ?? '—',
    },
  ];

  const importedColumns: ColumnsType<BackendFormDataDiffRow> = [
    {
      title: 'Поле',
      dataIndex: 'key',
      key: 'key',
      width: '35%',
      render: (key, row) =>
        row.occurrence > 0
          ? `${key} [${row.occurrence + 1}]`
          : key,
    },
    {
      title: 'Значение',
      dataIndex: 'importedValue',
      key: 'importedValue',
      render: (value: string | null) => value ?? '—',
    },
  ];

  return (
    <div style={{ marginTop: 20 }}>
      <Typography.Title level={5}>Form-data поля</Typography.Title>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)',
          gap: 12,
        }}
      >
        <div>
          <Typography.Text strong>Существующий</Typography.Text>

          <Table<BackendFormDataDiffRow>
            size="small"
            rowKey={(row) => `${row.key}-${row.occurrence}`}
            columns={existingColumns}
            dataSource={rows}
            pagination={false}
            style={{ marginTop: 8 }}
            rowClassName={(row) =>
              getTableRowClassName(row.state)
            }
            locale={{ emptyText: 'Нет данных' }}
          />
        </div>

        <div>
          <Typography.Text strong>Импортируемый</Typography.Text>

          <Table<BackendFormDataDiffRow>
            size="small"
            rowKey={(row) => `${row.key}-${row.occurrence}`}
            columns={importedColumns}
            dataSource={rows}
            pagination={false}
            style={{ marginTop: 8 }}
            rowClassName={(row) =>
              getTableRowClassName(row.state)
            }
            locale={{ emptyText: 'Нет данных' }}
          />
        </div>
      </div>
    </div>
  );
}


function CollectionDiffTable<T extends object>({
  title,
  rows,
  existingColumns,
  importedColumns,
}: {
  title: string;
  rows: BackendCollectionDiffRow<T>[];
  existingColumns: ColumnsType<BackendCollectionDiffRow<T>>;
  importedColumns: ColumnsType<BackendCollectionDiffRow<T>>;
}) {
  return (
    <div style={{ marginTop: 20 }}>
      <Typography.Title level={5}>{title}</Typography.Title>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)',
          gap: 12,
        }}
      >
        <div>
          <Typography.Text strong>Существующий</Typography.Text>

          <Table<BackendCollectionDiffRow<T>>
            size="small"
            rowKey={(row) => row.key}
            columns={existingColumns}
            dataSource={rows}
            pagination={false}
            style={{ marginTop: 8 }}
            rowClassName={(row) =>
              getTableRowClassName(row.state)
            }
            locale={{ emptyText: 'Нет данных' }}
          />
        </div>

        <div>
          <Typography.Text strong>Импортируемый</Typography.Text>

          <Table<BackendCollectionDiffRow<T>>
            size="small"
            rowKey={(row) => row.key}
            columns={importedColumns}
            dataSource={rows}
            pagination={false}
            style={{ marginTop: 8 }}
            rowClassName={(row) =>
              getTableRowClassName(row.state)
            }
            locale={{ emptyText: 'Нет данных' }}
          />
        </div>
      </div>
    </div>
  );
}


export function BackendRequestDiffModal({
  open,
  existingRequest,
  importedRequest,
  onCancelImport,
  onOpenUseExistingWorkspace,
  onRenameImported,
  onOpenMergeWorkspace,
}: BackendRequestDiffModalProps) {
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  const settingsDiff = useMemo(
    () => getDifferentSettings(existingRequest, importedRequest),
    [existingRequest, importedRequest],
  );

  const fieldOverridesDiff = useMemo(
    () => getFieldOverridesDiff(existingRequest, importedRequest),
    [existingRequest, importedRequest],
  );

  const responseExtractorsDiff = useMemo(
    () =>
      getResponseExtractorsDiff(
        existingRequest,
        importedRequest,
      ),
    [existingRequest, importedRequest],
  );

  const hasFormBody =
    isFormBodyType(existingRequest.bodyType) ||
    isFormBodyType(importedRequest.bodyType);

  const existingOverrideColumns: ColumnsType<
    BackendCollectionDiffRow<BackendFieldOverride>
  > = [
    {
      title: 'Поле',
      key: 'fieldPath',
      render: (_, row) => row.existing?.fieldPath ?? '—',
    },
    {
      title: 'Правило',
      key: 'method',
      render: (_, row) => row.existing?.method ?? '—',
    },
    {
      title: 'Аргумент',
      key: 'methodArg',
      render: (_, row) => row.existing?.methodArg ?? '—',
    },
    {
      title: 'Тип',
      key: 'type',
      width: 90,
      render: (_, row) => row.existing?.type ?? '—',
    },
  ];

  const importedOverrideColumns: ColumnsType<
    BackendCollectionDiffRow<BackendFieldOverride>
  > = [
    {
      title: 'Поле',
      key: 'fieldPath',
      render: (_, row) => row.imported?.fieldPath ?? '—',
    },
    {
      title: 'Правило',
      key: 'method',
      render: (_, row) => row.imported?.method ?? '—',
    },
    {
      title: 'Аргумент',
      key: 'methodArg',
      render: (_, row) => row.imported?.methodArg ?? '—',
    },
    {
      title: 'Тип',
      key: 'type',
      width: 90,
      render: (_, row) => row.imported?.type ?? '—',
    },
  ];

  const existingExtractorColumns: ColumnsType<
    BackendCollectionDiffRow<BackendResponseExtractor>
  > = [
    {
      title: 'Поле ответа',
      key: 'fieldPath',
      render: (_, row) => row.existing?.fieldPath ?? '—',
    },
    {
      title: 'Переменная',
      key: 'variableName',
      render: (_, row) => row.existing?.variableName ?? '—',
    },
  ];

  const importedExtractorColumns: ColumnsType<
    BackendCollectionDiffRow<BackendResponseExtractor>
  > = [
    {
      title: 'Поле ответа',
      key: 'fieldPath',
      render: (_, row) => row.imported?.fieldPath ?? '—',
    },
    {
      title: 'Переменная',
      key: 'variableName',
      render: (_, row) => row.imported?.variableName ?? '—',
    },
  ];

  return (
    <>
      <Modal
        title="Конфликт backend-метода"
        open={open && !isDetailsOpen}
        footer={null}
        closable={false}
        maskClosable={false}
        destroyOnHidden
      >
        <Space
          direction="vertical"
          size={16}
          style={{ width: '100%' }}
        >
          <Alert
            type="warning"
            showIcon
            message={`Метод «${importedRequest.name}» уже существует`}
            description="Импортируемый метод отличается от метода в библиотеке. Перед выбором действия ознакомьтесь с обеими версиями."
          />

          <Typography.Paragraph style={{ marginBottom: 0 }}>
            Импорт не сохранит никаких изменений, пока вы не
            выберете действие после просмотра различий.
          </Typography.Paragraph>

          <Space>
            <Button
              danger
              icon={<CloseOutlined />}
              onClick={onCancelImport}
            >
              Отменить импорт
            </Button>

            <Button
              type="primary"
              icon={<SwapOutlined />}
              onClick={() => setIsDetailsOpen(true)}
            >
              Ознакомиться
            </Button>
          </Space>
        </Space>
      </Modal>

      <Modal
        title={`Сравнение метода: ${existingRequest.name}`}
        open={open && isDetailsOpen}
        width="96vw"
        style={{ top: 16 }}
        footer={
          <Space wrap>
            <Button danger onClick={onCancelImport}>
              Отменить импорт
            </Button>

            <Button onClick={onOpenUseExistingWorkspace}>
              Использовать существующий
            </Button>

            <Button
              onClick={() => onRenameImported(importedRequest.name)}
            >
              Переименовать импортируемый метод
            </Button>

            <Button
              type="primary"
              icon={<MergeCellsOutlined />}
              onClick={onOpenMergeWorkspace}
            >
              Объединить
            </Button>
          </Space>
        }
        onCancel={() => setIsDetailsOpen(false)}
        destroyOnHidden
      >
        <Alert
          type="info"
          showIcon
          message="Как читать сравнение"
          description="Красным отмечены изменённые значения, оранжевым — данные только в существующем методе, зелёным — данные только в импортируемом. Ничего не будет изменено, пока вы не выберете действие."
          style={{ marginBottom: 16 }}
        />

        {settingsDiff.length > 0 && (
          <Descriptions
            size="small"
            bordered
            column={2}
            title="Отличия настроек"
            style={{ marginBottom: 16 }}
          >
            {settingsDiff.map((field) => (
              <Descriptions.Item key={field} label={field}>
                <Typography.Text type="danger">
                  {String(
                    existingRequest[
                      field as keyof BackendRequestDto
                    ],
                  )}
                </Typography.Text>
                {' → '}
                <Typography.Text type="danger">
                  {String(
                    importedRequest[
                      field as keyof BackendRequestDto
                    ],
                  )}
                </Typography.Text>
              </Descriptions.Item>
            ))}
          </Descriptions>
        )}

        <Tabs
          items={[
            {
              key: 'request-body',
              label: 'Request body',
              children: (
                <>
                  {hasFormBody ? (
                    <FormDataDiffTable
                      existingRequest={existingRequest}
                      importedRequest={importedRequest}
                    />
                  ) : (
                    <JsonDiffViewer
                      leftTitle="Существующий DTO"
                      rightTitle="Импортируемый DTO"
                      leftValue={existingRequest.requestBody}
                      rightValue={importedRequest.requestBody}
                    />
                  )}

                  <CollectionDiffTable<BackendFieldOverride>
                    title="Field overrides"
                    rows={fieldOverridesDiff}
                    existingColumns={existingOverrideColumns}
                    importedColumns={importedOverrideColumns}
                  />
                </>
              ),
            },
            {
              key: 'response',
              label: 'Response body',
              children: (
                <>
                  <JsonDiffViewer
                    leftTitle="Существующий response"
                    rightTitle="Импортируемый response"
                    leftValue={
                      existingRequest.capturedResponseBody
                    }
                    rightValue={
                      importedRequest.capturedResponseBody
                    }
                  />

                  <CollectionDiffTable<BackendResponseExtractor>
                    title="Response extractors"
                    rows={responseExtractorsDiff}
                    existingColumns={existingExtractorColumns}
                    importedColumns={importedExtractorColumns}
                  />
                </>
              ),
            },
            {
              key: 'headers',
              label: 'Headers',
              children: (
                <JsonDiffViewer
                  leftTitle="Существующий headers"
                  rightTitle="Импортируемый headers"
                  leftValue={existingRequest.requestHeadersJson}
                  rightValue={importedRequest.requestHeadersJson}
                />
              ),
            },
          ]}
        />
      </Modal>
    </>
  );
}
