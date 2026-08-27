import { http } from '../../../shared/api/http';
import type {
  BackendRequestDto,
  BackendRequestMergePayload,
  BackendRequestUsage,
} from '../model/backendRequestMerge.types';

export async function loadBackendRequestUsage(
  backendRequestId: number,
): Promise<BackendRequestUsage> {
  const { data } = await http.get<BackendRequestUsage>(
    `/backend-requests/${backendRequestId}/usage`,
  );

  return data;
}

export async function loadBackendRequest(
  backendRequestId: number,
): Promise<BackendRequestDto> {
  const { data } = await http.get<BackendRequestDto>(
    `/backend-requests/${backendRequestId}`,
  );

  return data;
}

export async function mergeBackendRequest(
  backendRequestId: number,
  payload: BackendRequestMergePayload,
): Promise<BackendRequestDto> {
  const { data } = await http.put<BackendRequestDto>(
    `/backend-requests/${backendRequestId}/merge`,
    payload,
  );

  return data;
}
