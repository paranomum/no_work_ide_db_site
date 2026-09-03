import type {
  BackendRequestDto,
  BackendRequestVariableUsageLocation,
  ExistingScenarioVariableSnapshot,
  UseExistingVariableIssue,
  UseExistingVariableKind,
} from './backendRequestMerge.types';


type JsonRecord = Record<string, unknown>;


interface Extractor {
  fieldPath: string;
  variableName: string;
}


interface PayloadVariable {
  name: string;
  value: string;
  position: number;
}


interface VariableUsageAnalysis {
  usagesByVariableName: Map<
    string,
    BackendRequestVariableUsageLocation[]
  >;
  variableNamesByKey: Map<string, string>;
  extractorFieldPathsByVariableName: Map<string, string[]>;
}


function isRecord(value: unknown): value is JsonRecord {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value)
  );
}


function normalizeVariableName(value: string): string {
  return value.trim().toLocaleLowerCase('ru-RU');
}


function getVariableNamesFromText(value: unknown): string[] {
  if (typeof value !== 'string') {
    return [];
  }

  const variableNames: string[] = [];
  const expressionPattern = /\$\{([^}]+)\}/g;

  for (const match of value.matchAll(expressionPattern)) {
    const variableName = (match[1] ?? '').trim();

    if (variableName) {
      variableNames.push(variableName);
    }
  }

  return variableNames;
}


function parseJson(value: string): unknown {
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return null;
  }
}


function parseJsonObject(value: string): JsonRecord {
  const parsedValue = parseJson(value);

  return isRecord(parsedValue) ? parsedValue : {};
}


function parseJsonArray(value: string): unknown[] {
  const parsedValue = parseJson(value);

  return Array.isArray(parsedValue) ? parsedValue : [];
}


function parseExtractors(
  responseExtractorsJson: string,
): Extractor[] {
  return parseJsonArray(responseExtractorsJson)
    .filter(isRecord)
    .map((item) => ({
      fieldPath:
        typeof item.fieldPath === 'string'
          ? item.fieldPath.trim()
          : '',
      variableName:
        typeof item.variableName === 'string'
          ? item.variableName.trim()
          : '',
    }))
    .filter(
      (extractor) =>
        extractor.fieldPath.length > 0 &&
        extractor.variableName.length > 0,
    );
}


function createUsageLocation(
  kind: BackendRequestVariableUsageLocation['kind'],
  label: string,
  value: string,
): BackendRequestVariableUsageLocation {
  return {
    kind,
    label,
    value,
  };
}


function rememberVariableName(
  variableNamesByKey: Map<string, string>,
  variableName: string,
): void {
  const variableKey = normalizeVariableName(variableName);

  if (variableKey && !variableNamesByKey.has(variableKey)) {
    variableNamesByKey.set(variableKey, variableName);
  }
}


function addUsage(
  usagesByVariableName: Map<
    string,
    BackendRequestVariableUsageLocation[]
  >,
  variableNamesByKey: Map<string, string>,
  variableName: string,
  usage: BackendRequestVariableUsageLocation,
): void {
  const variableKey = normalizeVariableName(variableName);

  if (!variableKey) {
    return;
  }

  rememberVariableName(variableNamesByKey, variableName);

  const usages = usagesByVariableName.get(variableKey) ?? [];

  usages.push(usage);

  usagesByVariableName.set(variableKey, usages);
}


function addUsagesFromText(
  usagesByVariableName: Map<
    string,
    BackendRequestVariableUsageLocation[]
  >,
  variableNamesByKey: Map<string, string>,
  text: unknown,
  usage: BackendRequestVariableUsageLocation,
): void {
  getVariableNamesFromText(text).forEach((variableName) => {
    addUsage(
      usagesByVariableName,
      variableNamesByKey,
      variableName,
      usage,
    );
  });
}


function readHeaderUsages(
  requestHeadersJson: string,
  usagesByVariableName: Map<
    string,
    BackendRequestVariableUsageLocation[]
  >,
  variableNamesByKey: Map<string, string>,
): void {
  const headers = parseJsonObject(requestHeadersJson);

  Object.entries(headers).forEach(([headerName, headerValue]) => {
    if (typeof headerValue !== 'string') {
      return;
    }

    addUsagesFromText(
      usagesByVariableName,
      variableNamesByKey,
      headerValue,
      createUsageLocation(
        'request-header',
        `Header: ${headerName}`,
        headerValue,
      ),
    );
  });
}


