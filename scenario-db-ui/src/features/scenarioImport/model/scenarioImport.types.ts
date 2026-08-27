import type {
  BackendRequestResolution,
} from '../../backendRequestMerge/model/backendRequestImport.types';
import type {
  ScenarioCustomMethodResolution,
} from '../../scenarioCustomMethodImport/model/scenarioCustomMethodImport.types';
import type {
  VariableResolution,
} from '../../variableImport/model/variableImport.types';

export interface ScenarioImportValues {
  name: string;
  description: string;
  tagIds: number[];
}

export interface PersistScenarioImportInput {
  payload: Record<string, unknown>;
  backendResolutions: BackendRequestResolution[];
  variableResolutions: VariableResolution[];
  customMethodResolutions: ScenarioCustomMethodResolution[];
  values: ScenarioImportValues;
}
