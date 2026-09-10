# Project Guidelines

## Project purpose

This repository contains the backend for a test recorder application.

Primary responsibilities of this backend may include:
- Exposing a REST API for frontend and desktop clients.
- Implementing application business rules.
- Persisting application data using JPA and SQLite.
- Managing database schema evolution using Flyway.
- Securing protected endpoints with Spring Security.
- Returning stable, validated, client-oriented API contracts.

Do not assume a feature, endpoint, entity, authentication scheme, package, or data model exists unless it is present in the repository or explicitly described by the user.

## Working language and communication

- The user may write in Russian. Respond in Russian unless the user requests another language.
- Keep code, identifiers, package names, commit messages, API field names, and technical documentation consistent with the existing repository language and conventions.
- Be concise, precise, and implementation-oriented.
- State uncertainty explicitly. Never invent repository facts.
- When referring to code, always cite actual inspected file paths.
- Distinguish clearly between:
    - confirmed repository facts;
    - assumptions;
    - proposed implementation choices;
    - questions that require user confirmation.

## Technology baseline

- Build system: Maven Wrapper (`./mvnw`).
- Java version: 21.
- Framework: Spring Boot 4.0.8.
- Web/API: Spring MVC via `spring-boot-starter-web`.
- Validation: Jakarta Bean Validation via `spring-boot-starter-validation`.
- Persistence: Spring Data JPA and Hibernate.
- Database: SQLite through Xerial SQLite JDBC driver.
- Database migrations: Flyway.
- Security: Spring Security.
- Boilerplate reduction: Lombok is available.
- Tests: Spring Boot Test stack.

Do not introduce Spring WebFlux, Gradle, Kotlin, reactive repositories, MapStruct, Lombok annotations, Swagger/OpenAPI, Testcontainers, new Maven dependencies, or new infrastructure unless the user explicitly approves it and the change is justified.

## Build and run commands

This is a Maven project.

- Build package: `./mvnw clean package`
- Run all tests: `./mvnw test`
- Run one test class: `./mvnw test -Dtest=ClassName`
- Run one test method: `./mvnw test -Dtest=ClassName#methodName`
- Clean output: `./mvnw clean`
- Start Spring Boot: `./mvnw spring-boot:run`

If `mvnw` is absent, use equivalent `mvn` commands.

Never use:
- `gradle`
- `./gradlew`
- commands that modify repository state unless the user has approved them
- destructive database commands
- commands that remove user data or rewrite Git history

Before executing Maven commands, ask for explicit approval and state:
1. the exact command;
2. why it is needed;
3. whether it may download dependencies, take time, or modify generated files.

Never claim a build, test, migration, or application startup succeeded unless it was actually run and its result was inspected.

## Repository inspection workflow

Before proposing implementation details:

1. Inspect the relevant controller, service, repository, entity, DTO, mapper, exception handler, security configuration, migration, and test files that already exist.
2. Inspect `pom.xml` before proposing language features or dependencies.
3. Inspect application configuration before proposing profiles, datasource properties, security properties, or Flyway behavior.
4. Reuse existing naming, package layout, error responses, logging, test style, and transaction conventions.
5. If required context is missing, explicitly list the next files or directories that must be inspected.

For a multi-file task, follow this order:
1. Briefly summarize the relevant code discovered.
2. Describe the implementation plan in 3–7 concrete steps.
3. Identify API, database, security, migration, compatibility, and test impact.
4. Ask for approval before editing any source, configuration, migration, or test file.
5. After approval, make only the agreed changes.
6. Summarize changed files, behavior, risks, and recommended verification commands.

Do not begin writing code just because the user described a desired feature. Inspect first, then plan, then wait for approval.

## REST API design rules

When implementing or changing a REST endpoint:

- Preserve backward compatibility for public REST contracts unless the user explicitly requests a breaking change.
- Reuse the existing URL style, API versioning approach, response envelope, naming conventions, pagination conventions, and HTTP status conventions.
- Keep controllers thin:
    - receive and validate HTTP input;
    - call a service;
    - convert service output to HTTP response;
    - do not place business logic or direct repository orchestration in controllers.
