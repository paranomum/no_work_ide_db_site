package ru.paranomum.test_recorder.back.dto.backendrequests.merge;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

public record ScenarioVariableMigrationValueRequest(
		@NotNull(message = "ID сценария обязателен")
		@Positive(message = "ID сценария должен быть положительным")
		Long scenarioId,

		@NotNull(message = "Значение по умолчанию обязательно")
		String defaultValue
) {
}