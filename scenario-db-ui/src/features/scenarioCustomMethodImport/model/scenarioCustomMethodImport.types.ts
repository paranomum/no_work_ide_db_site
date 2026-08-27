import type { ScenarioResponse } from '../../../shared/types/scenario';
import type { ImportedScenarioCustomMethod } from './importedScenarioCustomMethod';

export type ScenarioCustomMethodResolutionKind =
  | 'existing'
  | 'selected-existing'
  | 'unresolved';

export interface ScenarioCustomMethodResolution {
  importedCustomMethod: ImportedScenarioCustomMethod;
  targetScenario: ScenarioResponse | null;
  kind: ScenarioCustomMethodResolutionKind;
}
