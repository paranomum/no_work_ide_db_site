import { http } from '../../../shared/api/http';
import type {
  ScenarioResponse,
} from '../../../shared/types/scenario';
import type {
  PersistScenarioImportInput,
} from './scenarioImport.types';

import type {
  BackendRequestDto,
  ScenarioVariableMigration,
} from '../../backendRequestMerge/model/backendRequestMerge.types';
import type {
  BackendRequestResolution,
} from '../../backendRequestMerge/model/backendRequestImport.types';

interface ScenarioImportCustomMethodResolutionRequest {
  importedCustomMethodName: string;
  kind: 'existing' | 'selected-existing';
  targetScenarioId: number;
}

interface ScenarioImportVariableResolutionRequest {
  importedVariable: {
    name: string;
    defaultValue: string;
    isUserVariable: boolean;
    position: number;
  };
  kind: 'existing' | 'selected-existing' | 'create-new-user';
  targetVariableId: number | null;
}

interface ScenarioImportBackendRequestPayload {
  name: string;
  url: string;
  httpMethod: string;
  requestBody: string | null;
  requestHeadersJson: string;
  capturedResponseBody: string | null;
  token: string;
  bodyType: string;
  formDataJson: string;
  fieldOverridesJson: string;
  responseExtractorsJson: string;
}

interface ScenarioImportBackendMergeDraftRequest {
  backendRequest: ScenarioImportBackendRequestPayload;
  scenarioVariableMigrations: ScenarioVariableMigration[];
}

interface ScenarioImportBackendResolutionRequest {
  kind: 'new' | 'existing' | 'renamed' | 'merged';
  resolvedRequest: ScenarioImportBackendRequestPayload;
  existingBackendRequestId: number | null;
  mergeDraft: ScenarioImportBackendMergeDraftRequest | null;
}

function toBackendRequestPayload(
  request: BackendRequestDto,
): ScenarioImportBackendRequestPayload {
  return {
    name: request.name,
    url: request.url,
    httpMethod: request.httpMethod,
    requestBody: request.requestBody,
    requestHeadersJson: request.requestHeadersJson,
    capturedResponseBody: request.capturedResponseBody,
    token: request.token,
    bodyType: String(request.bodyType),
    formDataJson: request.formDataJson,
    fieldOverridesJson: request.fieldOverridesJson,
    responseExtractorsJson: request.responseExtractorsJson,
  };
}

function toBackendResolutionRequest(
  resolution: BackendRequestResolution,
): ScenarioImportBackendResolutionRequest {
  const existingBackendRequestId =
    resolution.kind === 'existing' || resolution.kind === 'merged'
      ? resolution.resolvedRequest.id ?? null
      : null;

  if (
    (resolution.kind === 'existing' || resolution.kind === 'merged') &&
    typeof existingBackendRequestId !== 'number'
  ) {
    throw new Error(
      `Для backend-метода «${resolution.resolvedRequest.name}» отсутствует ID существующего метода`,
    );
  }

  if (resolution.kind === 'merged' && !resolution.mergeDraft) {
    throw new Error(
      `Для объединённого backend-метода «${resolution.resolvedRequest.name}» отсутствует merge draft`,
    );
  }

  return {
    kind: resolution.kind,
    resolvedRequest: toBackendRequestPayload(
      resolution.resolvedRequest,
    ),
    existingBackendRequestId,
    mergeDraft: resolution.mergeDraft
      ? {
          backendRequest: toBackendRequestPayload(
            resolution.mergeDraft.mergedRequest,
          ),
          scenarioVariableMigrations:
            resolution.mergeDraft.scenarioVariableMigrations,
        }
      : null,
  };
}

export async function persistScenarioImport({
  payload,
  backendResolutions,
  variableResolutions,
  customMethodResolutions,
  values,
}: PersistScenarioImportInput): Promise<ScenarioResponse> {
  const resolvedCustomMethodResolutions =
    customMethodResolutions.map((resolution) => {
      const importedCustomMethodName =
        resolution.importedCustomMethod.name.trim();

      const targetScenarioId = resolution.targetScenario?.id;

      if (!importedCustomMethodName) {
        throw new Error(
          'Не задано имя импортируемого custom method',
        );
      }

      if (
        resolution.kind === 'unresolved' ||
        typeof targetScenarioId !== 'number'
      ) {
        throw new Error(
          `Не выбран сценарий для custom method «${importedCustomMethodName}»`,
        );
      }

      return {
        importedCustomMethodName,
        kind: resolution.kind,
        targetScenarioId,
      } satisfies ScenarioImportCustomMethodResolutionRequest;
    });

  const resolvedVariableResolutions = variableResolutions.map(
    (resolution) => {
      const { importedVariable } = resolution;

      if (resolution.kind === 'unresolved') {
        throw new Error(
          `Не разрешена переменная «${importedVariable.name}»`,
        );
      }

      if (!importedVariable.isUserVariable) {
        return {
          importedVariable: {
            name: importedVariable.name,
            defaultValue: importedVariable.defaultValue,
            isUserVariable: false,
            position: importedVariable.position,
          },
          kind: 'existing',
          targetVariableId: null,
        } satisfies ScenarioImportVariableResolutionRequest;
      }

      if (
        resolution.kind === 'existing' ||
        resolution.kind === 'selected-existing'
      ) {
        const targetVariableId = resolution.targetVariable?.id;

        if (typeof targetVariableId !== 'number') {
          throw new Error(
            `Не выбрана существующая пользовательская переменная для «${importedVariable.name}»`,
          );
        }

        return {
          importedVariable: {
            name: importedVariable.name,
            defaultValue: importedVariable.defaultValue,
            isUserVariable: true,
            position: importedVariable.position,
          },
          kind: resolution.kind,
          targetVariableId,
        } satisfies ScenarioImportVariableResolutionRequest;
      }

      if (resolution.kind === 'create-new-user') {
        return {
          importedVariable: {
            name: importedVariable.name,
            defaultValue: importedVariable.defaultValue,
            isUserVariable: true,
            position: importedVariable.position,
          },
          kind: 'create-new-user',
          targetVariableId: null,
        } satisfies ScenarioImportVariableResolutionRequest;
      }

      throw new Error(
        `Неподдерживаемый тип решения переменной: ${resolution.kind}`,
      );
    },
  );

  const resolvedBackendResolutions =
    backendResolutions.map(toBackendResolutionRequest);

  const { data } = await http.post<ScenarioResponse>(
    '/scenarios/import',
    {
      payload,
      backendResolutions: resolvedBackendResolutions,
      variableResolutions: resolvedVariableResolutions,
      customMethodResolutions: resolvedCustomMethodResolutions,
      values,
    },
  );

  return data;
}
