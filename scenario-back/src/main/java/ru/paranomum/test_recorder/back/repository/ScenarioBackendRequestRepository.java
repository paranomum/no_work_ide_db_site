package ru.paranomum.test_recorder.back.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import ru.paranomum.test_recorder.back.entity.ScenarioBackendRequest;
import ru.paranomum.test_recorder.back.entity.ScenarioBackendRequestId;

import java.util.List;

public interface ScenarioBackendRequestRepository
		extends JpaRepository<
		ScenarioBackendRequest,
		ScenarioBackendRequestId
		> {

	List<ScenarioBackendRequest> findAllByScenarioId(Long scenarioId);

	List<ScenarioBackendRequest> findAllByBackendRequestId(
			Long backendRequestId
	);

	void deleteAllByScenarioId(Long scenarioId);
}