- Use request and response DTOs for external API contracts when that is the established project convention.
- Do not expose JPA entities directly in API responses unless that is already an intentional, verified project convention.
- Validate request DTOs using `@Valid` and suitable Jakarta Validation constraints.
- Validate path variables, query parameters, and request body data at the appropriate boundary.
- Return accurate HTTP statuses:
    - `200 OK` for successful reads and updates when a response body is returned;
    - `201 Created` for creation, preferably with a `Location` header when the project uses it;
    - `204 No Content` for successful deletion or actions without a response body;
    - `400 Bad Request` for malformed or invalid input;
    - `401 Unauthorized` when authentication is required but absent or invalid;
    - `403 Forbidden` when authentication succeeds but authorization fails;
    - `404 Not Found` for absent resources where revealing existence is appropriate;
    - `409 Conflict` for uniqueness, state, or concurrency conflicts when applicable.
- Never return stack traces, SQL messages, internal class names, secrets, or implementation details to API clients.
- Reuse the existing exception and error-response approach. Do not add a new global exception format without approval.
- For create and update operations, clearly define which fields are client-controlled and which fields are generated or server-controlled.
- For partial updates, use the project’s existing semantics. Do not introduce PATCH or JSON Merge Patch without explicit approval.
- Avoid vague endpoint verbs in paths when RESTful resource operations are sufficient. Follow existing project conventions if they differ.

## Service-layer rules

Services own use cases and business rules.

- Put business decisions, orchestration, authorization checks related to the use case, and transaction boundaries in services.
- Prefer one public service method per application use case.
- Give methods intention-revealing names such as `createRecording`, `getRecordingById`, `updateRecording`, or `deleteRecording`.
- Keep repository calls and state transitions coherent within a service method.
- Do not duplicate business logic between controllers, services, scheduled jobs, and security components.
- Use constructor injection only.
- Never introduce field injection.
- Prefer immutable dependencies and `final` fields.
- Use `@Transactional` deliberately:
    - mark write use cases transactional;
    - use read-only transactions only when consistent with existing conventions;
    - do not add transactions mechanically;
    - consider rollback behavior for checked and unchecked exceptions.
- Avoid leaking persistence-specific types or mutable JPA entities beyond the service boundary unless current project architecture deliberately does so.
- Check whether entity loading, lazy relations, and DTO mapping occur within a safe transaction boundary.
- Protect invariants before saving changes.
- Make service behavior deterministic, explicit, and testable.
- Do not use exceptions for normal control flow.

## Persistence, SQLite, and Flyway

- Treat the database schema and existing migrations as source-of-truth repository artifacts.
- Do not modify database migrations, schema, indexes, constraints, seed data, datasource configuration, Hibernate dialect settings, or Flyway configuration without explicit approval.
- Do not edit an already-applied Flyway migration. Create a new migration for schema changes after approval.
- Follow the repository’s existing migration naming and placement conventions.
- Use Spring Data repository methods consistently with the existing project style.
- Avoid `findAll()` for potentially unbounded production datasets unless that is intentionally acceptable in the existing API.
- Check nullability, uniqueness, foreign-key-like relations, and lifecycle effects before changing entities.
- SQLite has different concurrency and SQL capabilities from server databases. Do not propose database-specific features, locking strategies, JSON operators, sequences, or advanced SQL without verifying support and the configured dialect.
- Do not introduce native SQL queries unless there is a clear reason and the existing project uses them or the user approves.
- Do not enable `ddl-auto=create`, `ddl-auto=update`, destructive schema generation, or automatic migration repair without explicit approval.

## Security rules

- Inspect the actual security configuration before changing endpoint access, authentication, authorization, CSRF behavior, sessions, CORS, passwords, tokens, or filters.
- Follow the existing authentication and authorization model.
- Apply least privilege: new endpoints must be explicitly classified as public or protected according to existing policy.
- Never weaken authentication, authorization, password hashing, transport security, CORS restrictions, CSRF settings, or secret handling merely to make local testing easier.
- Do not log passwords, tokens, authorization headers, session identifiers, API keys, personally sensitive data, or complete request bodies containing credentials.
- Do not hard-code secrets, passwords, tokens, local paths, or environment-specific values.
- Prefer configuration properties and environment variables only when the project already uses an established pattern.
- Call out security implications whenever an endpoint, identity rule, permission rule, or sensitive data flow changes.

