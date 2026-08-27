import type {
  BackendFieldOverride,
  BackendRequestDto,
  BackendResponseExtractor,
  JsonDiffLine,
} from './backendRequestMerge.types';

function formatJson(value: string | null | undefined): string {
  if (!value || !value.trim()) {
    return '';
  }

  try {
    return JSON.stringify(JSON.parse(value), null, 2);
  } catch {
    return value;
  }
}

export function getJsonDiff(
  leftValue: string | null | undefined,
  rightValue: string | null | undefined,
): {
  leftLines: JsonDiffLine[];
  rightLines: JsonDiffLine[];
} {
  const leftLines = formatJson(leftValue).split('\n');
  const rightLines = formatJson(rightValue).split('\n');
  const maxLength = Math.max(leftLines.length, rightLines.length);

  const leftResult: JsonDiffLine[] = [];
  const rightResult: JsonDiffLine[] = [];

  for (let index = 0; index < maxLength; index += 1) {
    const leftLine = leftLines[index];
    const rightLine = rightLines[index];

    if (leftLine === undefined) {
      leftResult.push({
        line: '',
        state: 'only-right',
      });

      rightResult.push({
        line: rightLine ?? '',
        state: 'only-right',
      });

      continue;
    }

    if (rightLine === undefined) {
      leftResult.push({
        line: leftLine,
        state: 'only-left',
      });

      rightResult.push({
        line: '',
        state: 'only-left',
      });

      continue;
    }

    const state = leftLine === rightLine ? 'same' : 'different';

    leftResult.push({
      line: leftLine,
      state,
    });

    rightResult.push({
      line: rightLine,
      state,
    });
  }

  return {
    leftLines: leftResult,
    rightLines: rightResult,
  };
}

export function parseFieldOverrides(
  request: BackendRequestDto,
): BackendFieldOverride[] {
  try {
    const value: unknown = JSON.parse(request.fieldOverridesJson);

    return Array.isArray(value)
      ? value.filter(isBackendFieldOverride)
      : [];
  } catch {
    return [];
  }
}

export function parseResponseExtractors(
  request: BackendRequestDto,
): BackendResponseExtractor[] {
  try {
    const value: unknown = JSON.parse(request.responseExtractorsJson);

    return Array.isArray(value)
      ? value.filter(isBackendResponseExtractor)
      : [];
  } catch {
    return [];
  }
}

export function getDifferentSettings(
  existing: BackendRequestDto,
  imported: BackendRequestDto,
): string[] {
  const fields: Array<keyof BackendRequestDto> = [
    'url',
    'httpMethod',
    'bodyType',
    'token',
  ];

  return fields
    .filter((field) => existing[field] !== imported[field])
    .map((field) => String(field));
}

function isBackendFieldOverride(
  value: unknown,
): value is BackendFieldOverride {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as BackendFieldOverride).fieldPath === 'string' &&
    typeof (value as BackendFieldOverride).method === 'string' &&
    typeof (value as BackendFieldOverride).methodArg === 'string' &&
    typeof (value as BackendFieldOverride).type === 'string'
  );
}

function isBackendResponseExtractor(
  value: unknown,
): value is BackendResponseExtractor {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as BackendResponseExtractor).fieldPath === 'string' &&
    typeof (value as BackendResponseExtractor).variableName ===
      'string'
  );
}
