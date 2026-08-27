-- V1__init.sql
--
-- TestRecorder Scenario Storage MVP
-- SQLite + Flyway
--
-- Перед использованием каждого SQLite JDBC-соединения приложение должно
-- выполнять: PRAGMA foreign_keys = ON;
--
-- PRAGMA в миграции сам по себе не гарантирует включённые внешние ключи
-- на последующих отдельных соединениях приложения.

PRAGMA foreign_keys = ON;

-- ============================================================
-- Пользователи сайта
-- ============================================================

CREATE TABLE users (
    id            INTEGER PRIMARY KEY,
    name          TEXT NOT NULL,
    username      TEXT NOT NULL COLLATE NOCASE,
    password_hash TEXT NOT NULL,

    CONSTRAINT uq_users_username UNIQUE (username),

    CONSTRAINT ck_users_name_not_blank
        CHECK (trim(name) <> ''),

    CONSTRAINT ck_users_username_not_blank
        CHECK (trim(username) <> ''),

    CONSTRAINT ck_users_password_hash_not_blank
        CHECK (trim(password_hash) <> '')
);

-- ============================================================
-- Глобальный каталог переменных.
--
-- is_user_variable:
--   0 — обычная переменная сценария; приложение не меняет её
--       variables[].value при экспорте.
--   1 — пользовательская переменная; при скачивании её значение
--       должно быть взято из user_variables для текущего пользователя.
--
-- Имя переменной — например:
--   manager.username
--   manager.password
--   manager.uuid
--   recruiter.uuid
--   jr.id
--
-- Флаг ставится явно в UI и не определяется по имени переменной.
-- ============================================================

CREATE TABLE variables (
    id               INTEGER PRIMARY KEY,
    name             TEXT NOT NULL COLLATE NOCASE,
    description      TEXT,
    is_user_variable INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT uq_variables_name UNIQUE (name),

    CONSTRAINT ck_variables_name_not_blank
        CHECK (trim(name) <> ''),

    CONSTRAINT ck_variables_is_user_variable
        CHECK (is_user_variable IN (0, 1))
);

-- ============================================================
-- Значения персональных переменных.
--
-- Одна строка = одно значение конкретной переменной у конкретного
-- пользователя.
--
-- Бизнес-правило, проверяемое в Java:
-- user_variables разрешено создавать только для переменных,
-- где variables.is_user_variable = 1.
--
-- TEXT, а не VARCHAR(255), потому что в значении могут оказаться
-- длинные UUID, токены, JSON-фрагменты, URL и т. п.
-- ============================================================

CREATE TABLE user_variables (
    user_id     INTEGER NOT NULL,
    variable_id INTEGER NOT NULL,
    value       TEXT NOT NULL,

    PRIMARY KEY (user_id, variable_id),

    FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE,

    FOREIGN KEY (variable_id)
        REFERENCES variables(id)
        ON DELETE CASCADE
);

CREATE INDEX ix_user_variables_user_id
    ON user_variables(user_id);

CREATE INDEX ix_user_variables_variable_id
    ON user_variables(variable_id);

-- ============================================================
-- Теги сценариев.
--
-- color можно хранить в любом выбранном UI-формате:
--   #4CAF50
--   rgb(76,175,80)
--   green
--
-- Валидировать конкретный формат цвета лучше в Java/UI, а не
-- усложнять SQLite CHECK-выражением.
-- ============================================================

CREATE TABLE tags (
    id         INTEGER PRIMARY KEY,
    name       TEXT NOT NULL COLLATE NOCASE,
    color      TEXT NOT NULL,

    CONSTRAINT uq_tags_name UNIQUE (name),

    CONSTRAINT ck_tags_name_not_blank
        CHECK (trim(name) <> ''),

    CONSTRAINT ck_tags_color_not_blank
        CHECK (trim(color) <> '')
);

