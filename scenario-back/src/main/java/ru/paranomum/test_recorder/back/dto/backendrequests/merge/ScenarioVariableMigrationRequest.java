package ru.paranomum.test_recorder.back.dto.backendrequests.merge;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;

import java.util.List;

public record ScenarioVariableMigrationRequest(
		@NotNull(message = "Описание переменной обязательно")
		@Valid ScenarioVariableDefinitionRequest variable,

		@NotNull(message = "Значения переменной для сценариев обязательны")
		List<@NotNull @Valid ScenarioVariableMigrationValueRequest>
				scenarioValues
) {
}