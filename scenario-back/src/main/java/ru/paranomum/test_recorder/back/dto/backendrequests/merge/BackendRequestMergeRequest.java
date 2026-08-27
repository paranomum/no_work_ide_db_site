package ru.paranomum.test_recorder.back.dto.backendrequests.merge;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import ru.paranomum.test_recorder.back.dto.backendrequests.BackendRequestRequest;

import java.util.List;

public record BackendRequestMergeRequest(
		@NotNull(message = "Итоговый backend-запрос обязателен")
		@Valid BackendRequestRequest backendRequest,

		@NotNull(message = "Список миграций переменных обязателен")
		List<@NotNull @Valid ScenarioVariableMigrationRequest>
				scenarioVariableMigrations
) {
}