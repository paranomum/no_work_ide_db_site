package ru.paranomum.test_recorder.back.controller;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.web.bind.annotation.*;
import ru.paranomum.test_recorder.back.dto.users.LoginRequest;
import ru.paranomum.test_recorder.back.dto.users.LoginResponse;
import ru.paranomum.test_recorder.back.security.CustomUserDetails;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

	private final AuthenticationManager authenticationManager;

	public AuthController(AuthenticationManager authenticationManager) {
		this.authenticationManager = authenticationManager;
	}

	@PostMapping("/login")
	public LoginResponse login(
			@Valid @RequestBody LoginRequest request,
			HttpServletRequest httpRequest
	) {
		Authentication authentication = authenticationManager.authenticate(
				UsernamePasswordAuthenticationToken.unauthenticated(
						request.username().trim(),
						request.password()
				)
		);

		SecurityContext securityContext =
				SecurityContextHolder.createEmptyContext();

		securityContext.setAuthentication(authentication);
		SecurityContextHolder.setContext(securityContext);

		HttpSession session = httpRequest.getSession(true);

		session.setAttribute(
				HttpSessionSecurityContextRepository.SPRING_SECURITY_CONTEXT_KEY,
				securityContext
		);

		CustomUserDetails principal =
				(CustomUserDetails) authentication.getPrincipal();

		return new LoginResponse(
				principal.getUserId(),
				principal.getUsername()
		);
	}

	@PostMapping("/logout")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	public void logout(HttpServletRequest request) {
		HttpSession session = request.getSession(false);

		if (session != null) {
			session.invalidate();
		}

		SecurityContextHolder.clearContext();
	}
}