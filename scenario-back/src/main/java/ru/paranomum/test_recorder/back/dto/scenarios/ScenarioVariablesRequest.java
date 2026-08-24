package ru.paranomum.test_recorder.back.dto.scenarios;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;

import java.util.List;

public record ScenarioVariablesRequest(

		@NotNull(message = "Список переменных обязателен")
		List<@Valid ScenarioVariableRequest> variables
) {
}