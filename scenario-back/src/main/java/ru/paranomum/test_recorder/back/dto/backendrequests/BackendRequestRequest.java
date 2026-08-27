package ru.paranomum.test_recorder.back.dto.backendrequests;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record BackendRequestRequest(

		@NotBlank(message = "Название backend-запроса обязательно")
		@Size(max = 255, message = "Название не должно быть длиннее 255 символов")
		String name,

		@NotBlank(message = "URL backend-запроса обязателен")
		String url,

		@NotBlank(message = "HTTP-метод обязателен")
		@Pattern(
				regexp = "^(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)$",
				message = "Недопустимый HTTP-метод"
		)
		String httpMethod,

		String requestBody,

		String requestHeadersJson,

		String capturedResponseBody,

		String token,

		String bodyType,

		String formDataJson,

		String fieldOverridesJson,

		String responseExtractorsJson
) {
}