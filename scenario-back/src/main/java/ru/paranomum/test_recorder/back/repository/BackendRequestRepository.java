package ru.paranomum.test_recorder.back.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import ru.paranomum.test_recorder.back.entity.BackendRequest;

import java.util.List;

public interface BackendRequestRepository
		extends JpaRepository<BackendRequest, Long> {

	boolean existsByNameIgnoreCase(String name);

	List<BackendRequest> findAllByOrderByNameAsc();

	List<BackendRequest> findAllByNameContainingIgnoreCaseOrderByNameAsc(
			String query
	);
}