export type BackendRequestBodyType =
  | 'NONE'
  | 'JSON'
  | 'FORM_URLENCODED'
  | 'FORM_DATA'
  | 'RAW';

export interface BackendFieldOverride {
  fieldPath: string;
  method: string;
  methodArg: string;
  type: string;
}

export interface BackendResponseExtractor {
  fieldPath: string;
  variableName: string;
}

export interface BackendFormDataItem {
  key: string;
  value: string;
}

export interface BackendRequestDto {
  id?: number;
  name: string;
  url: string;
  httpMethod: string;
  requestBody: string | null;
  requestHeadersJson: string;
  capturedResponseBody: string | null;
  token: string;
  bodyType: BackendRequestBodyType | string;
  formDataJson: string;
  fieldOverridesJson: string;
  responseExtractorsJson: string;
}

export interface BackendRequestUsageScenario {
  scenarioId: number;
  scenarioName: string | null;
}

export interface BackendRequestUsage {
  backendRequestId: number;
  backendRequestName: string;
  scenarios: BackendRequestUsageScenario[];
}

export type ImportedVariableKind = 'user' | 'scenario';

export interface ScenarioVariableDefinition {
  name: string;
  description: string;
  isUserVariable: boolean;
}

export interface ScenarioVariableMigrationValue {
  scenarioId: number;
  defaultValue: string;
}

export interface ScenarioVariableMigration {
  variable: ScenarioVariableDefinition;
  scenarioValues: ScenarioVariableMigrationValue[];
}

export interface BackendRequestMergePayload {
  backendRequest: Omit<BackendRequestDto, 'id'>;
  scenarioVariableMigrations: ScenarioVariableMigration[];
}

export type BackendRequestConflictAction =
  | 'cancel'
  | 'use-existing'
  | 'rename-imported'
  | 'merge';

export interface BackendRequestConflictResult {
  action: BackendRequestConflictAction;
  importedName?: string;
}

export interface JsonDiffLine {
  line: string;
  state: 'same' | 'different' | 'only-left' | 'only-right';
}