-- ============================================================
-- Библиотека backend-запросов.
--
-- Один backend request может использоваться многими сценариями.
-- Его name должен быть уникальным глобально, потому что action:
--
-- {
--   "action": "useBackendMethod",
--   "value": "получить текущий шаг"
-- }
--
-- находит backend request именно по name.
--
-- Массивы/сложные структуры внутри записанного запроса храним JSON-ом:
--   form_data_json           -> formData[]
--   field_overrides_json     -> fieldOverrides[]
--   response_extractors_json -> responseExtractors[]
--
-- Headers тоже JSON, поскольку в исходном формате они сохранены
-- объектом/строкой JSON.
-- ============================================================

CREATE TABLE backend_requests (
    id                       INTEGER PRIMARY KEY,
    name                     TEXT NOT NULL COLLATE NOCASE,

    url                      TEXT NOT NULL,
    http_method              TEXT NOT NULL,

    request_body             TEXT,
    request_headers_json     TEXT NOT NULL DEFAULT '{}',
    captured_response_body   TEXT,

    token                    TEXT NOT NULL DEFAULT '',
    body_type                TEXT NOT NULL DEFAULT 'NONE',

    form_data_json           TEXT NOT NULL DEFAULT '[]',
    field_overrides_json     TEXT NOT NULL DEFAULT '[]',
    response_extractors_json TEXT NOT NULL DEFAULT '[]',

    CONSTRAINT uq_backend_requests_name UNIQUE (name),

    CONSTRAINT ck_backend_requests_name_not_blank
        CHECK (trim(name) <> ''),

    CONSTRAINT ck_backend_requests_url_not_blank
        CHECK (trim(url) <> ''),

    CONSTRAINT ck_backend_requests_http_method
        CHECK (upper(http_method) IN (
            'GET',
            'POST',
            'PUT',
            'PATCH',
            'DELETE',
            'HEAD',
            'OPTIONS'
        )),

    CONSTRAINT ck_backend_requests_body_type
        CHECK (upper(body_type) IN (
            'NONE',
            'JSON',
            'FORM_URLENCODED',
            'FORM_DATA',
            'RAW'
        )),

    CONSTRAINT ck_backend_requests_headers_json
        CHECK (json_valid(request_headers_json)),

    CONSTRAINT ck_backend_requests_form_data_json
        CHECK (json_valid(form_data_json)),

    CONSTRAINT ck_backend_requests_field_overrides_json
        CHECK (json_valid(field_overrides_json)),

    CONSTRAINT ck_backend_requests_response_extractors_json
        CHECK (json_valid(response_extractors_json))
);

CREATE INDEX ix_backend_requests_name
    ON backend_requests(name);

CREATE INDEX ix_backend_requests_http_method
    ON backend_requests(http_method);

-- ============================================================
-- Общие сценарии.
--
-- scenario_payload_json содержит шаблон экспортируемого сценария,
-- но БЕЗ поля верхнего уровня backendRequests.
--
-- В нём хранятся:
-- {
--   "actions": [...],
--   "variables": [...],
--   "scenarioOverrides": {...}
-- }
--
-- backendRequests собирается при экспорте из:
-- scenarios
--   -> scenario_backend_requests
--   -> backend_requests
--
-- display name является ключом custom method:
-- {
--   "action": "customMethod",
--   "value": "создание заявки ОШС"
-- }
--
-- Поэтому name глобально уникален.
-- ============================================================

CREATE TABLE scenarios (
    id                    INTEGER PRIMARY KEY,
    name                  TEXT NOT NULL COLLATE NOCASE,
    description           TEXT,

    scenario_payload_json TEXT NOT NULL,

    CONSTRAINT uq_scenarios_name UNIQUE (name),

    CONSTRAINT ck_scenarios_name_not_blank
        CHECK (trim(name) <> ''),

    CONSTRAINT ck_scenarios_payload_json_valid
        CHECK (json_valid(scenario_payload_json))
);

CREATE INDEX ix_scenarios_name
    ON scenarios(name);

-- ============================================================
-- Связь сценарий <-> backend request.
--
-- Это many-to-many:
--   один сценарий использует много backend requests;
--   один backend request может использоваться во многих сценариях.
--
-- Здесь НЕТ позиции.
-- Порядок и количество запусков задаёт actions[] в
-- scenario_payload_json.
--
-- Пример:
-- один backend request "согласование" может появиться в actions
-- несколько раз, но в этой таблице будет одна связь:
-- (scenario_id, backend_request_id).
--
-- ON DELETE RESTRICT у backend request:
-- нельзя удалить запрос, пока он используется сценарием.
-- ============================================================

