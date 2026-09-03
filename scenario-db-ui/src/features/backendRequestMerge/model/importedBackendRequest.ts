import type {
  BackendFieldOverride,
  BackendFormDataItem,
  BackendRequestDto,
  BackendResponseExtractor,
} from './backendRequestMerge.types';

interface JsonRecord {
  [key: string]: unknown;
}

interface ImportedBackendRequestRaw extends JsonRecord {
  name?: unknown;
  url?: unknown;
  method?: unknown;
  requestBody?: unknown;
  requestHeaders?: unknown;
  capturedResponseBody?: unknown;
  token?: unknown;
  bodyType?: unknown;
  formData?: unknown;
  fieldOverrides?: unknown;
  responseExtractors?: unknown;
}

interface ImportedScenarioOverride extends JsonRecord {
  fieldOverrides?: unknown;
  responseExtractors?: unknown;
}

export interface BackendRequestNameReplacement {
  from: string;
  to: string;
}

function isRecord(value: unknown): value is JsonRecord {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value)
  );
}

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function parseFieldOverrides(
  value: unknown,
): BackendFieldOverride[] {
  return asArray(value)
    .filter(isRecord)
    .map((item) => ({
      fieldPath: asString(item.fieldPath),
      method: asString(item.method),
      methodArg: asString(item.methodArg),
      type: asString(item.type, 'string'),
    }))
    .filter((item) => item.fieldPath.length > 0);
}

function parseResponseExtractors(
  value: unknown,
): BackendResponseExtractor[] {
  return asArray(value)
    .filter(isRecord)
    .map((item) => ({
      fieldPath: asString(item.fieldPath),
      variableName: asString(item.variableName),
    }))
    .filter((item) => item.fieldPath.length > 0);
}

function getRootActionBackendMethodNames(
  payload: JsonRecord,
): Set<string> {
  const backendMethodNames = new Set<string>();

  for (const action of asArray(payload.actions)) {
    if (!isRecord(action)) {
      continue;
    }

    if (
      action.action !== 'useBackendMethod' ||
      typeof action.value !== 'string'
    ) {
      continue;
    }

    const name = action.value.trim();

    if (name.length > 0) {
      backendMethodNames.add(name);
    }
  }

  return backendMethodNames;
}

export function parseImportedBackendRequests(
  payload: JsonRecord,
): BackendRequestDto[] {
  const directBackendMethodNames =
    getRootActionBackendMethodNames(payload);

  const rawBackendRequests = asArray(payload.backendRequests);
  const rawScenarioOverrides = isRecord(payload.scenarioOverrides)
    ? payload.scenarioOverrides
    : {};

  return rawBackendRequests
    .filter(isRecord)
    .map((rawValue) => {
      const rawRequest = rawValue as ImportedBackendRequestRaw;
      const name = asString(rawRequest.name);

      const scenarioOverride = isRecord(rawScenarioOverrides[name])
        ? (rawScenarioOverrides[name] as ImportedScenarioOverride)
        : null;

      const requestOverrides = parseFieldOverrides(
        rawRequest.fieldOverrides,
      );

      const scenarioOverrides = parseFieldOverrides(
        scenarioOverride?.fieldOverrides,
      );

      const requestExtractors = parseResponseExtractors(
        rawRequest.responseExtractors,
      );

      const scenarioExtractors = parseResponseExtractors(
        scenarioOverride?.responseExtractors,
      );

      return {
        name,
        url: asString(rawRequest.url),
        httpMethod: asString(rawRequest.method, 'GET').toUpperCase(),
        requestBody:
          typeof rawRequest.requestBody === 'string'
            ? rawRequest.requestBody
            : null,
        requestHeadersJson: asString(
          rawRequest.requestHeaders,
          '{}',
        ),
        capturedResponseBody:
          typeof rawRequest.capturedResponseBody === 'string'
            ? rawRequest.capturedResponseBody
            : null,
        token: asString(rawRequest.token),
        bodyType: asString(rawRequest.bodyType, 'NONE').toUpperCase(),
        formDataJson: JSON.stringify(asArray(rawRequest.formData)),
        fieldOverridesJson: JSON.stringify(
          requestOverrides.length > 0
            ? requestOverrides
            : scenarioOverrides,
        ),
        responseExtractorsJson: JSON.stringify(
          scenarioExtractors.length > 0
            ? scenarioExtractors
            : requestExtractors,
        ),
      };
    })
    .filter(
      (request) =>
        directBackendMethodNames.has(request.name) &&
        request.name.length > 0 &&
        request.url.length > 0 &&
        request.httpMethod.length > 0,
    );
}

