package ru.paranomum.test_recorder.back.dto.users;

import java.time.LocalDateTime;

public record UserResponse(
		Long id,
		String name,
		String username
) {
}