package ru.paranomum.test_recorder.back.security;

public record AuthUserProjection(
		Long id,
		String username,
		String passwordHash
) {
}