## Java code quality

- Use Java 21 features only where they improve clarity and are compatible with the existing codebase.
- Follow the project’s existing formatting and naming style.
- Prefer clear, boring, maintainable code over clever abstractions.
- Use meaningful names; avoid one-letter names except in small local scopes.
- Keep methods focused. Extract private methods only when they improve readability or remove genuine duplication.
- Keep public APIs small and intentional.
- Do not add unnecessary interfaces, generic base classes, factories, utility classes, wrappers, or design patterns.
- Do not use `Optional` for fields, DTO properties, JPA entity fields, or method parameters. Use it only for return values where it makes absence explicit.
- Avoid returning `null` from public methods when an explicit alternative already exists in project conventions.
- Prefer domain-specific exceptions over generic `RuntimeException` where the existing project has an exception model for this.
- Use Lombok only if the nearby codebase already uses compatible Lombok patterns.
- Do not make broad formatting-only or unrelated refactoring changes during a feature task.

## DTO mapping and validation

- Keep request DTOs separate from response DTOs when the project architecture does so.
- Never allow request DTOs to overwrite server-managed fields such as IDs, ownership, timestamps, audit fields, permissions, or status fields unless explicitly designed for that use case.
- Map only fields that the caller is authorized to control.
- Ensure validation messages and constraints match existing API behavior and localization conventions.
- Validate business rules that depend on persistence or current state in the service layer, not only through DTO annotations.
- Explicitly consider:
    - duplicate creation;
    - missing parent or referenced entities;
    - invalid state transitions;
    - authorization ownership checks;
    - null and blank values;
    - boundary values;
    - idempotency where relevant.

## Testing rules

- Reuse the test stack and conventions already present in the repository.
- Inspect related tests before creating or changing tests.
- For changed business logic, propose focused tests that cover:
    - the successful path;
    - validation failure;
    - not-found behavior;
    - conflict or invalid state when applicable;
    - authorization behavior when endpoint access changes;
    - important edge cases.
- Test observable behavior rather than private implementation details.
- Prefer small unit tests for service business rules when practical.
- Use controller/integration tests when HTTP mapping, validation, security, serialization, or persistence behavior must be verified.
- Do not introduce a new test framework, mocking library, container setup, or test database strategy without approval.
- Do not claim test coverage or passing tests unless they were actually executed.

## Change safety

Never change the following without explicit user approval:
- `pom.xml` or dependencies;
- Flyway migrations or database schema;
- application configuration;
- Docker, Compose, CI/CD, deployment, infrastructure, or environment files;
- security configuration;
- public endpoint paths, request formats, response formats, or status codes;
- package structure;
- generated files;
- license files;
- Git history.

When such a change is needed, explain:
1. why it is necessary;
2. which exact files would change;
3. backward compatibility implications;
4. migration or rollback considerations;
5. alternative approaches, if reasonable.

## Required response format for coding tasks

For analysis or implementation requests, structure responses as follows:

### Observed
- List only facts verified from inspected files.
- Include real file paths.

### Proposed plan
- List specific implementation steps.
- Identify files likely to change.
- Clearly mark assumptions.

### Impact and risks
- API compatibility impact.
- Security impact.
- Database and migration impact.
- Test impact.

### Approval needed
- State exactly what needs user approval before editing files or executing commands.

For small questions, use a shorter form but still do not invent repository details.

## Definition of done

A task is complete only when:
- the implementation matches the approved plan;
- affected API behavior is explicitly described;
- validation and error handling follow existing project conventions;
- security implications were checked;
- database and migration impact was considered;
- relevant tests were added or updated, or their absence was justified;
- test and build execution status is reported truthfully;
- changed files are listed;
- no unrelated files or behavior were changed.