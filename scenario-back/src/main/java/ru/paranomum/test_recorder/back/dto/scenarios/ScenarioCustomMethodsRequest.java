package ru.paranomum.test_recorder.back.dto.scenarios;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import java.util.List;

public record ScenarioCustomMethodsRequest(

		@NotNull(message = "Список custom methods обязателен")
		List<
				@NotNull
				@Positive(message = "ID сценария должен быть положительным")
						Long
				> targetScenarioIds
) {
}