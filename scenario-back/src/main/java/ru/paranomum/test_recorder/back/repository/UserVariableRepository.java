package ru.paranomum.test_recorder.back.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import ru.paranomum.test_recorder.back.entity.UserVariable;
import ru.paranomum.test_recorder.back.entity.UserVariableId;

import java.util.List;

public interface UserVariableRepository
		extends JpaRepository<UserVariable, UserVariableId> {

	List<UserVariable> findAllByUserId(Long userId);

	void deleteAllByUserId(Long userId);
}