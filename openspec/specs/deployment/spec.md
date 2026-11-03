# deployment Specification

## Purpose
How the app is served in production on Vercel: the web app and the Python API under one public URL, with secrets
kept server side, code defaults applied when configuration is unset, and serverless limitations stated.

## Requirements


### Requirement: API routes reach the Python function
On the deployed URL, every request path under `/api/` SHALL be handled by the FastAPI app with the same path it was
sent to, so the endpoints of the `chat-api` capability behave as they do locally.

#### Scenario: Health check in production
- **WHEN** a client sends `GET /api/health` to the production URL
- **THEN** the response status is 200
- **AND** the body is the JSON object `{"status": "ok"}`

#### Scenario: Unknown API path in production
- **WHEN** a client sends `GET /api/does-not-exist` to the production URL
- **THEN** the response status is 404
- **AND** the body is JSON with an `error` field, not the Next.js HTML 404 page

#### Scenario: Routing configuration is checked in CI
- **WHEN** the test suite runs
- **THEN** it fails if the deploy configuration no longer sends `/api/` paths to the FastAPI function

### Requirement: Real chat turn in production
The deployed chat endpoint SHALL answer a real priced question with values computed by the API from the store data,
within the model request timeout.

#### Scenario: Takamine GD20 price in pt-BR
- **WHEN** a client posts `{"messages": [{"role": "user", "text": "Quanto custa o violão Takamine GD20?"}], "locale": "pt-BR"}` to `/api/chat` on the production URL
- **THEN** the response status is 200 and arrives in under 15 seconds
- **AND** `reply` quotes the price R$ 2.199,00, the PIX price R$ 2.089,05 and 12x of R$ 183,25

### Requirement: Function bundle carries runtime files
The deployed API function SHALL include the agent package and every data file the API reads at runtime (the CSVs
and the policy text), and SHALL leave out tests, docs and the source policy PDF.

#### Scenario: Data files are present
- **WHEN** the production function loads the catalog and the policy manual on its first request
- **THEN** the request succeeds without a missing-file error

#### Scenario: Bundle configuration is checked in CI
- **WHEN** the test suite runs
- **THEN** it fails if the deploy configuration stops including the agent package or the data directory

### Requirement: Function duration covers a full turn
The API function's maximum duration SHALL be longer than the worst-case agent turn (model calls per turn times the
15-second model timeout), so a slow turn ends with the API's own JSON 503 instead of a platform timeout page.

#### Scenario: Duration above the turn bound
- **WHEN** the test suite runs
- **THEN** it fails if the configured maximum duration is not greater than (tool rounds + 1) x 15 seconds

### Requirement: Secrets stay server side
The Gemini API key SHALL exist only as an encrypted server-side environment variable of the Vercel project and
SHALL NOT appear in the repository, in any browser-exposed variable, or in the static assets served to the browser.

#### Scenario: Key is not shipped to the browser
- **WHEN** the production build is inspected
- **THEN** no environment variable with the `NEXT_PUBLIC_` prefix holds the key
- **AND** the key value does not occur in the served static assets

#### Scenario: Key is server-only in Vercel
- **WHEN** the project's environment variables are listed
- **THEN** `GEMINI_API_KEY` is present for Production and Preview as an encrypted or sensitive variable

### Requirement: Configuration defaults apply in production
The production deployment SHALL NOT set `MODEL` or `REFERENCE_DATE`, so the API runs the default model
`gemini-3.5-flash-lite` and treats 2026-03-23 as today.

#### Scenario: No model override is pinned
- **WHEN** the project's environment variables are listed
- **THEN** neither `MODEL` nor `REFERENCE_DATE` is defined for any environment

### Requirement: Serverless limitations are documented
The README SHALL state the production URL, the environment variables the deployment needs, and that the per-IP rate
limit is kept in memory per function instance, so on serverless the effective limit can exceed 10 requests per
minute per IP.

#### Scenario: Reader checks the limits
- **WHEN** a reviewer reads the README limitations section
- **THEN** it names the per-instance rate limit and the shared store that would fix it as a next step
