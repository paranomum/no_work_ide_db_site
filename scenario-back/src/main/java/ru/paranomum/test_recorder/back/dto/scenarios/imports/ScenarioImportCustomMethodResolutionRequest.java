package ru.paranomum.test_recorder.back.dto.scenarios.imports;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

public record ScenarioImportCustomMethodResolutionRequest(
		@NotBlank(message = "Имя импортируемого custom method обязательно")
		String importedCustomMethodName,

		@NotBlank(message = "Тип решения custom method обязателен")
		String kind,

		@NotNull(message = "ID целевого сценария обязателен")
		@Positive(message = "ID целевого сценария должен быть положительным")
		Long targetScenarioId
) {
}