function readFormDataUsages(
  formDataJson: string,
  usagesByVariableName: Map<
    string,
    BackendRequestVariableUsageLocation[]
  >,
  variableNamesByKey: Map<string, string>,
): void {
  parseJsonArray(formDataJson)
    .filter(isRecord)
    .forEach((item) => {
      const key =
        typeof item.key === 'string' ? item.key : '';

      const value =
        typeof item.value === 'string' ? item.value : '';

      if (key) {
        addUsagesFromText(
          usagesByVariableName,
          variableNamesByKey,
          key,
          createUsageLocation(
            'form-data',
            `Form-data key: ${key}`,
            key,
          ),
        );
      }

      if (value) {
        addUsagesFromText(
          usagesByVariableName,
          variableNamesByKey,
          value,
          createUsageLocation(
            'form-data',
            `Form-data: ${key || 'значение'}`,
            value,
          ),
        );
      }
    });
}


function readFieldOverrideUsages(
  fieldOverridesJson: string,
  usagesByVariableName: Map<
    string,
    BackendRequestVariableUsageLocation[]
  >,
  variableNamesByKey: Map<string, string>,
): void {
  parseJsonArray(fieldOverridesJson)
    .filter(isRecord)
    .forEach((item) => {
      const fieldPath =
        typeof item.fieldPath === 'string'
          ? item.fieldPath
          : '';

      const methodArg =
        typeof item.methodArg === 'string'
          ? item.methodArg.trim()
          : '';

      if (!methodArg) {
        return;
      }

      addUsage(
        usagesByVariableName,
        variableNamesByKey,
        methodArg,
        createUsageLocation(
          'field-override',
          `Field override: ${fieldPath || 'поле'}`,
          methodArg,
        ),
      );
    });
}


function addExtractorUsage(
  usagesByVariableName: Map<
    string,
    BackendRequestVariableUsageLocation[]
  >,
  variableNamesByKey: Map<string, string>,
  extractorFieldPathsByVariableName: Map<string, string[]>,
  extractor: Extractor,
): void {
  const variableKey = normalizeVariableName(
    extractor.variableName,
  );

  if (!variableKey) {
    return;
  }

  addUsage(
    usagesByVariableName,
    variableNamesByKey,
    extractor.variableName,
    createUsageLocation(
      'response-extractor',
      `Response extractor: ${extractor.fieldPath}`,
      `${extractor.fieldPath} → ${extractor.variableName}`,
    ),
  );

  const fieldPaths =
    extractorFieldPathsByVariableName.get(variableKey) ?? [];

  if (!fieldPaths.includes(extractor.fieldPath)) {
    fieldPaths.push(extractor.fieldPath);
  }

  extractorFieldPathsByVariableName.set(
    variableKey,
    fieldPaths,
  );
}


function analyzeBackendRequestVariables(
  request: BackendRequestDto,
): VariableUsageAnalysis {
  const usagesByVariableName = new Map<
    string,
    BackendRequestVariableUsageLocation[]
  >();

  const variableNamesByKey = new Map<string, string>();

  const extractorFieldPathsByVariableName = new Map<
    string,
    string[]
  >();

  addUsagesFromText(
    usagesByVariableName,
    variableNamesByKey,
    request.url,
    createUsageLocation('url', 'URL', request.url),
  );

  if (request.requestBody !== null) {
    addUsagesFromText(
      usagesByVariableName,
      variableNamesByKey,
      request.requestBody,
      createUsageLocation(
        'request-body',
        'Request body',
        request.requestBody,
      ),
    );
  }

  readHeaderUsages(
    request.requestHeadersJson,
    usagesByVariableName,
    variableNamesByKey,
  );

  addUsagesFromText(
    usagesByVariableName,
    variableNamesByKey,
    request.token,
    createUsageLocation(
      'token',
      'Token',
      request.token,
    ),
  );

  readFormDataUsages(
    request.formDataJson,
    usagesByVariableName,
    variableNamesByKey,
  );

  readFieldOverrideUsages(
    request.fieldOverridesJson,
    usagesByVariableName,
    variableNamesByKey,
  );

  parseExtractors(request.responseExtractorsJson).forEach(
    (extractor) =>
      addExtractorUsage(
        usagesByVariableName,
        variableNamesByKey,
        extractorFieldPathsByVariableName,
        extractor,
      ),
  );

  return {
    usagesByVariableName,
    variableNamesByKey,
    extractorFieldPathsByVariableName,
  };
}


