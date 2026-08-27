import type {
  BackendRequestDto,
  ScenarioVariableMigration,
} from './backendRequestMerge.types';

export type BackendResolutionKind =
  | 'new'
  | 'existing'
  | 'renamed'
  | 'merged';

export interface BackendRequestMergeDraft {
  mergedRequest: BackendRequestDto;
  scenarioVariableMigrations: ScenarioVariableMigration[];
}

export interface BackendRequestResolution {
  importedRequest: BackendRequestDto;
  resolvedRequest: BackendRequestDto;
  kind: BackendResolutionKind;
  mergeDraft?: BackendRequestMergeDraft;
}

export interface BackendRequestImportState {
  resolutions: BackendRequestResolution[];
  pendingConflicts: BackendRequestDto[];
  activeConflict: BackendRequestDto | null;
  existingConflictRequest: BackendRequestDto | null;
}
