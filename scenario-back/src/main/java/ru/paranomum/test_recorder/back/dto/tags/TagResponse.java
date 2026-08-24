package ru.paranomum.test_recorder.back.dto.tags;

import java.time.LocalDateTime;

public record TagResponse(
		Long id,
		String name,
		String color,
		LocalDateTime createdAt,
		LocalDateTime updatedAt
) {
}