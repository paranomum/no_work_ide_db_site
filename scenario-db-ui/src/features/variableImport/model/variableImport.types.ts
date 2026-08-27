import type { VariableDto } from '../../../shared/types/variable';
import type { ImportedScenarioVariable } from './importedScenarioVariable';

export type VariableResolutionKind =
  | 'existing'
  | 'selected-existing'
  | 'create-new-user'
  | 'unresolved';

export interface VariableResolution {
  importedVariable: ImportedScenarioVariable;
  targetVariable: VariableDto | null;
  kind: VariableResolutionKind;
}