export function createScenarioPayloadForSave(
  payload: JsonRecord,
  replacements: BackendRequestNameReplacement[],
): string {
  const normalizedPayload: JsonRecord = {
    ...payload,
  };

  const replacementMap = new Map(
    replacements.map((replacement) => [
      replacement.from,
      replacement.to,
    ]),
  );

  const actions = Array.isArray(normalizedPayload.actions)
    ? normalizedPayload.actions
    : [];

  normalizedPayload.actions = actions.map((action) => {
    if (!isRecord(action)) {
      return action;
    }

    if (
      action.action !== 'useBackendMethod' ||
      typeof action.value !== 'string'
    ) {
      return action;
    }

    const replacement = replacementMap.get(action.value);

    return replacement
      ? {
          ...action,
          value: replacement,
        }
      : action;
  });

  const rawScenarioOverrides = isRecord(
    normalizedPayload.scenarioOverrides,
  )
    ? normalizedPayload.scenarioOverrides
    : null;

  if (rawScenarioOverrides) {
    const renamedOverrides: JsonRecord = {};

    Object.entries(rawScenarioOverrides).forEach(([key, value]) => {
      const replacement = replacementMap.get(key);

      renamedOverrides[replacement ?? key] = value;
    });

    normalizedPayload.scenarioOverrides = renamedOverrides;
  }

  delete normalizedPayload.backendRequests;

  return JSON.stringify(normalizedPayload);
}
function getNormalizedBodyType(
  bodyType: BackendRequestDto['bodyType'],
): string {
  return String(bodyType).toUpperCase();
}

function isFormBodyType(
  bodyType: BackendRequestDto['bodyType'],
): boolean {
  const normalizedBodyType = getNormalizedBodyType(bodyType);

  return (
    normalizedBodyType === 'FORM_URLENCODED' ||
    normalizedBodyType === 'FORM_DATA'
  );
}

function parseJson(
  value: string | null | undefined,
): unknown | null {
  if (!value?.trim()) {
    return null;
  }

  try {
    return JSON.parse(value) as unknown;
  } catch {
    return null;
  }
}

function areJsonValuesEqual(
  left: unknown,
  right: unknown,
): boolean {
  if (left === null || right === null) {
    return left === right;
  }

  if (typeof left !== typeof right) {
    return false;
  }

  if (typeof left !== 'object' || typeof right !== 'object') {
    return left === right;
  }

  if (Array.isArray(left) || Array.isArray(right)) {
    if (!Array.isArray(left) || !Array.isArray(right)) {
      return false;
    }

    if (left.length !== right.length) {
      return false;
    }

    return left.every((item, index) =>
      areJsonValuesEqual(item, right[index]),
    );
  }

  if (!isRecord(left) || !isRecord(right)) {
    return false;
  }

  const leftKeys = Object.keys(left).sort();
  const rightKeys = Object.keys(right).sort();

  if (
    leftKeys.length !== rightKeys.length ||
    leftKeys.some((key, index) => key !== rightKeys[index])
  ) {
    return false;
  }

  return leftKeys.every((key) =>
    areJsonValuesEqual(left[key], right[key]),
  );
}

function areRequestBodiesEqual(
  leftValue: string | null | undefined,
  rightValue: string | null | undefined,
): boolean {
  const leftText = leftValue ?? '';
  const rightText = rightValue ?? '';

  const leftJson = parseJson(leftText);
  const rightJson = parseJson(rightText);

  if (leftJson !== null && rightJson !== null) {
    return areJsonValuesEqual(leftJson, rightJson);
  }

  return leftText === rightText;
}

function areJsonStructuresEqual(
  left: unknown,
  right: unknown,
): boolean {
  if (left === null || right === null) {
    return left === right;
  }

  if (typeof left !== typeof right) {
    return false;
  }

  if (typeof left !== 'object' || typeof right !== 'object') {
    /*
     * Для capturedResponseBody значение неважно,
     * но тип primitive должен совпадать.
     */
    return true;
  }

  if (Array.isArray(left) || Array.isArray(right)) {
    if (!Array.isArray(left) || !Array.isArray(right)) {
      return false;
    }

    /*
     * Массив — это шаблон структуры. Длину не сравниваем:
     * ответ одного API может содержать разное число объектов.
     */
    if (left.length === 0 || right.length === 0) {
      return true;
    }

    return areJsonStructuresEqual(left[0], right[0]);
  }

  if (!isRecord(left) || !isRecord(right)) {
    return false;
  }

  const leftKeys = Object.keys(left).sort();
  const rightKeys = Object.keys(right).sort();

  if (
    leftKeys.length !== rightKeys.length ||
    leftKeys.some((key, index) => key !== rightKeys[index])
  ) {
    return false;
  }

  return leftKeys.every((key) =>
    areJsonStructuresEqual(left[key], right[key]),
  );
}

