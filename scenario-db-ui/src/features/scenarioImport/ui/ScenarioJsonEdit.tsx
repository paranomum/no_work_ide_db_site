import {
  CheckOutlined,
  ReloadOutlined,
  RollbackOutlined,
} from '@ant-design/icons';
import {
  Alert,
  Button,
  Card,
  Space,
  Typography,
  message,
} from 'antd';
import { useEffect, useState } from 'react';

import { http } from '../../../shared/api/http';
import { AppTextArea } from '../../../shared/ui/AppInput/AppTextArea';

interface ScenarioJsonEditorProps {
  scenarioId: number;
  initialPayloadJson: string;
  disabled: boolean;
  onSaved: (scenarioPayloadJson: string) => void;
}

function formatJson(payloadJson: string): string {
  return JSON.stringify(JSON.parse(payloadJson), null, 2);
}

function isJsonObject(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value)
  );
}

function getApiErrorMessage(
  error: unknown,
  defaultMessage: string,
): string {
  if (
    typeof error === 'object' &&
    error !== null &&
    'response' in error
  ) {
    const response = error.response;

    if (
      typeof response === 'object' &&
      response !== null &&
      'data' in response
    ) {
      const data = response.data;

      if (
        typeof data === 'object' &&
        data !== null &&
        'message' in data &&
        typeof data.message === 'string'
      ) {
        return data.message;
      }
    }
  }

  return defaultMessage;
}

export function ScenarioJsonEditor({
  scenarioId,
  initialPayloadJson,
  disabled,
  onSaved,
}: ScenarioJsonEditorProps) {
  const [draft, setDraft] = useState('');
  const [lastSavedDraft, setLastSavedDraft] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    try {
      const formattedJson = formatJson(initialPayloadJson);

      setDraft(formattedJson);
      setLastSavedDraft(formattedJson);
      setError(null);
    } catch {
      setDraft(initialPayloadJson);
      setLastSavedDraft(initialPayloadJson);
      setError(
        'Сохранённый JSON сценария имеет некорректную структуру',
      );
    }
  }, [initialPayloadJson]);

  const formatDraft = () => {
    try {
      const parsed: unknown = JSON.parse(draft);

      if (!isJsonObject(parsed)) {
        setError(
          'Корневой элемент JSON сценария должен быть объектом',
        );
        return;
      }

      setDraft(JSON.stringify(parsed, null, 2));
      setError(null);
    } catch {
      setError('JSON содержит синтаксическую ошибку');
    }
  };

  const resetDraft = () => {
    setDraft(lastSavedDraft);
    setError(null);
  };

  const saveJson = async () => {
    try {
      const parsed: unknown = JSON.parse(draft);

      if (!isJsonObject(parsed)) {
        setError(
          'Корневой элемент JSON сценария должен быть объектом',
        );
        return;
      }

      const scenarioPayloadJson = JSON.stringify(parsed);

      setIsSaving(true);
      setError(null);

      await http.put(`/scenarios/${scenarioId}/import`, {
        scenarioPayloadJson,
      });

      const formattedJson = JSON.stringify(parsed, null, 2);

      setDraft(formattedJson);
      setLastSavedDraft(formattedJson);
      onSaved(scenarioPayloadJson);

      message.success('JSON сценария сохранён');
    } catch (error) {
      setError(
        getApiErrorMessage(
          error,
          'Не удалось сохранить JSON сценария',
        ),
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card
      title="JSON сценария"
      extra={
        <Space wrap>
          <Button
            icon={<ReloadOutlined />}
            disabled={disabled || isSaving || !draft}
            onClick={formatDraft}
          >
            Форматировать
          </Button>

          <Button
            icon={<RollbackOutlined />}
            disabled={
              disabled ||
              isSaving ||
              draft === lastSavedDraft
            }
            onClick={resetDraft}
          >
            Сбросить
          </Button>

          <Button
            type="primary"
            icon={<CheckOutlined />}
            loading={isSaving}
            disabled={disabled || isSaving || !draft}
            onClick={() => void saveJson()}
          >
            Сохранить JSON
          </Button>
        </Space>
      }
    >
      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        <Alert
          type="warning"
          showIcon
          message="Расширенное редактирование JSON"
          description="Изменения сохраняются через единый endpoint импорта. До его реализации на backend кнопка сохранения будет получать ответ 404."
        />

        {error && (
          <Alert
            type="error"
            showIcon
            message={error}
          />
        )}

        <Typography.Paragraph type="secondary">
          После реализации endpoint сервер должен атомарно проверить
          backend methods, variables и custom methods, затем обновить
          payload и все связи сценария.
        </Typography.Paragraph>

        <AppTextArea
          value={draft}
          disabled={disabled || isSaving}
          autoSize={{ minRows: 26, maxRows: 44 }}
          spellCheck={false}
          style={{
            fontFamily:
              'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
            fontSize: 13,
            lineHeight: 1.55,
          }}
          onChange={(event) => {
            setDraft(event.target.value);
            setError(null);
          }}
        />
      </Space>
    </Card>
  );
}
