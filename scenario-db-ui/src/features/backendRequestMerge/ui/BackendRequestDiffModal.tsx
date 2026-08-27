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
import { useMemo, useState } from 'react';

import {
  getDifferentSettings,
  getJsonDiff,
  parseFieldOverrides,
  parseResponseExtractors,
} from '../model/backendRequestDiff';
import type {
  BackendFieldOverride,
  BackendRequestDto,
  BackendResponseExtractor,
  JsonDiffLine,
} from '../model/backendRequestMerge.types';

interface BackendRequestDiffModalProps {
  open: boolean;
  existingRequest: BackendRequestDto;
  importedRequest: BackendRequestDto;
  onCancelImport: () => void;
  onUseExisting: () => void;
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

function DiffTable<T extends object>({
  title,
  existingRows,
  importedRows,
  columns,
  getRowKey,
}: {
  title: string;
  existingRows: T[];
  importedRows: T[];
  columns: ColumnsType<T>;
  getRowKey: (row: T) => string;
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

          <Table<T>
            size="small"
            rowKey={getRowKey}
            columns={columns}
            dataSource={existingRows}
            pagination={false}
            style={{ marginTop: 8 }}
            locale={{ emptyText: 'Нет данных' }}
          />
        </div>

        <div>
          <Typography.Text strong>Импортируемый</Typography.Text>

          <Table<T>
            size="small"
            rowKey={getRowKey}
            columns={columns}
            dataSource={importedRows}
            pagination={false}
            style={{ marginTop: 8 }}
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
  onUseExisting,
  onRenameImported,
  onOpenMergeWorkspace,
}: BackendRequestDiffModalProps) {
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  const settingsDiff = useMemo(
    () => getDifferentSettings(existingRequest, importedRequest),
    [existingRequest, importedRequest],
  );

  const existingOverrides = useMemo(
    () => parseFieldOverrides(existingRequest),
    [existingRequest],
  );

  const importedOverrides = useMemo(
    () => parseFieldOverrides(importedRequest),
    [importedRequest],
  );

  const existingExtractors = useMemo(
    () => parseResponseExtractors(existingRequest),
    [existingRequest],
  );

  const importedExtractors = useMemo(
    () => parseResponseExtractors(importedRequest),
    [importedRequest],
  );

  const overrideColumns: ColumnsType<BackendFieldOverride> = [
    {
      title: 'Поле',
      dataIndex: 'fieldPath',
      key: 'fieldPath',
    },
    {
      title: 'Правило',
      dataIndex: 'method',
      key: 'method',
    },
    {
      title: 'Аргумент',
      dataIndex: 'methodArg',
      key: 'methodArg',
    },
    {
      title: 'Тип',
      dataIndex: 'type',
      key: 'type',
      width: 90,
    },
  ];

  const extractorColumns: ColumnsType<BackendResponseExtractor> = [
    {
      title: 'Поле ответа',
      dataIndex: 'fieldPath',
      key: 'fieldPath',
    },
    {
      title: 'Переменная',
      dataIndex: 'variableName',
      key: 'variableName',
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
        <Space direction="vertical" size={16} style={{ width: '100%' }}>
          <Alert
            type="warning"
            showIcon
            message={`Метод «${importedRequest.name}» уже существует`}
            description="Импортируемый метод отличается от метода в библиотеке. Перед выбором действия ознакомьтесь с обеими версиями."
          />

          <Typography.Paragraph style={{ marginBottom: 0 }}>
            Импорт не сохранит никаких изменений, пока вы не выберете
            действие после просмотра различий.
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

            <Button onClick={onUseExisting}>
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
          description="Красным отмечены строки, которые различаются или присутствуют только с одной стороны. Ничего не будет изменено, пока вы не выберете действие."
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
                  {String(existingRequest[
                    field as keyof BackendRequestDto
                  ])}
                </Typography.Text>
                {' → '}
                <Typography.Text type="danger">
                  {String(importedRequest[
                    field as keyof BackendRequestDto
                  ])}
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
                <JsonDiffViewer
                  leftTitle="Существующий DTO"
                  rightTitle="Импортируемый DTO"
                  leftValue={existingRequest.requestBody}
                  rightValue={importedRequest.requestBody}
                />
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
            {
              key: 'response',
              label: 'Response body',
              children: (
                <JsonDiffViewer
                  leftTitle="Существующий response"
                  rightTitle="Импортируемый response"
                  leftValue={existingRequest.capturedResponseBody}
                  rightValue={importedRequest.capturedResponseBody}
                />
              ),
            },
            {
              key: 'form-data',
              label: 'Form-data',
              children: (
                <JsonDiffViewer
                  leftTitle="Существующий form-data"
                  rightTitle="Импортируемый form-data"
                  leftValue={existingRequest.formDataJson}
                  rightValue={importedRequest.formDataJson}
                />
              ),
            },
          ]}
        />

        <DiffTable<BackendFieldOverride>
          title="Field overrides"
          existingRows={existingOverrides}
          importedRows={importedOverrides}
          columns={overrideColumns}
          getRowKey={(item) =>
            `${item.fieldPath}-${item.method}-${item.methodArg}`
          }
        />

        <DiffTable<BackendResponseExtractor>
          title="Response extractors"
          existingRows={existingExtractors}
          importedRows={importedExtractors}
          columns={extractorColumns}
          getRowKey={(item) =>
            `${item.fieldPath}-${item.variableName}`
          }
        />
      </Modal>
    </>
  );
}
