import { http } from '../../../shared/api/http';
import type {
  ScenarioResponse,
} from '../../../shared/types/scenario';
import type {
  PersistScenarioImportInput,
} from './scenarioImport.types';


export async function persistScenarioImport({
  payload,
  backendResolutions,
  variableResolutions,
  customMethodResolutions,
  values,
}: PersistScenarioImportInput): Promise<ScenarioResponse> {
  const { data } = await http.post<ScenarioResponse>(
    '/scenarios/import',
    {
      payload,
      backendResolutions,
      variableResolutions,
      customMethodResolutions,
      values,
    },
  );

  return data;
}
