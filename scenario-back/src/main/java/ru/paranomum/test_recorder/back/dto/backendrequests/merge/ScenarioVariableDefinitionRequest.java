package ru.paranomum.test_recorder.back.dto.backendrequests.merge;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ScenarioVariableDefinitionRequest(
		@NotBlank(message = "Название переменной обязательно")
		@Size(
				max = 255,
				message = "Название переменной не должно быть длиннее 255 символов"
		)
		String name,

		@Size(
				max = 1000,
				message = "Описание переменной не должно быть длиннее 1000 символов"
		)
		String description,

		boolean isUserVariable
) {
}