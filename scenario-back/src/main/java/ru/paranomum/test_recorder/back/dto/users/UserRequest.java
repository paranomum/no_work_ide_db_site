package ru.paranomum.test_recorder.back.dto.users;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record UserRequest(

		@NotBlank(message = "Имя пользователя обязательно")
		@Size(max = 255, message = "Имя пользователя не должно быть длиннее 255 символов")
		String name,

		@NotBlank(message = "Логин обязателен")
		@Size(max = 100, message = "Логин не должен быть длиннее 100 символов")
		String username,

		@NotBlank(message = "Пароль обязателен")
		@Size(min = 4, max = 255, message = "Пароль должен содержать от 4 до 255 символов")
		String password
) {
}