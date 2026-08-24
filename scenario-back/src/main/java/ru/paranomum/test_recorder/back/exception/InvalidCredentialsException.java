package ru.paranomum.test_recorder.back.exception;

public class InvalidCredentialsException extends RuntimeException {

	public InvalidCredentialsException() {
		super("Неверный логин или пароль");
	}
}