package ru.paranomum.test_recorder.back.dto.scenarios.imports;

import com.fasterxml.jackson.databind.JsonNode;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;

import java.util.List;

public record ScenarioImportRequest(
		@NotNull(message = "Payload сценария обязателен")
		JsonNode payload,

		@NotNull(message = "Список решений backend-методов обязателен")
		List<@NotNull @Valid ScenarioImportBackendResolutionRequest>
				backendResolutions,

		@NotNull(message = "Список решений переменных обязателен")
		List<@NotNull @Valid ScenarioImportVariableResolutionRequest>
				variableResolutions,

		@NotNull(message = "Список решений custom methods обязателен")
		List<@NotNull @Valid ScenarioImportCustomMethodResolutionRequest>
				customMethodResolutions,

		@NotNull(message = "Данные сценария обязательны")
		@Valid ScenarioImportValuesRequest values
) {
}