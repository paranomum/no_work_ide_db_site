package ru.paranomum.test_recorder.back.exception;

public class SelenoidUnavailableException extends RuntimeException {

	public SelenoidUnavailableException(String message) {
		super(message);
	}

	public SelenoidUnavailableException(String message, Throwable cause) {
		super(message, cause);
	}
}
