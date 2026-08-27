package ru.paranomum.test_recorder.back.security;

import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import ru.paranomum.test_recorder.back.repository.UserRepository;

@Service
public class CustomUserDetailsService implements UserDetailsService {

	private final UserRepository userRepository;

	public CustomUserDetailsService(UserRepository userRepository) {
		this.userRepository = userRepository;
	}

	@Override
	public UserDetails loadUserByUsername(String username) {
		AuthUserProjection user = userRepository.findAuthUserByUsername(username)
				.orElseThrow(() -> new UsernameNotFoundException(
						"Пользователь не найден"
				));

		return new CustomUserDetails(
				user.id(),
				user.username(),
				user.passwordHash()
		);
	}
}