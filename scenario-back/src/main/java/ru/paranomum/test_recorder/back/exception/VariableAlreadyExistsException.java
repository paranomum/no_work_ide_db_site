package ru.paranomum.test_recorder.back.exception;

public class VariableAlreadyExistsException extends RuntimeException {

	public VariableAlreadyExistsException(String name) {
		super("Переменная с именем «%s» уже существует".formatted(name));
	}
}