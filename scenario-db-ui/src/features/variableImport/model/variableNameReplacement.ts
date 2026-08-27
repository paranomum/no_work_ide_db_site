import type {
  BackendRequestDto,
} from '../../backendRequestMerge/model/backendRequestMerge.types';

type JsonRecord = Record<string, unknown>;

export interface VariableNameReplacement {
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

function replaceVariableReferencesInString(
  value: string,
  replacements: VariableNameReplacement[],
): string {
  return replacements.reduce(
    (result, replacement) =>
      result.replaceAll(
        `\${${replacement.from}}`,
        `\${${replacement.to}}`,
      ),
    value,
  );
}

function replaceVariableName(
  value: string,
  replacements: Map<string, string>,
): string {
  return replacements.get(value) ?? value;
}

function replaceInUnknown(
  value: unknown,
  replacements: VariableNameReplacement[],
): unknown {
  if (typeof value === 'string') {
    return replaceVariableReferencesInString(value, replacements);
  }

  if (Array.isArray(value)) {
    return value.map((item) =>
      replaceInUnknown(item, replacements),
    );
  }

  if (isRecord(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key,
        replaceInUnknown(item, replacements),
      ]),
    );
  }

  return value;
}

function parseJsonOrFallback(
  value: string,
  fallback: unknown,
): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function stringifyJson(value: unknown): string {
  return JSON.stringify(value);
}

function replaceExtractorVariableNames(
  value: unknown,
  replacements: VariableNameReplacement[],
  replacementMap: Map<string, string>,
): unknown {
  if (!Array.isArray(value)) {
    return replaceInUnknown(value, replacements);
  }

  return value.map((extractor) => {
    const replacedExtractor = replaceInUnknown(
      extractor,
      replacements,
    );

    if (
      !isRecord(replacedExtractor) ||
      typeof replacedExtractor.variableName !== 'string'
    ) {
      return replacedExtractor;
    }

    return {
      ...replacedExtractor,
      variableName: replaceVariableName(
        replacedExtractor.variableName,
        replacementMap,
      ),
    };
  });
}

export function replaceVariableNamesInBackendRequest(
  request: BackendRequestDto,
  replacements: VariableNameReplacement[],
): BackendRequestDto {
  if (replacements.length === 0) {
    return request;
  }

  const replacementMap = new Map(
    replacements.map((replacement) => [
      replacement.from,
      replacement.to,
    ]),
  );

  const formData = replaceInUnknown(
    parseJsonOrFallback(request.formDataJson, []),
    replacements,
  );

  const fieldOverrides = replaceInUnknown(
    parseJsonOrFallback(request.fieldOverridesJson, []),
    replacements,
  );

  const responseExtractors = replaceExtractorVariableNames(
    parseJsonOrFallback(request.responseExtractorsJson, []),
    replacements,
    replacementMap,
  );

  return {
    ...request,
    requestBody:
      request.requestBody === null
        ? null
        : replaceVariableReferencesInString(
            request.requestBody,
            replacements,
          ),
    requestHeadersJson: stringifyJson(
      replaceInUnknown(
        parseJsonOrFallback(request.requestHeadersJson, {}),
        replacements,
      ),
    ),
    capturedResponseBody:
      request.capturedResponseBody === null
        ? null
        : replaceVariableReferencesInString(
            request.capturedResponseBody,
            replacements,
          ),
    token: replaceVariableReferencesInString(
      request.token,
      replacements,
    ),
    formDataJson: stringifyJson(formData),
    fieldOverridesJson: stringifyJson(fieldOverrides),
    responseExtractorsJson: stringifyJson(responseExtractors),
  };
}

function replacePayloadVariables(
  rawVariables: unknown,
  replacementMap: Map<string, string>,
): unknown[] {
  if (!Array.isArray(rawVariables)) {
    return [];
  }

  return rawVariables.map((variable) => {
    if (
      !isRecord(variable) ||
      typeof variable.name !== 'string'
    ) {
      return variable;
    }

    return {
      ...variable,
      name: replaceVariableName(variable.name, replacementMap),
    };
  });
}

function replacePayloadBackendRequests(
  rawBackendRequests: unknown,
  replacements: VariableNameReplacement[],
  replacementMap: Map<string, string>,
): unknown[] {
  if (!Array.isArray(rawBackendRequests)) {
    return [];
  }

  return rawBackendRequests.map((request) => {
    const replacedRequest = replaceInUnknown(request, replacements);

    if (!isRecord(replacedRequest)) {
      return replacedRequest;
    }

    return {
      ...replacedRequest,
      responseExtractors: replaceExtractorVariableNames(
        replacedRequest.responseExtractors,
        replacements,
        replacementMap,
      ),
    };
  });
}

function replacePayloadScenarioOverrides(
  rawScenarioOverrides: unknown,
  replacements: VariableNameReplacement[],
  replacementMap: Map<string, string>,
): unknown {
  if (!isRecord(rawScenarioOverrides)) {
    return rawScenarioOverrides;
  }

  return Object.fromEntries(
    Object.entries(rawScenarioOverrides).map(
      ([backendMethodName, override]) => {
        const replacedOverride = replaceInUnknown(
          override,
          replacements,
        );

        if (!isRecord(replacedOverride)) {
          return [backendMethodName, replacedOverride];
        }

        return [
          backendMethodName,
          {
            ...replacedOverride,
            responseExtractors: replaceExtractorVariableNames(
              replacedOverride.responseExtractors,
              replacements,
              replacementMap,
            ),
          },
        ];
      },
    ),
  );
}

export function replaceVariableNamesInPayload(
  payload: JsonRecord,
  replacements: VariableNameReplacement[],
): JsonRecord {
  if (replacements.length === 0) {
    return payload;
  }

  const replacementMap = new Map(
    replacements.map((replacement) => [
      replacement.from,
      replacement.to,
    ]),
  );

  const replacedPayload = replaceInUnknown(payload, replacements);

  if (!isRecord(replacedPayload)) {
    return payload;
  }

  return {
    ...replacedPayload,
    variables: replacePayloadVariables(
      replacedPayload.variables,
      replacementMap,
    ),
    backendRequests: replacePayloadBackendRequests(
      replacedPayload.backendRequests,
      replacements,
      replacementMap,
    ),
    scenarioOverrides: replacePayloadScenarioOverrides(
      replacedPayload.scenarioOverrides,
      replacements,
      replacementMap,
    ),
  };
}
