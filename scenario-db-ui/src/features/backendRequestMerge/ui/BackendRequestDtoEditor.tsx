import {
  DeleteOutlined,
  PlusOutlined,
  ScanOutlined,
} from '@ant-design/icons';
import {
  Alert,
  Button,
  Card,
  Form,
  Input,
  message,
  Select,
  Space,
  Table,
  Tabs,
  Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useMemo } from 'react';

import {
  beautifyJson,
  extractJsonLeafPaths,
  parseFormDataJson,
  stringifyFormData,
} from '../model/backendRequestDiff';
import type {
  BackendFieldOverride,
  BackendFormDataItem,
  BackendRequestDto,
  BackendResponseExtractor,
} from '../model/backendRequestMerge.types';

const { TextArea } = Input;

export type BackendRequestEditorTab =
  | 'body'
  | 'response'
  | 'headers';

interface BackendRequestDtoEditorProps {
  value: BackendRequestDto;
  disabled?: boolean;
  activeTab?: BackendRequestEditorTab;
  lockTabSelection?: boolean;
  onActiveTabChange?: (
    activeTab: BackendRequestEditorTab,
  ) => void;
  onChange: (value: BackendRequestDto) => void;
}

function parseJsonArray<T>(value: string): T[] {
  try {
    const parsedValue: unknown = JSON.parse(value);

    return Array.isArray(parsedValue) ? (parsedValue as T[]) : [];
  } catch {
    return [];
  }
}

