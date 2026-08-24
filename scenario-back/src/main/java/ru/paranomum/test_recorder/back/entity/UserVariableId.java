package ru.paranomum.test_recorder.back.entity;

import java.io.Serializable;
import java.util.Objects;

public class UserVariableId implements Serializable {

	private Long userId;
	private Long variableId;

	protected UserVariableId() {
	}

	public UserVariableId(Long userId, Long variableId) {
		this.userId = userId;
		this.variableId = variableId;
	}

	@Override
	public boolean equals(Object object) {
		if (this == object) {
			return true;
		}

		if (!(object instanceof UserVariableId that)) {
			return false;
		}

		return Objects.equals(userId, that.userId)
				&& Objects.equals(variableId, that.variableId);
	}

	@Override
	public int hashCode() {
		return Objects.hash(userId, variableId);
	}
}