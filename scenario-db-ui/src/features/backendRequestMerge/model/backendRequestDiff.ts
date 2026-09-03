import type {
  BackendDiffState,
  BackendFieldOverride,
  BackendFormDataDiffRow,
  BackendFormDataItem,
  BackendRequestDto,
  BackendResponseExtractor,
  JsonDiffLine,
  BackendCollectionDiffRow,
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

export function beautifyJson(
  value: string | null | undefined,
): string {
  return formatJson(value);
}

export function parseFormDataJson(
  value: string | null | undefined,
): BackendFormDataItem[] {
  if (!value?.trim()) {
    return [];
  }

  try {
    const parsedValue: unknown = JSON.parse(value);

    if (!Array.isArray(parsedValue)) {
      return [];
    }

    return parsedValue.filter(isBackendFormDataItem);
  } catch {
    return [];
  }
}

export function stringifyFormData(
  items: BackendFormDataItem[],
): string {
  return JSON.stringify(items);
}

interface IndexedFormDataItem extends BackendFormDataItem {
  occurrence: number;
}

function indexFormDataItems(
  items: BackendFormDataItem[],
): IndexedFormDataItem[] {
  const occurrencesByKey = new Map<string, number>();

  return items.map((item) => {
    const normalizedKey = item.key.trim();
    const occurrence = occurrencesByKey.get(normalizedKey) ?? 0;

    occurrencesByKey.set(normalizedKey, occurrence + 1);

    return {
      ...item,
      key: normalizedKey,
      occurrence,
    };
  });
}

function getFormDataIdentity(item: IndexedFormDataItem): string {
  return `${item.key}\u0000${item.occurrence}`;
}

/**
 * Сравнивает FormData по имени поля.
 *
 * - Поля с одинаковым key сравниваются по value.
 * - Повторяющиеся key сопоставляются по порядку их появления.
 * - Поле только в существующем запросе получает only-left.
 * - Поле только в импортируемом запросе получает only-right.
 * - Порядок разных ключей не влияет на сопоставление.
 */
export function getFormDataDiff(
  existingValue: string | null | undefined,
  importedValue: string | null | undefined,
): BackendFormDataDiffRow[] {
  const existingItems = indexFormDataItems(
    parseFormDataJson(existingValue),
  );

  const importedItems = indexFormDataItems(
    parseFormDataJson(importedValue),
  );

  const existingByIdentity = new Map(
    existingItems.map((item) => [getFormDataIdentity(item), item]),
  );

  const importedByIdentity = new Map(
    importedItems.map((item) => [getFormDataIdentity(item), item]),
  );

  /*
   * Сначала сохраняем порядок полей существующего метода.
   * Новые поля импортируемого метода добавляем в конец.
   */
  const identities = [
    ...existingItems.map(getFormDataIdentity),
    ...importedItems
      .map(getFormDataIdentity)
      .filter((identity) => !existingByIdentity.has(identity)),
  ];

  return identities
  .map((identity): BackendFormDataDiffRow => {
    const existingItem = existingByIdentity.get(identity);
    const importedItem = importedByIdentity.get(identity);
    const item = existingItem ?? importedItem;

    if (!item) {
      throw new Error('Не удалось построить строку сравнения form-data');
    }

    let state: BackendDiffState = 'same';

    if (!existingItem) {
      state = 'only-right';
    } else if (!importedItem) {
      state = 'only-left';
    } else if (existingItem.value !== importedItem.value) {
      state = 'different';
    }

            return {
        key: item.key,
        occurrence: item.occurrence,
        existingValue: existingItem?.value ?? null,
        importedValue: importedItem?.value ?? null,
        state,
      };
    })
    .sort((left, right) => {
      const keyComparison = left.key.localeCompare(
        right.key,
        'ru-RU',
      );

      if (keyComparison !== 0) {
        return keyComparison;
      }

      return left.occurrence - right.occurrence;
    });
}

function getCollectionDiff<T>(
  existingItems: T[],
  importedItems: T[],
  getKey: (item: T) => string,
  isEqual: (existing: T, imported: T) => boolean,
): BackendCollectionDiffRow<T>[] {
  const existingByKey = new Map(
    existingItems.map((item) => [getKey(item), item]),
  );

  const importedByKey = new Map(
    importedItems.map((item) => [getKey(item), item]),
  );

  const keys = [
    ...existingItems.map(getKey),
    ...importedItems
      .map(getKey)
      .filter((key) => !existingByKey.has(key)),
  ];

  return keys
  .map((key): BackendCollectionDiffRow<T> => {
    const existing = existingByKey.get(key) ?? null;
    const imported = importedByKey.get(key) ?? null;

    let state: BackendDiffState = 'same';

    if (!existing) {
      state = 'only-right';
    } else if (!imported) {
      state = 'only-left';
    } else if (!isEqual(existing, imported)) {
      state = 'different';
    }

          return {
        key,
        existing,
        imported,
        state,
      };
    })
    .sort((left, right) =>
      left.key.localeCompare(right.key, 'ru-RU'),
    );
}

export function getFieldOverridesDiff(
  existingRequest: BackendRequestDto,
  importedRequest: BackendRequestDto,
): BackendCollectionDiffRow<BackendFieldOverride>[] {
  return getCollectionDiff(
    parseFieldOverrides(existingRequest),
    parseFieldOverrides(importedRequest),
    (item) => item.fieldPath,
    (existing, imported) =>
      existing.method === imported.method &&
      existing.methodArg === imported.methodArg &&
      existing.type === imported.type,
  );
}

export function getResponseExtractorsDiff(
  existingRequest: BackendRequestDto,
  importedRequest: BackendRequestDto,
): BackendCollectionDiffRow<BackendResponseExtractor>[] {
  return getCollectionDiff(
    parseResponseExtractors(existingRequest),
    parseResponseExtractors(importedRequest),
    (item) => item.fieldPath,
    (existing, imported) =>
      existing.variableName === imported.variableName,
  );
}

export function getFormDataKeys(
  value: string | null | undefined,
): string[] {
  const uniqueKeys = new Set<string>();

  return parseFormDataJson(value)
    .map((item) => item.key.trim())
    .filter((key) => {
      if (!key || uniqueKeys.has(key)) {
        return false;
      }

      uniqueKeys.add(key);
      return true;
    });
}

export function extractJsonLeafPaths(
  value: string | null | undefined,
): string[] {
  if (!value?.trim()) {
    return [];
  }

  try {
    const parsedValue: unknown = JSON.parse(value);
    const result: string[] = [];

    collectJsonLeafPaths(parsedValue, '', result);

    return Array.from(new Set(result));
  } catch {
    return [];
  }
}

function isBackendFormDataItem(
  value: unknown,
): value is BackendFormDataItem {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as BackendFormDataItem).key === 'string' &&
    typeof (value as BackendFormDataItem).value === 'string'
  );
}

function collectJsonLeafPaths(
  value: unknown,
  prefix: string,
  result: string[],
): void {
  if (
    value === null ||
    typeof value !== 'object'
  ) {
    if (prefix) {
      result.push(prefix);
    }

    return;
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      if (prefix) {
        result.push(prefix);
      }

      return;
    }

    const itemPath = prefix ? `${prefix}[0]` : '[0]';

    collectJsonLeafPaths(value[0], itemPath, result);
    return;
  }

  const entries = Object.entries(value);

  if (entries.length === 0) {
    if (prefix) {
      result.push(prefix);
    }

    return;
  }

  entries.forEach(([key, nestedValue]) => {
    const path = prefix ? `${prefix}.${key}` : key;

    collectJsonLeafPaths(nestedValue, path, result);
  });
}
