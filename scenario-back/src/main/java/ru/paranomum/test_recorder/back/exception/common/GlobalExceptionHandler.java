package ru.paranomum.test_recorder.back.exception.common;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;

@RestControllerAdvice
public class GlobalExceptionHandler {

	@ExceptionHandler(NotFoundException.class)
	public ResponseEntity<ApiError> handleNotFound(
			NotFoundException exception
	) {
		return buildResponse(
				HttpStatus.NOT_FOUND,
				exception.getMessage(),
				Map.of()
		);
	}

	@ExceptionHandler(ConflictException.class)
	public ResponseEntity<ApiError> handleConflict(
			ConflictException exception
	) {
		return buildResponse(
				HttpStatus.CONFLICT,
				exception.getMessage(),
				Map.of()
		);
	}

	@ExceptionHandler(MethodArgumentNotValidException.class)
	public ResponseEntity<ApiError> handleValidation(
			MethodArgumentNotValidException exception
	) {
		Map<String, String> fieldErrors = new LinkedHashMap<>();

		exception.getBindingResult()
				.getFieldErrors()
				.forEach(error ->
						fieldErrors.put(
								error.getField(),
								error.getDefaultMessage()
						)
				);

		return buildResponse(
				HttpStatus.BAD_REQUEST,
				"Ошибка валидации запроса",
				fieldErrors
		);
	}

	private ResponseEntity<ApiError> buildResponse(
			HttpStatus status,
			String message,
			Map<String, String> fieldErrors
	) {
		ApiError response = new ApiError(
				status.value(),
				status.getReasonPhrase(),
				message,
				Instant.now(),
				fieldErrors
		);

		return ResponseEntity.status(status).body(response);
	}
}