function readPayloadVariables(
  payload: JsonRecord,
): Map<string, PayloadVariable> {
  const variablesByName = new Map<string, PayloadVariable>();

  const rawVariables = Array.isArray(payload.variables)
    ? payload.variables
    : [];

  rawVariables.forEach((rawVariable, position) => {
    if (!isRecord(rawVariable)) {
      return;
    }

    const name =
      typeof rawVariable.name === 'string'
        ? rawVariable.name.trim()
        : '';

    if (!name) {
      return;
    }

    const variableKey = normalizeVariableName(name);

    if (variablesByName.has(variableKey)) {
      return;
    }

    variablesByName.set(variableKey, {
      name,
      value:
        typeof rawVariable.value === 'string'
          ? rawVariable.value
          : '',
      position,
    });
  });

  return variablesByName;
}


function createScenarioVariableSnapshot(
  payloadVariable: PayloadVariable,
  importedAnalysis: VariableUsageAnalysis,
): ExistingScenarioVariableSnapshot {
  const variableKey = normalizeVariableName(payloadVariable.name);

  const usages =
    importedAnalysis.usagesByVariableName.get(variableKey) ?? [];

  const sources: ExistingScenarioVariableSnapshot['sources'] = [
    'variables',
  ];

  if (
    usages.some(
      (usage) =>
        usage.kind === 'url' ||
        usage.kind === 'request-body' ||
        usage.kind === 'request-header' ||
        usage.kind === 'token' ||
        usage.kind === 'form-data',
    )
  ) {
    sources.push('backendRequest');
  }

  if (
    usages.some(
      (usage) => usage.kind === 'field-override',
    )
  ) {
    sources.push('fieldOverride');
  }

  if (
    usages.some(
      (usage) => usage.kind === 'response-extractor',
    )
  ) {
    sources.push('responseExtractor');
  }

  return {
    name: payloadVariable.name,
    defaultValue: payloadVariable.value,
    position: payloadVariable.position,
    sources,
  };
}


function getVariableKind(
  usages: BackendRequestVariableUsageLocation[],
): UseExistingVariableKind {
  const hasManualUsage = usages.some(
    (usage) => usage.kind !== 'response-extractor',
  );

  return hasManualUsage
    ? 'manual'
    : 'response-extractor';
}


function getSuggestedDefaultValue(
  variableKind: UseExistingVariableKind,
  extractorFieldPaths: string[],
): string {
  if (variableKind !== 'response-extractor') {
    return '';
  }

  const fieldPath = extractorFieldPaths[0]?.trim();

  return fieldPath ? `json(${fieldPath})` : '';
}


function createIssueId(variableName: string): string {
  return `use-existing:${normalizeVariableName(variableName)}`;
}


export function createUseExistingVariableIssues(
  existingRequest: BackendRequestDto,
  importedRequest: BackendRequestDto,
  payload: JsonRecord,
): UseExistingVariableIssue[] {
  const existingAnalysis =
    analyzeBackendRequestVariables(existingRequest);

  const importedAnalysis =
    analyzeBackendRequestVariables(importedRequest);

  const payloadVariables = readPayloadVariables(payload);

  return Array.from(
    existingAnalysis.usagesByVariableName.entries(),
  ).map(([variableKey, existingMethodUsages]) => {
    const requiredVariableName =
      existingAnalysis.variableNamesByKey.get(variableKey) ??
      variableKey;

    const importedMethodUsages =
      importedAnalysis.usagesByVariableName.get(variableKey) ?? [];

    const payloadVariable =
      payloadVariables.get(variableKey) ?? null;

    const extractorFieldPaths =
      existingAnalysis.extractorFieldPathsByVariableName.get(
        variableKey,
      ) ?? [];

    const variableKind = getVariableKind(existingMethodUsages);

    return {
      id: createIssueId(requiredVariableName),
      requiredVariableName,
      variableKind,
      existingMethodUsages,
      importedMethodUsages,
      existingScenarioVariable: payloadVariable
        ? createScenarioVariableSnapshot(
            payloadVariable,
            importedAnalysis,
          )
        : null,
      extractorFieldPaths,
      suggestedDefaultValue: getSuggestedDefaultValue(
        variableKind,
        extractorFieldPaths,
      ),
    };
  });
}
