package ru.paranomum.test_recorder.back.exception;

public class UserAlreadyExistsException extends RuntimeException {

	public UserAlreadyExistsException(String username) {
		super("Пользователь с логином «%s» уже существует".formatted(username));
	}
}