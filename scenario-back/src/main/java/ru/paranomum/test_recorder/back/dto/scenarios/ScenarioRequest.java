package ru.paranomum.test_recorder.back.dto.scenarios;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ScenarioRequest(

		@NotBlank(message = "Название сценария обязательно")
		@Size(
				max = 255,
				message = "Название сценария не должно быть длиннее 255 символов"
		)
		String name,

		@Size(
				max = 2000,
				message = "Описание сценария не должно быть длиннее 2000 символов"
		)
		String description,

		@NotBlank(message = "JSON сценария обязателен")
		String scenarioPayloadJson
) {
}