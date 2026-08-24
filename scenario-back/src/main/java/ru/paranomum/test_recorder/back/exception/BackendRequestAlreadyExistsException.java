package ru.paranomum.test_recorder.back.exception;

public class BackendRequestAlreadyExistsException extends RuntimeException {

	public BackendRequestAlreadyExistsException(String name) {
		super("Backend-запрос с именем «%s» уже существует".formatted(name));
	}
}