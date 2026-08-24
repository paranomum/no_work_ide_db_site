package ru.paranomum.test_recorder.back.security;

import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Collection;
import java.util.List;

public class CustomUserDetails implements UserDetails {

	private final Long userId;
	private final String username;
	private final String passwordHash;

	public CustomUserDetails(
			Long userId,
			String username,
			String passwordHash
	) {
		this.userId = userId;
		this.username = username;
		this.passwordHash = passwordHash;
	}

	public Long getUserId() {
		return userId;
	}

	@Override
	public Collection<? extends GrantedAuthority> getAuthorities() {
		return List.of();
	}

	@Override
	public String getPassword() {
		return passwordHash;
	}

	@Override
	public String getUsername() {
		return username;
	}
}