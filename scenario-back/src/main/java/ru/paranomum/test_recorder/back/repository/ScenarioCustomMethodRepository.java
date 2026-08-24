package ru.paranomum.test_recorder.back.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import ru.paranomum.test_recorder.back.entity.ScenarioCustomMethod;
import ru.paranomum.test_recorder.back.entity.ScenarioCustomMethodId;

import java.util.List;

public interface ScenarioCustomMethodRepository
		extends JpaRepository<
		ScenarioCustomMethod,
		ScenarioCustomMethodId
		> {

	List<ScenarioCustomMethod> findAllBySourceScenarioId(
			Long sourceScenarioId
	);

	void deleteAllBySourceScenarioId(Long sourceScenarioId);
}