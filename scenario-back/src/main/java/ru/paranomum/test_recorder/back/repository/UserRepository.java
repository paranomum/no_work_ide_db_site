package ru.paranomum.test_recorder.back.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import ru.paranomum.test_recorder.back.entity.User;

import java.util.List;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {

	boolean existsByUsernameIgnoreCase(String username);

	List<User> findAllByOrderByUsernameAsc();

	List<User> findAllByUsernameContainingIgnoreCaseOrderByUsernameAsc(
			String query
	);

	Optional<User> findByUsernameIgnoreCase(String username);
}