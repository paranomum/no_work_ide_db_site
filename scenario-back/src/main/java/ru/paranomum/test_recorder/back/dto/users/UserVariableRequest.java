package ru.paranomum.test_recorder.back.dto.users;

import jakarta.validation.constraints.NotNull;

public record UserVariableRequest(

		@NotNull(message = "Значение переменной обязательно")
		String value
) {
}