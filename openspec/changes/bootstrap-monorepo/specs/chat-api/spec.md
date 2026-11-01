# Spec Delta

## Purpose

HTTP API served by the Python function that powers the chat. It exposes a health check and, in later changes, the
chat endpoint that runs the agent.

## ADDED Requirements

### Requirement: Health check endpoint
The API SHALL expose `GET /api/health`, which returns HTTP 200 with a JSON body `{"status": "ok"}` without calling
the LLM or reading secrets, so uptime checks and deploy verification cost nothing.

#### Scenario: Service is up
- **WHEN** a client sends `GET /api/health`
- **THEN** the response status is 200
- **AND** the body is the JSON object `{"status": "ok"}`

#### Scenario: Works without an API key
- **WHEN** `GEMINI_API_KEY` is not set and a client sends `GET /api/health`
- **THEN** the response status is still 200

### Requirement: Unknown routes return JSON errors
The API SHALL answer requests to unknown paths under `/api/` with HTTP 404 and a JSON body containing an `error`
field, and SHALL NOT expose stack traces or internal details.

#### Scenario: Unknown path
- **WHEN** a client sends `GET /api/does-not-exist`
- **THEN** the response status is 404
- **AND** the body is JSON with an `error` field
- **AND** the body contains no stack trace
