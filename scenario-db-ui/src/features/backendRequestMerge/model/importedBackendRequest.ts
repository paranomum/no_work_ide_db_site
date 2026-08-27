import type {
  BackendFieldOverride,
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

export function parseImportedBackendRequests(
  payload: JsonRecord,
): BackendRequestDto[] {
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

export function areBackendRequestsEqual(
  left: BackendRequestDto,
  right: BackendRequestDto,
): boolean {
  return (
    left.url === right.url &&
    left.httpMethod === right.httpMethod &&
    (left.requestBody ?? '') === (right.requestBody ?? '') &&
    left.requestHeadersJson === right.requestHeadersJson &&
    (left.capturedResponseBody ?? '') ===
      (right.capturedResponseBody ?? '') &&
    left.token === right.token &&
    left.bodyType === right.bodyType &&
    left.formDataJson === right.formDataJson &&
    left.fieldOverridesJson === right.fieldOverridesJson &&
    left.responseExtractorsJson ===
      right.responseExtractorsJson
  );
}