CREATE TABLE scenario_backend_requests (
    scenario_id        INTEGER NOT NULL,
    backend_request_id INTEGER NOT NULL,

    PRIMARY KEY (scenario_id, backend_request_id),

    FOREIGN KEY (scenario_id)
        REFERENCES scenarios(id)
        ON DELETE CASCADE,

    FOREIGN KEY (backend_request_id)
        REFERENCES backend_requests(id)
        ON DELETE RESTRICT
);

CREATE INDEX ix_scenario_backend_requests_backend_request_id
    ON scenario_backend_requests(backend_request_id);

-- ============================================================
-- Переменные, объявленные в конкретном сценарии.
--
-- Служит проекцией массива scenario JSON:
-- variables[].
--
-- position сохраняет порядок массива.
-- default_value — исходный variables[].value из шаблона.
--
-- При экспорте default_value заменяется значением пользователя
-- исключительно для is_user_variable = 1.
--
-- Важно:
-- variable_name намеренно не дублируется: имя всегда берётся из
-- variables.name через variable_id. Это исключает рассинхрон между
-- таблицей связи и глобальным каталогом переменных.
-- ============================================================

CREATE TABLE scenario_variables (
    scenario_id   INTEGER NOT NULL,
    variable_id   INTEGER NOT NULL,

    default_value TEXT NOT NULL DEFAULT '',
    position      INTEGER NOT NULL,

    PRIMARY KEY (scenario_id, variable_id),

    CONSTRAINT uq_scenario_variables_position
        UNIQUE (scenario_id, position),

    FOREIGN KEY (scenario_id)
        REFERENCES scenarios(id)
        ON DELETE CASCADE,

    FOREIGN KEY (variable_id)
        REFERENCES variables(id)
        ON DELETE RESTRICT,

    CONSTRAINT ck_scenario_variables_position
        CHECK (position >= 0)
);

CREATE INDEX ix_scenario_variables_variable_id
    ON scenario_variables(variable_id);

-- ============================================================
-- Связь сценарий <-> тег.
-- ============================================================

CREATE TABLE scenario_tags (
    scenario_id INTEGER NOT NULL,
    tag_id      INTEGER NOT NULL,

    PRIMARY KEY (scenario_id, tag_id),

    FOREIGN KEY (scenario_id)
        REFERENCES scenarios(id)
        ON DELETE CASCADE,

    FOREIGN KEY (tag_id)
        REFERENCES tags(id)
        ON DELETE CASCADE
);

CREATE INDEX ix_scenario_tags_tag_id
    ON scenario_tags(tag_id);

-- ============================================================
-- Связи сценариев через customMethod.
--
-- source_scenario_id: сценарий, который вызывает custom method.
-- target_scenario_id: сценарий, который должен быть исполнен.
--
-- Фактический порядок и повторные вызовы остаются в actions[]
-- внутри scenarios.scenario_payload_json.
--
-- Эта таблица отвечает только на вопрос:
-- "какие переиспользуемые сценарии использует данный сценарий?"
--
-- Один сценарий может использовать много custom methods.
-- Один custom method может использоваться многими сценариями.
-- ============================================================

CREATE TABLE scenario_custom_methods (
    source_scenario_id INTEGER NOT NULL,
    target_scenario_id INTEGER NOT NULL,

    PRIMARY KEY (source_scenario_id, target_scenario_id),

    FOREIGN KEY (source_scenario_id)
        REFERENCES scenarios(id)
        ON DELETE CASCADE,

    FOREIGN KEY (target_scenario_id)
        REFERENCES scenarios(id)
        ON DELETE RESTRICT,

    CONSTRAINT ck_scenario_custom_methods_no_self_reference
        CHECK (source_scenario_id <> target_scenario_id)
);

CREATE INDEX ix_scenario_custom_methods_target_scenario_id
    ON scenario_custom_methods(target_scenario_id);