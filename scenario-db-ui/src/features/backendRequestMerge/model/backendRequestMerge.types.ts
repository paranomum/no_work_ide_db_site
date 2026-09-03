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
  importedScenarioDefaultValue: string;
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


export type BackendDiffState =
  | 'same'
  | 'different'
  | 'only-left'
  | 'only-right';


export interface JsonDiffLine {
  line: string;
  state: BackendDiffState;
}


export interface BackendFormDataDiffRow {
  key: string;
  occurrence: number;
  existingValue: string | null;
  importedValue: string | null;
  state: BackendDiffState;
}


export interface BackendCollectionDiffRow<T> {
  key: string;
  existing: T | null;
  imported: T | null;
  state: BackendDiffState;
}


export type BackendRequestVariableUsageLocationKind =
  | 'url'
  | 'request-body'
  | 'request-header'
  | 'token'
  | 'form-data'
  | 'field-override'
  | 'response-extractor';


export interface BackendRequestVariableUsageLocation {
  kind: BackendRequestVariableUsageLocationKind;
  label: string;
  value: string;
}


export type UseExistingVariableKind =
  | 'manual'
  | 'response-extractor';


export interface ExistingScenarioVariableSnapshot {
  name: string;
  defaultValue: string;
  position: number;
  sources: Array<
    | 'variables'
    | 'backendRequest'
    | 'fieldOverride'
    | 'responseExtractor'
  >;
}


export interface UseExistingVariableIssue {
  id: string;
  requiredVariableName: string;
  variableKind: UseExistingVariableKind;
  existingMethodUsages: BackendRequestVariableUsageLocation[];
  importedMethodUsages: BackendRequestVariableUsageLocation[];
  existingScenarioVariable: ExistingScenarioVariableSnapshot | null;
  extractorFieldPaths: string[];
  suggestedDefaultValue: string;
}


export type UseExistingVariableDecisionKind =
  | 'keep-existing'
  | 'rename-existing-and-create-new'
  | 'create-new'
  | 'auto-create-extractor';


export interface KeepExistingVariableDecision {
  issueId: string;
  kind: 'keep-existing';
}


export interface RenameExistingAndCreateNewVariableDecision {
  issueId: string;
  kind: 'rename-existing-and-create-new';
  renamedExistingVariableName: string;
  newVariableDefaultValue: string;
}


export interface CreateNewVariableDecision {
  issueId: string;
  kind: 'create-new';
  newVariableDefaultValue: string;
}


export interface AutoCreateExtractorVariableDecision {
  issueId: string;
  kind: 'auto-create-extractor';
}


export type UseExistingVariableDecision =
  | KeepExistingVariableDecision
  | RenameExistingAndCreateNewVariableDecision
  | CreateNewVariableDecision
  | AutoCreateExtractorVariableDecision;


export interface UseExistingBackendRequestDraft {
  existingBackendRequestId: number;
  importedBackendRequestName: string;
  issues: UseExistingVariableIssue[];
  decisions: UseExistingVariableDecision[];
}
