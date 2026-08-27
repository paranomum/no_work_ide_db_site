package ru.paranomum.test_recorder.back.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import ru.paranomum.test_recorder.back.entity.User;
import ru.paranomum.test_recorder.back.security.AuthUserProjection;

import java.util.List;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {

	boolean existsByUsernameIgnoreCase(String username);

	List<User> findAllByOrderByUsernameAsc();

	List<User> findAllByUsernameContainingIgnoreCaseOrderByUsernameAsc(
			String query
	);

	Optional<User> findByUsernameIgnoreCase(String username);

	@Query("""
            select new ru.paranomum.test_recorder.back.security.AuthUserProjection(
                u.id,
                u.username,
                u.passwordHash
            )
            from User u
            where lower(u.username) = lower(:username)
            """)
	Optional<AuthUserProjection> findAuthUserByUsername(
			@Param("username") String username
	);
}