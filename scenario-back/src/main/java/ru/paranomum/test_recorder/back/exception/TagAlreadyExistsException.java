package ru.paranomum.test_recorder.back.exception;

public class TagAlreadyExistsException extends RuntimeException {

	public TagAlreadyExistsException(String name) {
		super("Тег с названием «%s» уже существует".formatted(name));
	}
}