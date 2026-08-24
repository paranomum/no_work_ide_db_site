package ru.paranomum.test_recorder.back.entity;

import jakarta.persistence.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "backend_requests")
public class BackendRequest {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@Column(nullable = false)
	private String name;

	@Column(nullable = false)
	private String url;

	@Column(name = "http_method", nullable = false)
	private String httpMethod;

	@Column(name = "request_body")
	private String requestBody;

	@Column(name = "request_headers_json", nullable = false)
	private String requestHeadersJson;

	@Column(name = "captured_response_body")
	private String capturedResponseBody;

	@Column(nullable = false)
	private String token;

	@Column(name = "body_type", nullable = false)
	private String bodyType;

	@Column(name = "form_data_json", nullable = false)
	private String formDataJson;

	@Column(name = "field_overrides_json", nullable = false)
	private String fieldOverridesJson;

	@Column(name = "response_extractors_json", nullable = false)
	private String responseExtractorsJson;

	@Column(name = "captured_at")
	private String capturedAt;

	@Column(name = "created_at", nullable = false, updatable = false)
	private LocalDateTime createdAt;

	@Column(name = "updated_at", nullable = false)
	private LocalDateTime updatedAt;

	protected BackendRequest() {
	}

	public BackendRequest(
			String name,
			String url,
			String httpMethod,
			String requestBody,
			String requestHeadersJson,
			String capturedResponseBody,
			String token,
			String bodyType,
			String formDataJson,
			String fieldOverridesJson,
			String responseExtractorsJson,
			String capturedAt
	) {
		this.name = name;
		this.url = url;
		this.httpMethod = httpMethod;
		this.requestBody = requestBody;
		this.requestHeadersJson = requestHeadersJson;
		this.capturedResponseBody = capturedResponseBody;
		this.token = token;
		this.bodyType = bodyType;
		this.formDataJson = formDataJson;
		this.fieldOverridesJson = fieldOverridesJson;
		this.responseExtractorsJson = responseExtractorsJson;
		this.capturedAt = capturedAt;
	}

	public Long getId() {
		return id;
	}

	public String getName() {
		return name;
	}

	public String getUrl() {
		return url;
	}

	public String getHttpMethod() {
		return httpMethod;
	}

	public String getRequestBody() {
		return requestBody;
	}

	public String getRequestHeadersJson() {
		return requestHeadersJson;
	}

	public String getCapturedResponseBody() {
		return capturedResponseBody;
	}

	public String getToken() {
		return token;
	}

	public String getBodyType() {
		return bodyType;
	}

	public String getFormDataJson() {
		return formDataJson;
	}

	public String getFieldOverridesJson() {
		return fieldOverridesJson;
	}

	public String getResponseExtractorsJson() {
		return responseExtractorsJson;
	}

	public String getCapturedAt() {
		return capturedAt;
	}

	public LocalDateTime getCreatedAt() {
		return createdAt;
	}

	public LocalDateTime getUpdatedAt() {
		return updatedAt;
	}

	public void update(
			String name,
			String url,
			String httpMethod,
			String requestBody,
			String requestHeadersJson,
			String capturedResponseBody,
			String token,
			String bodyType,
			String formDataJson,
			String fieldOverridesJson,
			String responseExtractorsJson,
			String capturedAt
	) {
		this.name = name;
		this.url = url;
		this.httpMethod = httpMethod;
		this.requestBody = requestBody;
		this.requestHeadersJson = requestHeadersJson;
		this.capturedResponseBody = capturedResponseBody;
		this.token = token;
		this.bodyType = bodyType;
		this.formDataJson = formDataJson;
		this.fieldOverridesJson = fieldOverridesJson;
		this.responseExtractorsJson = responseExtractorsJson;
		this.capturedAt = capturedAt;
	}
}