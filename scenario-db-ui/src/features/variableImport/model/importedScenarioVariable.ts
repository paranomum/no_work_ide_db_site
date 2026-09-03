import type {
  BackendRequestDto,
} from '../../backendRequestMerge/model/backendRequestMerge.types';

type JsonRecord = Record<string, unknown>;

export type ImportedVariableSource =
  | 'variables'
  | 'backendRequest'
  | 'fieldOverride'
  | 'responseExtractor';

export interface ImportedScenarioVariable {
  name: string;
  defaultValue: string;
  isUserVariable: boolean;
  position: number;
  sources: ImportedVariableSource[];
}

interface ImportedVariableRaw extends JsonRecord {
  name?: unknown;
  value?: unknown;
}

interface FormDataItemRaw extends JsonRecord {
  key?: unknown;
  value?: unknown;
}

interface FieldOverrideRaw extends JsonRecord {
  methodArg?: unknown;
}

interface ResponseExtractorRaw extends JsonRecord {
  fieldPath?: unknown;
  variableName?: unknown;
}

interface ParsedVariable {
  name: string;
  defaultValue: string;
  position: number;
  sources: Set<ImportedVariableSource>;
  isProducedByExtractor: boolean;
}

function isRecord(value: unknown): value is JsonRecord {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value)
  );
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function normalizeVariableName(value: string): string {
  return value.trim();
}

function getVariableNamesFromText(value: unknown): string[] {
  if (typeof value !== 'string') {
    return [];
  }

  const names: string[] = [];
  const expressionPattern = /\$\{([^}]+)\}/g;

  for (const match of value.matchAll(expressionPattern)) {
    const name = normalizeVariableName(match[1] ?? '');

    if (name) {
      names.push(name);
    }
  }

  return names;
}

function parseJsonArray(json: string): unknown[] {
  try {
    return asArray(JSON.parse(json));
  } catch {
    return [];
  }
}

function addTextVariables(
  variableMap: Map<string, ParsedVariable>,
  value: unknown,
  source: ImportedVariableSource,
  nextPosition: () => number,
): void {
  getVariableNamesFromText(value).forEach((name) => {
    const existing = variableMap.get(name);

    if (existing) {
      existing.sources.add(source);
      return;
    }

    variableMap.set(name, {
      name,
      defaultValue: '',
      position: nextPosition(),
      sources: new Set([source]),
      isProducedByExtractor: false,
    });
  });
}

function addExtractorVariable(
  variableMap: Map<string, ParsedVariable>,
  variableName: string,
  fieldPath: string,
  nextPosition: () => number,
): void {
  const normalizedName = normalizeVariableName(variableName);
  const normalizedFieldPath = fieldPath.trim();

  if (!normalizedName || !normalizedFieldPath) {
    return;
  }

  const existing = variableMap.get(normalizedName);

  if (existing) {
    /*
     * Переменная уже определена в payload.variables или найдена
     * в другом месте сценария. Не меняем её значение здесь:
     * это защищает импортированное значение от затирания
     * при выборе существующего backend-метода.
     */
    existing.sources.add('responseExtractor');
    existing.isProducedByExtractor = true;
    return;
  }

  variableMap.set(normalizedName, {
    name: normalizedName,
    defaultValue: `json(${normalizedFieldPath})`,
    position: nextPosition(),
    sources: new Set(['responseExtractor']),
    isProducedByExtractor: true,
  });
}

function collectVariablesFromBackendRequest(
  variables: Map<string, ParsedVariable>,
  request: BackendRequestDto,
  nextPosition: () => number,
): void {

  addTextVariables(
  variables,
  request.url,
  'backendRequest',
  nextPosition,
);


  addTextVariables(
    variables,
    request.requestBody,
    'backendRequest',
    nextPosition,
  );

  addTextVariables(
    variables,
    request.requestHeadersJson,
    'backendRequest',
    nextPosition,
  );

  addTextVariables(
    variables,
    request.token,
    'backendRequest',
    nextPosition,
  );

  parseJsonArray(request.formDataJson)
    .filter(isRecord)
    .forEach((item) => {
      const formDataItem = item as FormDataItemRaw;

      addTextVariables(
        variables,
        formDataItem.key,
        'backendRequest',
        nextPosition,
      );

      addTextVariables(
        variables,
        formDataItem.value,
        'backendRequest',
        nextPosition,
      );
    });

  parseJsonArray(request.fieldOverridesJson)
    .filter(isRecord)
    .forEach((item) => {
      const override = item as FieldOverrideRaw;

      addTextVariables(
        variables,
        override.methodArg,
        'fieldOverride',
        nextPosition,
      );
    });

  parseJsonArray(request.responseExtractorsJson)
  .filter(isRecord)
  .forEach((item) => {
    const extractor = item as ResponseExtractorRaw;

    addExtractorVariable(
      variables,
      asString(extractor.variableName),
      asString(extractor.fieldPath),
      nextPosition,
    );
  });
}

export function parseImportedScenarioVariables(
  payload: JsonRecord,
  resolvedBackendRequests: BackendRequestDto[],
): ImportedScenarioVariable[] {
  const variables = new Map<string, ParsedVariable>();
  let position = 0;

  const nextPosition = () => {
    const next = position;
    position += 1;

    return next;
  };

  asArray(payload.variables)
    .filter(isRecord)
    .forEach((item) => {
      const rawVariable = item as ImportedVariableRaw;
      const name = normalizeVariableName(asString(rawVariable.name));

      if (!name) {
        return;
      }

      const existing = variables.get(name);

      if (existing) {
        existing.sources.add('variables');
        return;
      }

      variables.set(name, {
        name,
        defaultValue: asString(rawVariable.value),
        position: nextPosition(),
        sources: new Set(['variables']),
        isProducedByExtractor: false,
      });
    });

  resolvedBackendRequests.forEach((request) => {
    collectVariablesFromBackendRequest(
      variables,
      request,
      nextPosition,
    );
  });

  return Array.from(variables.values())
    .sort((left, right) => left.position - right.position)
    .map((variable) => ({
      name: variable.name,
      defaultValue: variable.defaultValue,
      isUserVariable:
        !variable.isProducedByExtractor &&
        variable.defaultValue.length === 0,
      position: variable.position,
      sources: Array.from(variable.sources),
    }));
}
