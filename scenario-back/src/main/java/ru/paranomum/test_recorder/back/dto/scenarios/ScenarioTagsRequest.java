package ru.paranomum.test_recorder.back.dto.scenarios;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import java.util.List;

public record ScenarioTagsRequest(

		@NotNull(message = "Список тегов обязателен")
		List<
				@NotNull
				@Positive(message = "ID тега должен быть положительным")
						Long
				> tagIds
) {
}