function areResponseBodiesStructurallyEqual(
  leftValue: string | null | undefined,
  rightValue: string | null | undefined,
): boolean {
  const leftText = leftValue ?? '';
  const rightText = rightValue ?? '';

  if (!leftText.trim() && !rightText.trim()) {
    return true;
  }

  const leftJson = parseJson(leftText);
  const rightJson = parseJson(rightText);

  if (leftJson === null || rightJson === null) {
    return leftText === rightText;
  }

  return areJsonStructuresEqual(leftJson, rightJson);
}

function parseFormData(
  value: string | null | undefined,
): BackendFormDataItem[] | null {
  if (!value?.trim()) {
    return [];
  }

  try {
    const parsedValue: unknown = JSON.parse(value);

    if (!Array.isArray(parsedValue)) {
      return null;
    }

    const items = parsedValue.filter(isBackendFormDataItem);

    return items.length === parsedValue.length ? items : null;
  } catch {
    return null;
  }
}

function isBackendFormDataItem(
  value: unknown,
): value is BackendFormDataItem {
  return (
    isRecord(value) &&
    typeof value.key === 'string' &&
    typeof value.value === 'string'
  );
}

function areFormDataEqual(
  leftValue: string | null | undefined,
  rightValue: string | null | undefined,
): boolean {
  const leftItems = parseFormData(leftValue);
  const rightItems = parseFormData(rightValue);

  if (leftItems === null || rightItems === null) {
    return (leftValue ?? '') === (rightValue ?? '');
  }

  const normalize = (items: BackendFormDataItem[]): string[] =>
    items
      .map((item) => `${item.key.trim()}\u0000${item.value}`)
      .sort();

  const leftNormalized = normalize(leftItems);
  const rightNormalized = normalize(rightItems);

  return (
    leftNormalized.length === rightNormalized.length &&
    leftNormalized.every(
      (item, index) => item === rightNormalized[index],
    )
  );
}

function areFieldOverridesEqual(
  leftValue: string,
  rightValue: string,
): boolean {
  const normalize = (value: string): string[] => {
    try {
      const parsedValue: unknown = JSON.parse(value);

      if (!Array.isArray(parsedValue)) {
        return [value];
      }

      return parsedValue
        .filter(isRecord)
        .map((item) =>
          JSON.stringify({
            fieldPath: asString(item.fieldPath),
            method: asString(item.method),
            methodArg: asString(item.methodArg),
            type: asString(item.type, 'string'),
          }),
        )
        .sort();
    } catch {
      return [value];
    }
  };

  const leftNormalized = normalize(leftValue);
  const rightNormalized = normalize(rightValue);

  return (
    leftNormalized.length === rightNormalized.length &&
    leftNormalized.every(
      (item, index) => item === rightNormalized[index],
    )
  );
}

function areResponseExtractorsEqual(
  leftValue: string,
  rightValue: string,
): boolean {
  const normalize = (value: string): string[] => {
    try {
      const parsedValue: unknown = JSON.parse(value);

      if (!Array.isArray(parsedValue)) {
        return [value];
      }

      return parsedValue
        .filter(isRecord)
        .map((item) =>
          JSON.stringify({
            fieldPath: asString(item.fieldPath),
            variableName: asString(item.variableName),
          }),
        )
        .sort();
    } catch {
      return [value];
    }
  };

  const leftNormalized = normalize(leftValue);
  const rightNormalized = normalize(rightValue);

  return (
    leftNormalized.length === rightNormalized.length &&
    leftNormalized.every(
      (item, index) => item === rightNormalized[index],
    )
  );
}

export function areBackendRequestsEqual(
  left: BackendRequestDto,
  right: BackendRequestDto,
): boolean {
  const leftBodyType = getNormalizedBodyType(left.bodyType);
  const rightBodyType = getNormalizedBodyType(right.bodyType);

  const areBodiesEqual =
    isFormBodyType(left.bodyType) || isFormBodyType(right.bodyType)
      ? areFormDataEqual(left.formDataJson, right.formDataJson)
      : areRequestBodiesEqual(left.requestBody, right.requestBody);

  return (
    left.url === right.url &&
    left.httpMethod === right.httpMethod &&
    leftBodyType === rightBodyType &&
    left.token === right.token &&
    areBodiesEqual &&
    areResponseBodiesStructurallyEqual(
      left.capturedResponseBody,
      right.capturedResponseBody,
    ) &&
    areFieldOverridesEqual(
      left.fieldOverridesJson,
      right.fieldOverridesJson,
    ) &&
    areResponseExtractorsEqual(
      left.responseExtractorsJson,
      right.responseExtractorsJson,
    )
  );
}