function stringifyJson(value: unknown): string {
  return JSON.stringify(value);
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

function buildFormUrlencodedBody(
  items: BackendFormDataItem[],
): string {
  return items
    .filter((item) => item.key.trim().length > 0)
    .map(
      (item) =>
        `${encodeURIComponent(item.key.trim())}=${encodeURIComponent(
          item.value,
        )}`,
    )
    .join('&');
}

export function BackendRequestDtoEditor({
  value,
  disabled = false,
  activeTab,
  lockTabSelection = false,
  onActiveTabChange,
  onChange,
}: BackendRequestDtoEditorProps) {
  const fieldOverrides = useMemo(
    () => parseJsonArray<BackendFieldOverride>(value.fieldOverridesJson),
    [value.fieldOverridesJson],
  );

  const responseExtractors = useMemo(
    () =>
      parseJsonArray<BackendResponseExtractor>(
        value.responseExtractorsJson,
      ),
    [value.responseExtractorsJson],
  );

  const formData = useMemo(
    () => parseFormDataJson(value.formDataJson),
    [value.formDataJson],
  );

  const isFormBody = isFormBodyType(value.bodyType);

  const update = (patch: Partial<BackendRequestDto>) => {
    onChange({
      ...value,
      ...patch,
    });
  };

  const updateOverride = (
    index: number,
    patch: Partial<BackendFieldOverride>,
  ) => {
    const updatedOverrides = fieldOverrides.map((override, itemIndex) =>
      itemIndex === index
        ? {
            ...override,
            ...patch,
          }
        : override,
    );

    update({
      fieldOverridesJson: stringifyJson(updatedOverrides),
    });
  };

  const addOverride = () => {
    update({
      fieldOverridesJson: stringifyJson([
        ...fieldOverrides,
        {
          fieldPath: '',
          method: 'value',
          methodArg: '',
          type: 'string',
        },
      ]),
    });
  };

  const removeOverride = (index: number) => {
    update({
      fieldOverridesJson: stringifyJson(
        fieldOverrides.filter((_, itemIndex) => itemIndex !== index),
      ),
    });
  };

    const parseJsonFieldsToOverrides = () => {
    if (value.bodyType !== 'JSON') {
      return;
    }

    const parsedPaths = extractJsonLeafPaths(value.requestBody);

    if (parsedPaths.length === 0) {
      message.warning(
        'Request body пустой или содержит некорректный JSON',
      );
      return;
    }

    const existingPaths = new Set(
      fieldOverrides
        .map((item) => item.fieldPath.trim())
        .filter(Boolean),
    );

    const newOverrides = parsedPaths
      .filter((fieldPath) => !existingPaths.has(fieldPath))
      .map<BackendFieldOverride>((fieldPath) => ({
        fieldPath,
        method: 'value',
        methodArg: '',
        type: 'string',
      }));

    if (newOverrides.length === 0) {
      message.info('Все поля JSON уже добавлены в Field overrides');
      return;
    }

    update({
      fieldOverridesJson: stringifyJson([
        ...fieldOverrides,
        ...newOverrides,
      ]),
    });

    message.success(
      `Добавлено полей JSON в Field overrides: ${newOverrides.length}`,
    );
  };

  const updateFormData = (
    nextFormData: BackendFormDataItem[],
  ) => {
    const patch: Partial<BackendRequestDto> = {
      formDataJson: stringifyFormData(nextFormData),
    };

    if (value.bodyType === 'FORM_URLENCODED') {
      patch.requestBody = buildFormUrlencodedBody(nextFormData);
    }

    update(patch);
  };

  const updateFormDataItem = (
    index: number,
    patch: Partial<BackendFormDataItem>,
  ) => {
    updateFormData(
      formData.map((item, itemIndex) =>
        itemIndex === index
          ? {
              ...item,
              ...patch,
            }
          : item,
      ),
    );
  };

  const addFormDataItem = () => {
    updateFormData([
      ...formData,
      {
        key: '',
        value: '',
      },
    ]);
  };

  const removeFormDataItem = (index: number) => {
    updateFormData(
      formData.filter((_, itemIndex) => itemIndex !== index),
    );
  };

  const updateExtractor = (
    index: number,
    patch: Partial<BackendResponseExtractor>,
  ) => {
    const updatedExtractors = responseExtractors.map(
      (extractor, itemIndex) =>
        itemIndex === index
          ? {
              ...extractor,
              ...patch,
            }
          : extractor,
    );

    update({
      responseExtractorsJson: stringifyJson(updatedExtractors),
    });
  };

  const addExtractor = () => {
    update({
      responseExtractorsJson: stringifyJson([
        ...responseExtractors,
        {
          fieldPath: '',
          variableName: '',
        },
      ]),
    });
  };

  const removeExtractor = (index: number) => {
    update({
      responseExtractorsJson: stringifyJson(
        responseExtractors.filter(
          (_, itemIndex) => itemIndex !== index,
        ),
      ),
    });
  };

  const formDataColumns: ColumnsType<BackendFormDataItem> = [
    {
      title: 'Поле',
      dataIndex: 'key',
      key: 'key',
      render: (_, item, index) => (
        <Input
          value={item.key}
          disabled={disabled}
          placeholder="Например username"
          onChange={(event) =>
            updateFormDataItem(index, {
              key: event.target.value,
            })
          }
        />
      ),
    },
    {
      title: 'Значение',
      dataIndex: 'value',
      key: 'value',
      render: (_, item, index) => (
        <Input
          value={item.value}
          disabled={disabled}
          placeholder="Значение или ${переменная}"
          onChange={(event) =>
            updateFormDataItem(index, {
              value: event.target.value,
            })
          }
        />
      ),
    },
    {
      title: '',
      key: 'actions',
      width: 54,
      render: (_, __, index) => (
        <Button
          type="text"
          danger
          icon={<DeleteOutlined />}
          aria-label="Удалить form-data поле"
          disabled={disabled}
          onClick={() => removeFormDataItem(index)}
        />
      ),
    },
  ];

  return (
  <Card size="small" title="Итоговый backend-метод">
    <Form layout="vertical" requiredMark={false}>
      <Form.Item label="Название">
        <Input
          value={value.name}
          disabled={disabled}
          onChange={(event) => update({ name: event.target.value })}
        />
      </Form.Item>

      <Space
        size={12}
        style={{ width: '100%', display: 'flex' }}
        align="start"
      >
        <Form.Item label="HTTP-метод" style={{ flex: 1 }}>
          <Select
            value={value.httpMethod}
            disabled={disabled}
            options={[
              'GET',
              'POST',
              'PUT',
              'PATCH',
              'DELETE',
              'HEAD',
              'OPTIONS',
            ].map((item) => ({
              value: item,
              label: item,
            }))}
            onChange={(httpMethod) => update({ httpMethod })}
          />
        </Form.Item>

        <Form.Item label="Тип body" style={{ flex: 1 }}>
          <Select
            value={value.bodyType}
            disabled={disabled}
            options={[
              'NONE',
              'JSON',
              'FORM_URLENCODED',
              'FORM_DATA',
              'RAW',
            ].map((item) => ({
              value: item,
              label: item,
            }))}
            onChange={(bodyType) => update({ bodyType })}
          />
        </Form.Item>
      </Space>

      <Form.Item label="URL">
        <Input
          value={value.url}
          disabled={disabled}
          onChange={(event) => update({ url: event.target.value })}
        />
      </Form.Item>

      <Form.Item label="Токен">
        <Input
          value={value.token}
          disabled={disabled}
          onChange={(event) => update({ token: event.target.value })}
        />
      </Form.Item>

      <Tabs
        {...(activeTab
          ? {
              activeKey: activeTab,
            }
          : {})}
        onChange={(nextTab) => {
          if (lockTabSelection) {
            return;
          }

          onActiveTabChange?.(
            nextTab as BackendRequestEditorTab,
          );
        }}
        items={[
          {
            key: 'body',
            label: 'Request body',
            children: (
              <>
                {isFormBody ? (
                  <div>
                    <Space
                      style={{
                        width: '100%',
                        display: 'flex',
                        justifyContent: 'space-between',
                        marginBottom: 12,
                      }}
                    >
                      <Typography.Text strong>
                        Form-data поля
                      </Typography.Text>

                      <Button
                        size="small"
                        icon={<PlusOutlined />}
                        disabled={disabled}
                        onClick={addFormDataItem}
                      >
                        Добавить поле
                      </Button>
                    </Space>

                    <Table<BackendFormDataItem>
                      size="small"
                      rowKey={(_, index) => String(index)}
                      columns={formDataColumns}
                      dataSource={formData}
                      pagination={false}
                      locale={{
                        emptyText: 'Form-data поля не добавлены',
                      }}
                    />

                    {value.bodyType === 'FORM_URLENCODED' && (
                      <Alert
                        type="info"
                        showIcon
                        style={{ marginTop: 12 }}
                        message="URL-encoded body"
                        description="При редактировании таблицы автоматически обновляется requestBody в формате application/x-www-form-urlencoded."
                      />
                    )}
                  </div>
                ) : (
                  <TextArea
                    value={beautifyJson(value.requestBody)}
                    disabled={disabled}
                    autoSize={{ minRows: 12, maxRows: 26 }}
                    style={{ fontFamily: 'monospace' }}
                    onChange={(event) =>
                      update({
                        requestBody: event.target.value,
                      })
                    }
                  />
                )}

                <div style={{ marginTop: 20 }}>
                  <Space
                    style={{
                      width: '100%',
                      display: 'flex',
                      justifyContent: 'space-between',
                    }}
                  >
                    <Typography.Title level={5} style={{ margin: 0 }}>
                      Field overrides
                    </Typography.Title>

                    <Space>
                      {!disabled && value.bodyType === 'JSON' && (
                        <Button
                          size="small"
                          icon={<ScanOutlined />}
                          onClick={parseJsonFieldsToOverrides}
                        >
                          Разобрать поля JSON
                        </Button>
                      )}

                      <Button
                        size="small"
                        icon={<PlusOutlined />}
                        disabled={disabled}
                        onClick={addOverride}
                      >
                        Добавить
                      </Button>
                    </Space>
                  </Space>

                  {value.bodyType === 'JSON' && (
                    <Typography.Paragraph
                      type="secondary"
                      style={{
                        marginTop: 8,
                        marginBottom: 12,
                      }}
                    >
                      Кнопка «Разобрать поля JSON» добавляет конечные
                      пути из request body и не дублирует существующие
                      overrides.
                    </Typography.Paragraph>
                  )}

                  <Space
                    direction="vertical"
                    size={8}
                    style={{ width: '100%' }}
                  >
                    {fieldOverrides.map((override, index) => (
                      <Card
                        key={`${override.fieldPath}-${index}`}
                        size="small"
                        styles={{ body: { padding: 10 } }}
                      >
                        <Space
                          direction="vertical"
                          size={8}
                          style={{ width: '100%' }}
                        >
                          <Space
                            style={{
                              width: '100%',
                              display: 'flex',
                            }}
                          >
                            <Input
                              placeholder="Field path"
                              value={override.fieldPath}
                              disabled={disabled}
                              style={{ flex: 1 }}
                              onChange={(event) =>
                                updateOverride(index, {
                                  fieldPath: event.target.value,
                                })
                              }
                            />

                            <Select
                              value={override.type}
                              disabled={disabled}
                              style={{ width: 110 }}
                              options={[
                                {
                                  value: 'string',
                                  label: 'string',
                                },
                                {
                                  value: 'number',
                                  label: 'number',
                                },
                              ]}
                              onChange={(type) =>
                                updateOverride(index, { type })
                              }
                            />

                            <Button
                              type="text"
                              danger
                              icon={<DeleteOutlined />}
                              aria-label="Удалить override"
                              disabled={disabled}
                              onClick={() => removeOverride(index)}
                            />
                          </Space>

                          <Space
                            style={{
                              width: '100%',
                              display: 'flex',
                            }}
                          >
                            <Select
                              value={override.method}
                              disabled={disabled}
                              style={{ width: 190 }}
                              options={[
                                {
                                  value: 'value',
                                  label: 'value',
                                },
                                {
                                  value: 'use variable',
                                  label: 'use variable',
                                },
                                {
                                  value: 'addUuid',
                                  label: 'addUuid',
                                },
                              ]}
                              onChange={(method) =>
                                updateOverride(index, { method })
                              }
                            />

                            <Input
                              placeholder="Аргумент или ${переменная}"
                              value={override.methodArg}
                              disabled={disabled}
                              style={{ flex: 1 }}
                              onChange={(event) =>
                                updateOverride(index, {
                                  methodArg: event.target.value,
                                })
                              }
                            />
                          </Space>
                        </Space>
                      </Card>
                    ))}

                    {fieldOverrides.length === 0 && (
                      <Typography.Text type="secondary">
                        Overrides не добавлены
                      </Typography.Text>
                    )}
                  </Space>
                </div>
              </>
            ),
          },
          {
            key: 'response',
            label: 'Response body',
            children: (
              <>
                <TextArea
                  value={beautifyJson(value.capturedResponseBody)}
                  disabled={disabled}
                  autoSize={{ minRows: 12, maxRows: 26 }}
                  style={{ fontFamily: 'monospace' }}
                  onChange={(event) =>
                    update({
                      capturedResponseBody: event.target.value,
                    })
                  }
                />

                <div style={{ marginTop: 20 }}>
                  <Space
                    style={{
                      width: '100%',
                      display: 'flex',
                      justifyContent: 'space-between',
                    }}
                  >
                    <Typography.Title level={5} style={{ margin: 0 }}>
                      Response extractors
                    </Typography.Title>

                    <Button
                      size="small"
                      icon={<PlusOutlined />}
                      disabled={disabled}
                      onClick={addExtractor}
                    >
                      Добавить
                    </Button>
                  </Space>

                  <Space
                    direction="vertical"
                    size={8}
                    style={{
                      width: '100%',
                      marginTop: 12,
                    }}
                  >
                    {responseExtractors.map((extractor, index) => (
                      <Space
                        key={`${extractor.fieldPath}-${index}`}
                        style={{
                          width: '100%',
                          display: 'flex',
                        }}
                      >
                        <Input
                          placeholder="Поле ответа"
                          value={extractor.fieldPath}
                          disabled={disabled}
                          style={{ flex: 1 }}
                          onChange={(event) =>
                            updateExtractor(index, {
                              fieldPath: event.target.value,
                            })
                          }
                        />

                        <Input
                          placeholder="Имя переменной"
                          value={extractor.variableName}
                          disabled={disabled}
                          style={{ flex: 1 }}
                          onChange={(event) =>
                            updateExtractor(index, {
                              variableName: event.target.value,
                            })
                          }
                        />

                        <Button
                          type="text"
                          danger
                          icon={<DeleteOutlined />}
                          aria-label="Удалить extractor"
                          disabled={disabled}
                          onClick={() => removeExtractor(index)}
                        />
                      </Space>
                    ))}

                    {responseExtractors.length === 0 && (
                      <Typography.Text type="secondary">
                        Extractors не добавлены
                      </Typography.Text>
                    )}
                  </Space>
                </div>
              </>
            ),
          },
          {
            key: 'headers',
            label: 'Headers',
            children: (
              <TextArea
                value={beautifyJson(value.requestHeadersJson)}
                disabled={disabled}
                autoSize={{ minRows: 12, maxRows: 26 }}
                style={{ fontFamily: 'monospace' }}
                onChange={(event) =>
                  update({
                    requestHeadersJson: event.target.value,
                  })
                }
              />
            ),
          },
        ]}
      />
    </Form>
  </Card>
);
}
