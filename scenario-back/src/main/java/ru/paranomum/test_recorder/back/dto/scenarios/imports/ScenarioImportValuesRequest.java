package ru.paranomum.test_recorder.back.dto.scenarios.imports;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.List;

public record ScenarioImportValuesRequest(
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

		@NotNull(message = "Список тегов обязателен")
		List<@NotNull Long> tagIds
) {
}