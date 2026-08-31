import type {
  BackendRequestDto,
  ScenarioVariableMigration,
} from './backendRequestMerge.types';
import type {
  BackendRequestResolution,
} from './backendRequestImport.types';

function replaceExpression(
  value: string,
  from: string,
  to: string,
): string {
  return value.replaceAll(`\${${from}}`, `\${${to}}`);
}

function replaceInJson(
  json: string,
  from: string,
  to: string,
  replaceVariableName = false,
): string {
  try {
    const value: unknown = JSON.parse(json);

    const replaceNode = (node: unknown): unknown => {
      if (typeof node === 'string') {
        return replaceExpression(node, from, to);
      }

      if (Array.isArray(node)) {
        return node.map(replaceNode);
      }

      if (typeof node !== 'object' || node === null) {
        return node;
      }

      return Object.fromEntries(
        Object.entries(node).map(([key, item]) => {
          if (
            replaceVariableName &&
            key === 'variableName' &&
            item === from
          ) {
            return [key, to];
          }

          return [key, replaceNode(item)];
        }),
      );
    };

    return JSON.stringify(replaceNode(value));
  } catch {
    return replaceExpression(json, from, to);
  }
}

export function replaceVariableInBackendRequest(
  request: BackendRequestDto,
  from: string,
  to: string,
): BackendRequestDto {
  return {
    ...request,
    url: replaceExpression(request.url, from, to),
    requestBody: request.requestBody
      ? replaceExpression(request.requestBody, from, to)
      : null,
    requestHeadersJson: replaceInJson(
      request.requestHeadersJson,
      from,
      to,
    ),
    capturedResponseBody: request.capturedResponseBody
      ? replaceExpression(request.capturedResponseBody, from, to)
      : null,
    token: replaceExpression(request.token, from, to),
    formDataJson: replaceInJson(
      request.formDataJson,
      from,
      to,
    ),
    fieldOverridesJson: replaceInJson(
      request.fieldOverridesJson,
      from,
      to,
    ),
    responseExtractorsJson: replaceInJson(
      request.responseExtractorsJson,
      from,
      to,
      true,
    ),
  };
}

function replaceVariableInMigration(
  migration: ScenarioVariableMigration,
  from: string,
  to: string,
): ScenarioVariableMigration {
  if (migration.variable.name !== from) {
    return migration;
  }

  return {
    ...migration,
    variable: {
      ...migration.variable,
      name: to,
    },
  };
}

export function replaceVariableInBackendResolution(
  resolution: BackendRequestResolution,
  from: string,
  to: string,
): BackendRequestResolution {
  return {
    ...resolution,
    importedRequest: replaceVariableInBackendRequest(
      resolution.importedRequest,
      from,
      to,
    ),
    resolvedRequest: replaceVariableInBackendRequest(
      resolution.resolvedRequest,
      from,
      to,
    ),
    mergeDraft: resolution.mergeDraft
      ? {
          ...resolution.mergeDraft,
          mergedRequest: replaceVariableInBackendRequest(
            resolution.mergeDraft.mergedRequest,
            from,
            to,
          ),
          scenarioVariableMigrations:
            resolution.mergeDraft.scenarioVariableMigrations.map(
              (migration) =>
                replaceVariableInMigration(migration, from, to),
            ),
        }
      : undefined,
  };
}
