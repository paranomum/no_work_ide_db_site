import {
  areBackendRequestsEqual,
} from './importedBackendRequest';
import type {
  BackendRequestDto,
} from './backendRequestMerge.types';
import type {
  BackendRequestImportState,
  BackendRequestResolution,
} from './backendRequestImport.types';

function getRequestByName(
  requests: BackendRequestDto[],
  name: string,
): BackendRequestDto | undefined {
  return requests.find(
    (request) =>
      request.name.toLocaleLowerCase('ru-RU') ===
      name.toLocaleLowerCase('ru-RU'),
  );
}

export function createBackendRequestImportState(
  importedRequests: BackendRequestDto[],
  existingRequests: BackendRequestDto[],
): BackendRequestImportState {
  const resolutions: BackendRequestResolution[] = [];
  const pendingConflicts: BackendRequestDto[] = [];

  importedRequests.forEach((importedRequest) => {
    const existingRequest = getRequestByName(
      existingRequests,
      importedRequest.name,
    );

    if (!existingRequest) {
      resolutions.push({
        importedRequest,
        resolvedRequest: importedRequest,
        kind: 'new',
      });
      return;
    }

    if (areBackendRequestsEqual(existingRequest, importedRequest)) {
      resolutions.push({
        importedRequest,
        resolvedRequest: existingRequest,
        kind: 'existing',
      });
      return;
    }

    pendingConflicts.push(importedRequest);
  });

  const activeConflict = pendingConflicts[0] ?? null;

  return {
    resolutions,
    pendingConflicts,
    activeConflict,
    existingConflictRequest: activeConflict
      ? getRequestByName(existingRequests, activeConflict.name) ?? null
      : null,
  };
}

export function getNextAvailableMethodName(
  sourceName: string,
  existingRequests: BackendRequestDto[],
  resolutions: BackendRequestResolution[],
): string {
  const usedNames = new Set(
    [
      ...existingRequests.map((item) => item.name),
      ...resolutions.map((item) => item.resolvedRequest.name),
    ].map((name) => name.toLocaleLowerCase('ru-RU')),
  );

  let suffix = 2;
  let candidate = `${sourceName} (${suffix})`;

  while (usedNames.has(candidate.toLocaleLowerCase('ru-RU'))) {
    suffix += 1;
    candidate = `${sourceName} (${suffix})`;
  }

  return candidate;
}

export function resolveBackendRequestConflict(
  state: BackendRequestImportState,
  resolution: BackendRequestResolution,
  existingRequests: BackendRequestDto[],
): BackendRequestImportState {
  const activeConflict = state.activeConflict;

  if (!activeConflict) {
    return state;
  }

  const pendingConflicts = state.pendingConflicts.filter(
    (request) => request !== activeConflict,
  );

  const nextActiveConflict = pendingConflicts[0] ?? null;

  return {
    resolutions: [...state.resolutions, resolution],
    pendingConflicts,
    activeConflict: nextActiveConflict,
    existingConflictRequest: nextActiveConflict
      ? getRequestByName(
          existingRequests,
          nextActiveConflict.name,
        ) ?? null
      : null,
  };
}
