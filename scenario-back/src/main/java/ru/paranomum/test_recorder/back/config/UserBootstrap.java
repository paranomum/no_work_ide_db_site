package ru.paranomum.test_recorder.back.config;

import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import ru.paranomum.test_recorder.back.entity.User;
import ru.paranomum.test_recorder.back.repository.UserRepository;

@Component
public class UserBootstrap implements CommandLineRunner {

	private static final String DEFAULT_NAME = "Администратор";
	private static final String DEFAULT_USERNAME = "admin";
	private static final String DEFAULT_PASSWORD = "admin";

	private final UserRepository userRepository;
	private final PasswordEncoder passwordEncoder;

	public UserBootstrap(
			UserRepository userRepository,
			PasswordEncoder passwordEncoder
	) {
		this.userRepository = userRepository;
		this.passwordEncoder = passwordEncoder;
	}

	@Override
	public void run(String... args) {
		if (userRepository.count() > 0) {
			return;
		}

		User admin = new User(
				DEFAULT_NAME,
				DEFAULT_USERNAME,
				passwordEncoder.encode(DEFAULT_PASSWORD)
		);

		userRepository.save(admin);
	}
}