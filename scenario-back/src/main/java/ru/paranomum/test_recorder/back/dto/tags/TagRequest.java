package ru.paranomum.test_recorder.back.dto.tags;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record TagRequest(

		@NotBlank(message = "Название тега обязательно")
		@Size(
				max = 100,
				message = "Название тега не должно быть длиннее 100 символов"
		)
		String name,

		@NotBlank(message = "Цвет тега обязателен")
		@Pattern(
				regexp = "^#[0-9A-Fa-f]{6}$",
				message = "Цвет должен быть в формате #RRGGBB"
		)
		String color
) {
}