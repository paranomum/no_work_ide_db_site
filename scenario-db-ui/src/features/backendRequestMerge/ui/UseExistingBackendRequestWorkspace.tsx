import {
  ArrowLeftOutlined,
  CheckOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';
import {
  Alert,
  Button,
  Card,
  Divider,
  Input,
  Modal,
  Radio,
  Space,
  Tag,
  Typography,
} from 'antd';
import {
  useEffect,
  useMemo,
  useState,
} from 'react';


import type {
  BackendRequestDto,
  BackendRequestVariableUsageLocation,
  UseExistingBackendRequestDraft,
  UseExistingVariableDecision,
  UseExistingVariableIssue,
} from '../model/backendRequestMerge.types';
import {
  createUseExistingVariableIssues,
} from '../model/useExistingBackendRequestPlan';
import {
  BackendRequestDtoEditor,
  type BackendRequestEditorTab,
} from './BackendRequestDtoEditor';


type JsonRecord = Record<string, unknown>;


interface UseExistingBackendRequestWorkspaceProps {
  open: boolean;
  existingRequest: BackendRequestDto;
  importedRequest: BackendRequestDto;
  payload: JsonRecord;
  disabled?: boolean;
  onCancel: () => void;
  onSaved: (draft: UseExistingBackendRequestDraft) => void;
}


interface DecisionValidationResult {
  isValid: boolean;
  message: string | null;
}


function normalizeVariableName(value: string): string {
  return value.trim().toLocaleLowerCase('ru-RU');
}


function getDefaultRenamedVariableName(
  variableName: string,
): string {
  const normalizedName = variableName.trim();

  if (!normalizedName) {
    return 'legacyVariable';
  }

  const parts = normalizedName.split('.');
  const lastPart = parts.pop() ?? normalizedName;

  const renamedLastPart =
    lastPart.length === 1
      ? `${lastPart}Old`
      : `${lastPart}Legacy`;

  return [...parts, renamedLastPart].join('.');
}


function getUsageKindLabel(
  kind: BackendRequestVariableUsageLocation['kind'],
): string {
  switch (kind) {
    case 'url':
      return 'URL';

    case 'request-body':
      return 'Request body';

    case 'request-header':
      return 'Header';

    case 'token':
      return 'Token';

    case 'form-data':
      return 'Form-data';

    case 'field-override':
      return 'Field override';

    case 'response-extractor':
      return 'Response extractor';

    default:
      return kind;
  }
}


function getSourceLabel(
  source:
    | 'variables'
    | 'backendRequest'
    | 'fieldOverride'
    | 'responseExtractor',
): string {
  switch (source) {
    case 'variables':
      return 'Объявлена в variables';

    case 'backendRequest':
      return 'Используется backend-методом';

    case 'fieldOverride':
      return 'Используется field override';

    case 'responseExtractor':
      return 'Заполняется response extractor';

    default:
      return source;
  }
}


function getPayloadVariableNames(
  payload: JsonRecord,
): string[] {
  const rawVariables = Array.isArray(payload.variables)
    ? payload.variables
    : [];

  return rawVariables
    .filter(
      (item): item is JsonRecord =>
        typeof item === 'object' &&
        item !== null &&
        !Array.isArray(item),
    )
    .map((item) =>
      typeof item.name === 'string'
        ? item.name.trim()
        : '',
    )
    .filter(Boolean);
}


function getInitialDecisions(
  issues: UseExistingVariableIssue[],
): UseExistingVariableDecision[] {
  const decisions: UseExistingVariableDecision[] = [];

  issues.forEach((issue) => {
    if (issue.variableKind === 'response-extractor') {
      decisions.push({
        issueId: issue.id,
        kind: 'auto-create-extractor',
      });

      return;
    }

    if (issue.existingScenarioVariable) {
      decisions.push({
        issueId: issue.id,
        kind: 'keep-existing',
      });

      return;
    }

    decisions.push({
      issueId: issue.id,
      kind: 'create-new',
      newVariableDefaultValue:
        issue.suggestedDefaultValue,
    });
  });

  return decisions;
}


function getDecision(
  decisions: UseExistingVariableDecision[],
  issueId: string,
): UseExistingVariableDecision | null {
  return (
    decisions.find((decision) => decision.issueId === issueId) ??
    null
  );
}


function replaceDecision(
  decisions: UseExistingVariableDecision[],
  nextDecision: UseExistingVariableDecision,
): UseExistingVariableDecision[] {
  const exists = decisions.some(
    (decision) => decision.issueId === nextDecision.issueId,
  );

  if (!exists) {
    return [...decisions, nextDecision];
  }

  return decisions.map((decision) =>
    decision.issueId === nextDecision.issueId
      ? nextDecision
      : decision,
  );
}


function isManualMissingVariable(
  issue: UseExistingVariableIssue,
): boolean {
  return (
    issue.variableKind === 'manual' &&
    issue.existingScenarioVariable === null
  );
}


function isManualExistingVariable(
  issue: UseExistingVariableIssue,
): boolean {
  return (
    issue.variableKind === 'manual' &&
    issue.existingScenarioVariable !== null
  );
}


function isExtractorVariable(
  issue: UseExistingVariableIssue,
): boolean {
  return issue.variableKind === 'response-extractor';
}


function getDecisionValidation(
  issue: UseExistingVariableIssue,
  decision: UseExistingVariableDecision | null,
  payloadVariableNames: string[],
): DecisionValidationResult {
  if (isExtractorVariable(issue)) {
    return {
      isValid: decision?.kind === 'auto-create-extractor',
      message: null,
    };
  }

  if (isManualMissingVariable(issue)) {
    if (decision?.kind !== 'create-new') {
      return {
        isValid: false,
        message: 'Укажите значение новой переменной.',
      };
    }

    if (!decision.newVariableDefaultValue.trim()) {
      return {
        isValid: false,
        message: 'Значение новой переменной обязательно.',
      };
    }

    return {
      isValid: true,
      message: null,
    };
  }

  if (!isManualExistingVariable(issue)) {
    return {
      isValid: false,
      message: 'Не удалось определить тип переменной.',
    };
  }

  if (decision?.kind === 'keep-existing') {
    return {
      isValid: true,
      message: null,
    };
  }

  if (
    decision?.kind !==
    'rename-existing-and-create-new'
  ) {
    return {
      isValid: false,
      message: 'Выберите способ разрешения.',
    };
  }

  const existingVariableName =
    issue.existingScenarioVariable?.name ?? '';

  const renamedVariableName =
    decision.renamedExistingVariableName.trim();

  if (!renamedVariableName) {
    return {
      isValid: false,
      message: 'Введите новое имя текущей переменной.',
    };
  }

  if (
    normalizeVariableName(renamedVariableName) ===
    normalizeVariableName(existingVariableName)
  ) {
    return {
      isValid: false,
      message:
        'Новое имя должно отличаться от текущего имени переменной.',
    };
  }

  const normalizedRenamedVariableName =
    normalizeVariableName(renamedVariableName);

  const normalizedExistingVariableName =
    normalizeVariableName(existingVariableName);

  const hasNameConflict = payloadVariableNames.some(
    (variableName) =>
      normalizeVariableName(variableName) ===
        normalizedRenamedVariableName &&
      normalizeVariableName(variableName) !==
        normalizedExistingVariableName,
  );

  if (hasNameConflict) {
    return {
      isValid: false,
      message:
        'Переменная с таким именем уже существует в сценарии.',
    };
  }

  if (!decision.newVariableDefaultValue.trim()) {
    return {
      isValid: false,
      message:
        'Введите значение новой переменной для существующего метода.',
    };
  }

  return {
    isValid: true,
    message: null,
  };
}


function getCardTag(
  issue: UseExistingVariableIssue,
): {
  color: string;
  text: string;
} {
  if (isExtractorVariable(issue)) {
    return issue.existingScenarioVariable
      ? {
          color: 'success',
          text: 'Извлекается из response',
        }
      : {
          color: 'processing',
          text: 'Будет добавлена из response',
        };
  }

  return issue.existingScenarioVariable
    ? {
        color: 'success',
        text: 'Уже есть в сценарии',
      }
    : {
        color: 'warning',
        text: 'Нужно создать',
      };
}


function getCardAlert(
  issue: UseExistingVariableIssue,
): {
  type: 'info' | 'warning' | 'success';
  message: string;
  description: string;
} {
  if (isExtractorVariable(issue)) {
    const extractorValue =
      issue.suggestedDefaultValue || 'json(...)';

    return issue.existingScenarioVariable
      ? {
          type: 'success',
          message: 'Переменная уже извлекается из response',
          description: `Существующий backend-метод записывает значение «${issue.requiredVariableName}» из response. Ожидаемое значение: ${extractorValue}.`,
        }
      : {
          type: 'info',
          message: 'Переменная будет добавлена из response',
          description: `Будет создана переменная «${issue.requiredVariableName}» со значением ${extractorValue}.`,
        };
  }

  return issue.existingScenarioVariable
    ? {
        type: 'success',
        message: 'Переменная уже есть в импортируемом сценарии',
        description: `Существующий backend-метод будет использовать текущее значение «${issue.existingScenarioVariable.defaultValue || 'пусто'}». При необходимости можно сохранить старую переменную под новым именем и создать новую.`,
      }
    : {
        type: 'warning',
        message: 'Переменной нет в импортируемом сценарии',
        description: `Создайте «${issue.requiredVariableName}» и укажите значение для существующего backend-метода.`,
      };
}


function ExistingMethodUsageBlock({
  issue,
}: {
  issue: UseExistingVariableIssue;
}) {
  return (
    <div>
      <Typography.Text type="secondary">
        Использование в существующем методе
      </Typography.Text>

      <Space
        direction="vertical"
        size={4}
        style={{ width: '100%', marginTop: 6 }}
      >
        <Typography.Text code>
          {issue.requiredVariableName}
        </Typography.Text>

        {issue.existingMethodUsages.map((usage, index) => (
          <Typography.Text
            key={`${usage.kind}-${usage.label}-${index}`}
            type="secondary"
          >
            {getUsageKindLabel(usage.kind)}: {usage.value}
          </Typography.Text>
        ))}
      </Space>
    </div>
  );
}


function CurrentScenarioVariableBlock({
  issue,
}: {
  issue: UseExistingVariableIssue;
}) {
  const variable = issue.existingScenarioVariable;

  return (
    <div>
      <Typography.Text type="secondary">
        Сейчас в импортируемом сценарии
      </Typography.Text>

      {!variable ? (
        <Typography.Paragraph
          type="secondary"
          style={{ marginTop: 6, marginBottom: 0 }}
        >
          Переменная отсутствует.
        </Typography.Paragraph>
      ) : (
        <Space
          direction="vertical"
          size={4}
          style={{ width: '100%', marginTop: 6 }}
        >
          <Typography.Text>
            Имя:{' '}
            <Typography.Text code>
              {variable.name}
            </Typography.Text>
          </Typography.Text>

          <Typography.Text>
            Значение:{' '}
            <Typography.Text code>
              {variable.defaultValue || 'пусто'}
            </Typography.Text>
          </Typography.Text>

          <Space size={[4, 4]} wrap>
            {variable.sources.map((source) => (
              <Tag key={source} style={{ marginInlineEnd: 0 }}>
                {getSourceLabel(source)}
              </Tag>
            ))}
          </Space>

          {issue.importedMethodUsages.length > 0 ? (
            <Typography.Text type="secondary">
              Импортируемый метод уже использует эту переменную.
            </Typography.Text>
          ) : (
            <Typography.Text type="secondary">
              Импортируемый метод не использовал эту переменную.
            </Typography.Text>
          )}
        </Space>
      )}
    </div>
  );
}


function ExtractorDetails({
  issue,
}: {
  issue: UseExistingVariableIssue;
}) {
  if (!isExtractorVariable(issue)) {
    return null;
  }

  return (
    <Alert
      type="info"
      showIcon
      message="Значение извлекается из response"
      description={
        <Space direction="vertical" size={4}>
          <Typography.Text>
            Пути response:{' '}
            {issue.extractorFieldPaths.join(', ') || 'не указаны'}
          </Typography.Text>

          <Typography.Text>
            Значение переменной:{' '}
            <Typography.Text code>
              {issue.suggestedDefaultValue || 'json(...)'}
            </Typography.Text>
          </Typography.Text>
        </Space>
      }
    />
  );
}


function ManualMissingVariableFields({
  issue,
  decision,
  disabled,
  validation,
  onChange,
}: {
  issue: UseExistingVariableIssue;
  decision: UseExistingVariableDecision | null;
  disabled: boolean;
  validation: DecisionValidationResult;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <Typography.Text strong>
        Значение новой переменной
      </Typography.Text>

      <Input
        value={
          decision?.kind === 'create-new'
            ? decision.newVariableDefaultValue
            : ''
        }
        disabled={disabled}
        placeholder={`Введите значение ${issue.requiredVariableName}`}
        status={
          decision?.kind === 'create-new' &&
          !decision.newVariableDefaultValue.trim()
            ? 'error'
            : undefined
        }
        style={{ marginTop: 6 }}
        onChange={(event) => onChange(event.target.value)}
      />

      {!validation.isValid && validation.message && (
        <Typography.Text
          type="danger"
          style={{ display: 'block', marginTop: 6 }}
        >
          {validation.message}
        </Typography.Text>
      )}
    </div>
  );
}


function ExistingManualVariableActions({
  issue,
  decision,
  disabled,
  validation,
  onDecisionChange,
}: {
  issue: UseExistingVariableIssue;
  decision: UseExistingVariableDecision | null;
  disabled: boolean;
  validation: DecisionValidationResult;
  onDecisionChange: (
    decision: UseExistingVariableDecision,
  ) => void;
}) {
  const existingVariableName =
    issue.existingScenarioVariable?.name ??
    issue.requiredVariableName;

  const existingVariableValue =
    issue.existingScenarioVariable?.defaultValue ?? '';

  const changeAction = (
    action:
      | 'keep-existing'
      | 'rename-existing-and-create-new',
  ) => {
    if (action === 'keep-existing') {
      onDecisionChange({
        issueId: issue.id,
        kind: 'keep-existing',
      });

      return;
    }

    onDecisionChange({
      issueId: issue.id,
      kind: 'rename-existing-and-create-new',
      renamedExistingVariableName:
        getDefaultRenamedVariableName(existingVariableName),
      newVariableDefaultValue: '',
    });
  };

  const updateRenameDecision = (
    field:
      | 'renamedExistingVariableName'
      | 'newVariableDefaultValue',
    value: string,
  ) => {
    if (
      decision?.kind !==
      'rename-existing-and-create-new'
    ) {
      return;
    }

    onDecisionChange({
      ...decision,
      [field]: value,
    });
  };

  return (
    <>
      <Divider style={{ margin: 0 }} />

      <div>
        <Typography.Text strong>
          Как поступить?
        </Typography.Text>

        <Radio.Group
          value={decision?.kind}
          disabled={disabled}
          style={{ display: 'block', marginTop: 8 }}
          onChange={(event) => changeAction(event.target.value)}
        >
          <Space direction="vertical" size={10}>
            <Radio value="keep-existing">
              Использовать существующую переменную
            </Radio>

            <Radio value="rename-existing-and-create-new">
              Переименовать существующую и создать новую
            </Radio>
          </Space>
        </Radio.Group>
      </div>

      {decision?.kind === 'keep-existing' && (
        <Alert
          type="success"
          showIcon
          message="Будет использовано текущее значение"
          description={
            <Typography.Text code>
              {existingVariableValue || 'пусто'}
            </Typography.Text>
          }
        />
      )}

      {decision?.kind ===
        'rename-existing-and-create-new' && (
        <Space
          direction="vertical"
          size={12}
          style={{ width: '100%' }}
        >
          <Card
            size="small"
            title="Сохранить текущую переменную"
            style={{ background: '#fafafa' }}
          >
            <Space
              direction="vertical"
              size={12}
              style={{ width: '100%' }}
            >
              <div>
                <Typography.Text type="secondary">
                  Текущее имя
                </Typography.Text>

                <Input
                  readOnly
                  value={existingVariableName}
                  style={{ marginTop: 6 }}
                />
              </div>

              <div>
                <Typography.Text type="secondary">
                  Текущее значение
                </Typography.Text>

                <Input
                  readOnly
                  value={existingVariableValue}
                  style={{ marginTop: 6 }}
                />
              </div>

              <div>
                <Typography.Text type="secondary">
                  Новое имя текущей переменной
                </Typography.Text>

                <Input
                  value={decision.renamedExistingVariableName}
                  disabled={disabled}
                  placeholder="Например legacyVariable"
                  status={
                    validation.isValid ? undefined : 'error'
                  }
                  style={{ marginTop: 6 }}
                  onChange={(event) =>
                    updateRenameDecision(
                      'renamedExistingVariableName',
                      event.target.value,
                    )
                  }
                />

                <Typography.Text
                  type="secondary"
                  style={{
                    display: 'block',
                    marginTop: 6,
                  }}
                >
                  Все прежние ссылки на{' '}
                  <Typography.Text code>
                    {existingVariableName}
                  </Typography.Text>{' '}
                  будут заменены на{' '}
                  <Typography.Text code>
                    {decision.renamedExistingVariableName ||
                      'новое имя'}
                  </Typography.Text>
                  .
                </Typography.Text>
              </div>
            </Space>
          </Card>

          <Card
            size="small"
            title="Создать переменную для существующего метода"
            style={{ background: '#fafafa' }}
          >
            <Space
              direction="vertical"
              size={12}
              style={{ width: '100%' }}
            >
              <div>
                <Typography.Text type="secondary">
                  Имя новой переменной
                </Typography.Text>

                <Input
                  readOnly
                  value={issue.requiredVariableName}
                  style={{ marginTop: 6 }}
                />
              </div>

              <div>
                <Typography.Text type="secondary">
                  Значение новой переменной
                </Typography.Text>

                <Input
                  value={decision.newVariableDefaultValue}
                  disabled={disabled}
                  placeholder="Введите значение"
                  status={
                    decision.newVariableDefaultValue.trim()
                      ? undefined
                      : 'error'
                  }
                  style={{ marginTop: 6 }}
                  onChange={(event) =>
                    updateRenameDecision(
                      'newVariableDefaultValue',
                      event.target.value,
                    )
                  }
                />
              </div>
            </Space>
          </Card>

          {!validation.isValid && validation.message && (
            <Typography.Text type="danger">
              {validation.message}
            </Typography.Text>
          )}
        </Space>
      )}
    </>
  );
}


function VariableIssueCard({
  issue,
  decision,
  payloadVariableNames,
  disabled,
  onDecisionChange,
}: {
  issue: UseExistingVariableIssue;
  decision: UseExistingVariableDecision | null;
  payloadVariableNames: string[];
  disabled: boolean;
  onDecisionChange: (
    decision: UseExistingVariableDecision,
  ) => void;
}) {
  const validation = getDecisionValidation(
    issue,
    decision,
    payloadVariableNames,
  );

  const cardTag = getCardTag(issue);
  const cardAlert = getCardAlert(issue);

  const createMissingVariable = (
    newVariableDefaultValue: string,
  ) => {
    onDecisionChange({
      issueId: issue.id,
      kind: 'create-new',
      newVariableDefaultValue,
    });
  };

  return (
    <Card
      size="small"
      title={
        <Space size={8}>
          <Tag
            color={cardTag.color}
            style={{ marginInlineEnd: 0 }}
          >
            {cardTag.text}
          </Tag>

          <Typography.Text strong>
            {issue.requiredVariableName}
          </Typography.Text>
        </Space>
      }
    >
      <Space
        direction="vertical"
        size={16}
        style={{ width: '100%' }}
      >
        <Alert
          type={cardAlert.type}
          showIcon
          message={cardAlert.message}
          description={cardAlert.description}
        />

        <ExistingMethodUsageBlock issue={issue} />

        <Divider style={{ margin: 0 }} />

        <CurrentScenarioVariableBlock issue={issue} />

        {isExtractorVariable(issue) && (
          <>
            <Divider style={{ margin: 0 }} />

            <ExtractorDetails issue={issue} />
          </>
        )}

        {isManualMissingVariable(issue) && (
          <>
            <Divider style={{ margin: 0 }} />

            <ManualMissingVariableFields
              issue={issue}
              decision={decision}
              disabled={disabled}
              validation={validation}
              onChange={createMissingVariable}
            />
          </>
        )}

        {isManualExistingVariable(issue) && (
          <ExistingManualVariableActions
            issue={issue}
            decision={decision}
            disabled={disabled}
            validation={validation}
            onDecisionChange={onDecisionChange}
          />
        )}
      </Space>
    </Card>
  );
}


export function UseExistingBackendRequestWorkspace({
  open,
  existingRequest,
  importedRequest,
  payload,
  disabled = false,
  onCancel,
  onSaved,
}: UseExistingBackendRequestWorkspaceProps) {
  const [activeEditorTab, setActiveEditorTab] =
    useState<BackendRequestEditorTab>('body');

  const issues = useMemo(
    () =>
      createUseExistingVariableIssues(
        existingRequest,
        importedRequest,
        payload,
      ),
    [existingRequest, importedRequest, payload],
  );

  const [decisions, setDecisions] = useState<
    UseExistingVariableDecision[]
  >(() => getInitialDecisions(issues));

  const payloadVariableNames = useMemo(
    () => getPayloadVariableNames(payload),
    [payload],
  );

  useEffect(() => {
    if (!open) {
      return;
    }

    setActiveEditorTab('body');
    setDecisions(getInitialDecisions(issues));
  }, [issues, open]);

  const validationResults = useMemo(
    () =>
      issues.map((issue) =>
        getDecisionValidation(
          issue,
          getDecision(decisions, issue.id),
          payloadVariableNames,
        ),
      ),
    [decisions, issues, payloadVariableNames],
  );

  const hasInvalidDecision = validationResults.some(
    (result) => !result.isValid,
  );

  const canSave = !disabled && !hasInvalidDecision;

  const missingManualVariablesCount = issues.filter(
    (issue) => isManualMissingVariable(issue),
  ).length;

  const automaticExtractorVariablesCount = issues.filter(
    (issue) =>
      isExtractorVariable(issue) &&
      issue.existingScenarioVariable === null,
  ).length;

  const updateDecision = (
    nextDecision: UseExistingVariableDecision,
  ) => {
    setDecisions((currentDecisions) =>
      replaceDecision(currentDecisions, nextDecision),
    );
  };

  const save = () => {
    if (!canSave) {
      return;
    }

    const existingBackendRequestId = existingRequest.id;

    if (typeof existingBackendRequestId !== 'number') {
      return;
    }

    onSaved({
      existingBackendRequestId,
      importedBackendRequestName: importedRequest.name,
      issues,
      decisions,
    });
  };

  return (
    <Modal
      open={open}
      title={`Использование существующего метода: ${existingRequest.name}`}
      width="98vw"
      style={{ top: 12 }}
      destroyOnHidden
      maskClosable={false}
      onCancel={onCancel}
      footer={
        <Space wrap>
          <Button
            icon={<ArrowLeftOutlined />}
            disabled={disabled}
            onClick={onCancel}
          >
            Назад к сравнению
          </Button>

          <Button
            type="primary"
            icon={<CheckOutlined />}
            disabled={!canSave}
            onClick={save}
          >
            Использовать существующий метод
          </Button>
        </Space>
      }
    >
      <Alert
        type={hasInvalidDecision ? 'warning' : 'info'}
        showIcon
        icon={<ExclamationCircleOutlined />}
        message="Проверка переменных сценария"
        description={
          issues.length === 0
            ? 'Существующий backend-метод не использует переменные.'
            : `Всего переменных существующего метода: ${issues.length}. Нужно заполнить новых ручных переменных: ${missingManualVariablesCount}. Будет добавлено из response: ${automaticExtractorVariablesCount}.`
        }
        style={{ marginBottom: 16 }}
      />

      <div
        style={{
          display: 'grid',
          gridTemplateColumns:
            'minmax(260px, 1fr) minmax(500px, 1.75fr) minmax(260px, 1fr)',
          gap: 16,
          alignItems: 'start',
        }}
      >
        <div>
          <Typography.Title level={5}>
            Существующий метод
          </Typography.Title>

          <BackendRequestDtoEditor
            value={existingRequest}
            disabled
            activeTab={activeEditorTab}
            lockTabSelection
            onChange={() => undefined}
          />
        </div>

        <div>
          <Typography.Title level={5}>
            Изменения переменных сценария
          </Typography.Title>

          {issues.length === 0 ? (
            <Card size="small">
              <Typography.Text type="secondary">
                У существующего backend-метода нет переменных.
              </Typography.Text>
            </Card>
          ) : (
            <Space
              direction="vertical"
              size={16}
              style={{ width: '100%' }}
            >
              {issues.map((issue) => (
                <VariableIssueCard
                  key={issue.id}
                  issue={issue}
                  decision={getDecision(decisions, issue.id)}
                  payloadVariableNames={payloadVariableNames}
                  disabled={disabled}
                  onDecisionChange={updateDecision}
                />
              ))}
            </Space>
          )}
        </div>

        <div>
          <Typography.Title level={5}>
            Импортируемый метод
          </Typography.Title>

          <BackendRequestDtoEditor
            value={importedRequest}
            disabled
            activeTab={activeEditorTab}
            lockTabSelection
            onChange={() => undefined}
          />
        </div>
      </div>
    </Modal>
  );
}
