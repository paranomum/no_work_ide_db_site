package ru.paranomum.test_recorder.back.dto.scenarios;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import java.util.List;

public record ScenarioBackendRequestsRequest(

		@NotNull(message = "Список backend-запросов обязателен")
		List<@NotNull @Positive(message = "ID backend-запроса должен быть положительным") Long> backendRequestIds
) {
}