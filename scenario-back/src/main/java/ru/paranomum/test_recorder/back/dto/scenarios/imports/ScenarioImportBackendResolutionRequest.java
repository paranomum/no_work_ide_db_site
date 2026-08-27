package ru.paranomum.test_recorder.back.dto.scenarios.imports;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import ru.paranomum.test_recorder.back.dto.backendrequests.BackendRequestRequest;
import ru.paranomum.test_recorder.back.dto.backendrequests.merge.BackendRequestMergeRequest;

public record ScenarioImportBackendResolutionRequest(
		@NotBlank(message = "Тип решения backend-метода обязателен")
		String kind,

		@NotNull(message = "Итоговый backend-метод обязателен")
		@Valid BackendRequestRequest resolvedRequest,

		@Positive(message = "ID существующего backend-метода должен быть положительным")
		Long existingBackendRequestId,

		@Valid BackendRequestMergeRequest mergeDraft
) {
}