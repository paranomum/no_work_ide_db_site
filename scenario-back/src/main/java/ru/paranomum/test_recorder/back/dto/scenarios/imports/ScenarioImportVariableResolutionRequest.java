package ru.paranomum.test_recorder.back.dto.scenarios.imports;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

public record ScenarioImportVariableResolutionRequest(
		@NotNull(message = "Импортируемая переменная обязательна")
		@Valid ScenarioImportVariableRequest importedVariable,

		@NotBlank(message = "Тип решения переменной обязателен")
		String kind,

		@Positive(message = "ID целевой переменной должен быть положительным")
		Long targetVariableId
) {
}