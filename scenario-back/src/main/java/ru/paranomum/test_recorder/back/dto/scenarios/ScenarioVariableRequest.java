package ru.paranomum.test_recorder.back.dto.scenarios;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;

public record ScenarioVariableRequest(

		@NotNull(message = "ID переменной обязателен")
		Long variableId,

		@NotNull(message = "Позиция переменной обязательна")
		@PositiveOrZero(message = "Позиция переменной не может быть отрицательной")
		Integer position
) {
}