import type {
  BackendRequestDto,
} from '../../backendRequestMerge/model/backendRequestMerge.types';
import {
  CUSTOM_METHOD_VARIABLE_NAMES_KEY,
} from '../../scenarioCustomMethodImport/model/customMethodVariablePropagation';

type JsonRecord = Record<string, unknown>;

export type ImportedVariableSource =
  | 'variables'
  | 'backendRequest'
  | 'fieldOverride'
  | 'responseExtractor'
  | 'customMethod';

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

interface FieldOverrideRaw extends JsonRecord {
  method?: unknown;
  methodArg?: unknown;
}

interface FormDataItemRaw extends JsonRecord {
  key?: unknown;
  value?: unknown;
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

function getVariableKey(value: string): string {
  return normalizeVariableName(value).toLocaleLowerCase('ru-RU');
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

function unwrapVariableExpression(
  value: string,
): string | null {
  const match = /^\$\{([^}]+)\}$/.exec(value.trim());

  if (!match) {
    return null;
  }

  const variableName = normalizeVariableName(
    match[1] ?? '',
  );

  return variableName || null;
}

function getUseVariableName(
  methodArg: unknown,
): string | null {
  if (typeof methodArg !== 'string') {
    return null;
  }

  const trimmedMethodArg = methodArg.trim();

  if (!trimmedMethodArg) {
    return null;
  }

  return (
    unwrapVariableExpression(trimmedMethodArg) ??
    trimmedMethodArg
  );
}

function getCustomMethodVariableNames(
  payload: JsonRecord,
): string[] {
  const value = payload[CUSTOM_METHOD_VARIABLE_NAMES_KEY];

  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(
    (item): item is string =>
      typeof item === 'string' && item.trim().length > 0,
  );
}

function addFieldOverrideVariable(
  variableMap: Map<string, ParsedVariable>,
  variableName: string,
  nextPosition: () => number,
): void {
  const normalizedName = normalizeVariableName(variableName);
  const variableKey = getVariableKey(normalizedName);

  if (!normalizedName || !variableKey) {
    return;
  }

  const existing = variableMap.get(variableKey);

  if (existing) {
    existing.sources.add('fieldOverride');
    return;
  }

  variableMap.set(variableKey, {
    name: normalizedName,
    defaultValue: '',
    position: nextPosition(),
    sources: new Set(['fieldOverride']),
    isProducedByExtractor: false,
  });
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
  getVariableNamesFromText(value).forEach((variableName) => {
    const normalizedName = normalizeVariableName(variableName);
    const variableKey = getVariableKey(normalizedName);

    if (!normalizedName || !variableKey) {
      return;
    }

    const existing = variableMap.get(variableKey);

    if (existing) {
      existing.sources.add(source);
      return;
    }

    variableMap.set(variableKey, {
      name: normalizedName,
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
  const variableKey = getVariableKey(normalizedName);
  const normalizedFieldPath = fieldPath.trim();

  if (!normalizedName || !variableKey || !normalizedFieldPath) {
    return;
  }

  const existing = variableMap.get(variableKey);

  if (existing) {
    existing.sources.add('responseExtractor');
    existing.isProducedByExtractor = true;
    return;
  }

  variableMap.set(variableKey, {
    name: normalizedName,
    defaultValue: `json(${normalizedFieldPath})`,
    position: nextPosition(),
    sources: new Set(['responseExtractor']),
    isProducedByExtractor: true,
  });
}

function addCustomMethodVariable(
  variableMap: Map<string, ParsedVariable>,
  variableName: string,
  nextPosition: () => number,
): void {
  const normalizedName = normalizeVariableName(variableName);
  const variableKey = getVariableKey(normalizedName);

  if (!normalizedName || !variableKey) {
    return;
  }

  const existing = variableMap.get(variableKey);

  if (existing) {
    existing.sources.add('customMethod');
    return;
  }

  variableMap.set(variableKey, {
    name: normalizedName,
    defaultValue: '',
    position: nextPosition(),
    sources: new Set(['customMethod']),
    isProducedByExtractor: false,
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
        formDataItem.value,
        'backendRequest',
        nextPosition,
      );
    });

  parseJsonArray(request.fieldOverridesJson)
    .filter(isRecord)
    .forEach((item) => {
      const override = item as FieldOverrideRaw;

      const method = asString(override.method).trim();

      if (method !== 'use variable') {
        return;
      }

      const variableName = getUseVariableName(
        override.methodArg,
      );

      if (!variableName) {
        return;
      }

      addFieldOverrideVariable(
        variables,
        variableName,
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
      const name = normalizeVariableName(
        asString(rawVariable.name),
      );
      const variableKey = getVariableKey(name);

      if (!name || !variableKey) {
        return;
      }

      const existing = variables.get(variableKey);

      if (existing) {
        existing.sources.add('variables');
        return;
      }

      variables.set(variableKey, {
        name,
        defaultValue: asString(rawVariable.value),
        position: nextPosition(),
        sources: new Set(['variables']),
        isProducedByExtractor: false,
      });
    });

  getCustomMethodVariableNames(payload).forEach(
    (variableName) => {
      addCustomMethodVariable(
        variables,
        variableName,
        nextPosition,
      );
    },
  );

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
