# Spec Delta

## MODIFIED Requirements

### Requirement: Model choice by environment
The agent SHALL use the model named by the `MODEL` environment variable, defaulting to `gemini-3.5-flash-lite`, and
read the API key only from `GEMINI_API_KEY` on the server.

#### Scenario: Default model
- **WHEN** `MODEL` is not set and a turn runs
- **THEN** the model request names `gemini-3.5-flash-lite`

#### Scenario: Overridden model
- **WHEN** `MODEL` is `gemini-3.8-pro` and a turn runs
- **THEN** the model request names `gemini-3.8-pro`
