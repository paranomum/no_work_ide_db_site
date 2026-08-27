import { http } from '../../../shared/api/http';
import {
  mergeBackendRequest,
} from '../api/backendRequestMergeApi';
import type {
  BackendRequestDto,
  BackendRequestMergePayload,
} from './backendRequestMerge.types';
import type {
  BackendRequestResolution,
} from './backendRequestImport.types';

export async function persistBackendRequests(
  resolutions: BackendRequestResolution[],
): Promise<BackendRequestResolution[]> {
  const persistedResolutions = resolutions.map((resolution) => ({
    ...resolution,
    importedRequest: {
      ...resolution.importedRequest,
    },
    resolvedRequest: {
      ...resolution.resolvedRequest,
    },
    mergeDraft: resolution.mergeDraft
      ? {
          mergedRequest: {
            ...resolution.mergeDraft.mergedRequest,
          },
          scenarioVariableMigrations: [
            ...resolution.mergeDraft.scenarioVariableMigrations,
          ],
        }
      : undefined,
  }));

  for (const resolution of persistedResolutions) {
    if (resolution.kind !== 'merged') {
      continue;
    }

    if (!resolution.mergeDraft) {
      throw new Error(
        `Для объединённого backend-метода «${resolution.resolvedRequest.name}» отсутствует черновик объединения`,
      );
    }

    const { mergedRequest, scenarioVariableMigrations } =
      resolution.mergeDraft;

    if (typeof mergedRequest.id !== 'number') {
      throw new Error(
        `У объединённого backend-метода «${mergedRequest.name}» нет ID`,
      );
    }

    const { id: _ignoredId, ...backendRequest } = mergedRequest;

    const mergePayload: BackendRequestMergePayload = {
      backendRequest,
      scenarioVariableMigrations,
    };

    const updatedRequest = await mergeBackendRequest(
      mergedRequest.id,
      mergePayload,
    );

    resolution.resolvedRequest = updatedRequest;
  }

  for (const resolution of persistedResolutions) {
    if (
      resolution.kind !== 'new' &&
      resolution.kind !== 'renamed'
    ) {
      continue;
    }

    const { id: _ignoredId, ...requestPayload } =
      resolution.resolvedRequest;

    const { data } = await http.post<BackendRequestDto>(
      '/backend-requests',
      requestPayload,
    );

    resolution.resolvedRequest = data;
  }

  return persistedResolutions;
}

export function getBackendRequestIds(
  resolutions: BackendRequestResolution[],
): number[] {
  const ids: number[] = [];

  resolutions.forEach((resolution) => {
    const { id } = resolution.resolvedRequest;

    if (typeof id !== 'number') {
      throw new Error(
        `Не удалось получить ID backend-метода «${resolution.resolvedRequest.name}»`,
      );
    }

    ids.push(id);
  });

  return Array.from(new Set(ids));
}

export function getBackendMethodNameReplacements(
  resolutions: BackendRequestResolution[],
): Array<{ from: string; to: string }> {
  return resolutions
    .filter(
      (resolution) =>
        resolution.importedRequest.name !==
        resolution.resolvedRequest.name,
    )
    .map((resolution) => ({
      from: resolution.importedRequest.name,
      to: resolution.resolvedRequest.name,
    }));
}
