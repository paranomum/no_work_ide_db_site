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
} from 'antd';
import { useEffect, useState } from 'react';

import { AppTextArea } from '../../../shared/ui/AppInput/AppTextArea';

interface ScenarioJsonEditorProps {
  payload: Record<string, unknown> | null;
  disabled: boolean;
  onApply: (payload: Record<string, unknown>) => void;
}

function formatPayload(payload: Record<string, unknown>): string {
  return JSON.stringify(payload, null, 2);
}

function isJsonObject(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value)
  );
}

export function ScenarioJsonEditor({
  payload,
  disabled,
  onApply,
}: ScenarioJsonEditorProps) {
  const [draft, setDraft] = useState('');
  const [lastAppliedDraft, setLastAppliedDraft] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!payload) {
      setDraft('');
      setLastAppliedDraft('');
      setError(null);
      return;
    }

    const formattedPayload = formatPayload(payload);

    setDraft(formattedPayload);
    setLastAppliedDraft(formattedPayload);
    setError(null);
  }, [payload]);

  const formatJson = () => {
    try {
      const parsed: unknown = JSON.parse(draft);

      if (!isJsonObject(parsed)) {
        setError(
          'Корневой элемент JSON сценария должен быть объектом',
        );
        return;
      }

      const formattedPayload = formatPayload(parsed);

      setDraft(formattedPayload);
      setError(null);
    } catch {
      setError('JSON содержит синтаксическую ошибку');
    }
  };

  const applyChanges = () => {
    try {
      const parsed: unknown = JSON.parse(draft);

      if (!isJsonObject(parsed)) {
        setError(
          'Корневой элемент JSON сценария должен быть объектом',
        );
        return;
      }

      const formattedPayload = formatPayload(parsed);

      setDraft(formattedPayload);
      setLastAppliedDraft(formattedPayload);
      setError(null);
      onApply(parsed);
    } catch {
      setError(
        'Не удалось применить изменения: JSON содержит синтаксическую ошибку',
      );
    }
  };

  const resetChanges = () => {
    setDraft(lastAppliedDraft);
    setError(null);
  };

  return (
    <Card
      title="JSON сценария"
      extra={
        <Space>
          <Button
            icon={<ReloadOutlined />}
            disabled={disabled || !draft}
            onClick={formatJson}
          >
            Форматировать JSON
          </Button>

          <Button
            icon={<RollbackOutlined />}
            disabled={
              disabled ||
              !draft ||
              draft === lastAppliedDraft
            }
            onClick={resetChanges}
          >
            Сбросить изменения
          </Button>

          <Button
            type="primary"
            icon={<CheckOutlined />}
            disabled={disabled || !draft}
            onClick={applyChanges}
          >
            Применить изменения
          </Button>
        </Space>
      }
    >
      <Typography.Paragraph type="secondary">
        Этот режим предназначен для ручного редактирования структуры
        сценария. После применения JSON будет повторно проверен:
        backend-методы, переменные и переиспользуемые сценарии будут
        пересчитаны.
      </Typography.Paragraph>

      {error && (
        <Alert
          type="error"
          showIcon
          message={error}
          style={{ marginBottom: 16 }}
        />
      )}

      <AppTextArea
        value={draft}
        disabled={disabled || !payload}
        autoSize={{ minRows: 24, maxRows: 40 }}
        spellCheck={false}
        placeholder="Сначала выберите JSON-файл сценария"
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
    </Card>
  );
}
