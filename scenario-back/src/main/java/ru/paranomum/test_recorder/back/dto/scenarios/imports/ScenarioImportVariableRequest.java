package ru.paranomum.test_recorder.back.dto.scenarios.imports;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

public record ScenarioImportVariableRequest(
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

		boolean isUserVariable,

		@NotNull(message = "Значение переменной обязательно")
		String defaultValue,

		@NotNull(message = "Позиция переменной обязательна")
		@PositiveOrZero(message = "Позиция переменной не может быть отрицательной")
		Integer position
) {
}