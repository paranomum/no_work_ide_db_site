import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import {
  Button,
  Card,
  Form,
  Input,
  Select,
  Space,
  Tabs,
  Typography,
} from 'antd';
import { useMemo } from 'react';

import type {
  BackendFieldOverride,
  BackendRequestDto,
  BackendResponseExtractor,
} from '../model/backendRequestMerge.types';

const { TextArea } = Input;

interface BackendRequestDtoEditorProps {
  value: BackendRequestDto;
  disabled?: boolean;
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

export function BackendRequestDtoEditor({
  value,
  disabled = false,
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
          items={[
            {
              key: 'body',
              label: 'Request body',
              children: (
                <TextArea
                  value={value.requestBody ?? ''}
                  disabled={disabled}
                  autoSize={{ minRows: 12, maxRows: 26 }}
                  style={{ fontFamily: 'monospace' }}
                  onChange={(event) =>
                    update({
                      requestBody: event.target.value,
                    })
                  }
                />
              ),
            },
            {
              key: 'headers',
              label: 'Headers',
              children: (
                <TextArea
                  value={value.requestHeadersJson}
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
            {
              key: 'response',
              label: 'Response body',
              children: (
                <TextArea
                  value={value.capturedResponseBody ?? ''}
                  disabled={disabled}
                  autoSize={{ minRows: 12, maxRows: 26 }}
                  style={{ fontFamily: 'monospace' }}
                  onChange={(event) =>
                    update({
                      capturedResponseBody: event.target.value,
                    })
                  }
                />
              ),
            },
            {
              key: 'form-data',
              label: 'Form-data JSON',
              children: (
                <TextArea
                  value={value.formDataJson}
                  disabled={disabled}
                  autoSize={{ minRows: 12, maxRows: 26 }}
                  style={{ fontFamily: 'monospace' }}
                  onChange={(event) =>
                    update({
                      formDataJson: event.target.value,
                    })
                  }
                />
              ),
            },
          ]}
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
              Field overrides
            </Typography.Title>

            <Button
              size="small"
              icon={<PlusOutlined />}
              disabled={disabled}
              onClick={addOverride}
            >
              Добавить
            </Button>
          </Space>

          <Space
            direction="vertical"
            size={8}
            style={{ width: '100%', marginTop: 12 }}
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
                  <Space style={{ width: '100%', display: 'flex' }}>
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
                        { value: 'string', label: 'string' },
                        { value: 'number', label: 'number' },
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

                  <Space style={{ width: '100%', display: 'flex' }}>
                    <Select
                      value={override.method}
                      disabled={disabled}
                      style={{ width: 190 }}
                      options={[
                        { value: 'value', label: 'value' },
                        {
                          value: 'use variable',
                          label: 'use variable',
                        },
                        { value: 'addUuid', label: 'addUuid' },
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
            style={{ width: '100%', marginTop: 12 }}
          >
            {responseExtractors.map((extractor, index) => (
              <Space
                key={`${extractor.fieldPath}-${index}`}
                style={{ width: '100%', display: 'flex' }}
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
      </Form>
    </Card>
  );
}
