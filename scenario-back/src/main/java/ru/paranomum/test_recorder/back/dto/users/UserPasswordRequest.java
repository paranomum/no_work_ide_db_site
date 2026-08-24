package ru.paranomum.test_recorder.back.dto.users;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record UserPasswordRequest(

		@NotBlank(message = "Пароль обязателен")
		@Size(min = 4, max = 255, message = "Пароль должен содержать от 4 до 255 символов")
		String password
) {
}