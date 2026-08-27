package ru.paranomum.test_recorder.back.controller;

import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import ru.paranomum.test_recorder.back.dto.users.UserPasswordRequest;
import ru.paranomum.test_recorder.back.dto.users.UserRequest;
import ru.paranomum.test_recorder.back.dto.users.UserResponse;
import ru.paranomum.test_recorder.back.dto.users.UserUpdateRequest;
import ru.paranomum.test_recorder.back.security.CustomUserDetails;
import ru.paranomum.test_recorder.back.service.UserService;

import ru.paranomum.test_recorder.back.dto.users.UserVariableRequest;
import ru.paranomum.test_recorder.back.dto.users.UserVariableResponse;

import java.util.List;

@RestController
@RequestMapping("/api/users")
public class UserController {

	private final UserService userService;

	public UserController(UserService userService) {
		this.userService = userService;
	}

	@GetMapping("/me")
	public UserResponse getMe(
			@AuthenticationPrincipal CustomUserDetails currentUser
	) {
		return userService.getById(currentUser.getUserId());
	}

	@PutMapping("/me")
	public UserResponse updateMe(
			@AuthenticationPrincipal CustomUserDetails currentUser,
			@Valid @RequestBody UserUpdateRequest request
	) {
		return userService.update(currentUser.getUserId(), request);
	}

	@PutMapping("/me/password")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	public void updateMyPassword(
			@AuthenticationPrincipal CustomUserDetails currentUser,
			@Valid @RequestBody UserPasswordRequest request
	) {
		userService.updatePassword(currentUser.getUserId(), request);
	}

	@GetMapping("/me/variables")
	public List<UserVariableResponse> getMyVariables(
			@AuthenticationPrincipal CustomUserDetails currentUser
	) {
		return userService.getVariables(currentUser.getUserId());
	}

	@PutMapping("/me/variables/{variableId}")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	public void setMyVariable(
			@AuthenticationPrincipal CustomUserDetails currentUser,
			@PathVariable Long variableId,
			@Valid @RequestBody UserVariableRequest request
	) {
		userService.setVariable(
				currentUser.getUserId(),
				variableId,
				request
		);
	}

	@DeleteMapping("/me/variables/{variableId}")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	public void deleteMyVariable(
			@AuthenticationPrincipal CustomUserDetails currentUser,
			@PathVariable Long variableId
	) {
		userService.deleteVariable(
				currentUser.getUserId(),
				variableId
		);
	}

	@GetMapping
	public List<UserResponse> getAll(
			@RequestParam(required = false) String query
	) {
		return userService.getAll(query);
	}

	@GetMapping("/{id}")
	public UserResponse getById(@PathVariable Long id) {
		return userService.getById(id);
	}

	@PostMapping
	@ResponseStatus(HttpStatus.CREATED)
	public UserResponse create(
			@Valid @RequestBody UserRequest request
	) {
		return userService.create(request);
	}

	@PutMapping("/{id}")
	public UserResponse update(
			@PathVariable Long id,
			@Valid @RequestBody UserUpdateRequest request
	) {
		return userService.update(id, request);
	}

	@PutMapping("/{id}/password")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	public void updatePassword(
			@PathVariable Long id,
			@Valid @RequestBody UserPasswordRequest request
	) {
		userService.updatePassword(id, request);
	}

	@PostMapping("/{userId}/reset")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	public void resetAccount(@PathVariable Long userId) {
		userService.resetAccount(userId);
	}
}