package ru.paranomum.test_recorder.back.exception;

public class BackendRequestJsonInvalidException extends RuntimeException {

	public BackendRequestJsonInvalidException(String fieldName) {
		super("Поле «%s» должно содержать валидный JSON".formatted(fieldName));
	}
}