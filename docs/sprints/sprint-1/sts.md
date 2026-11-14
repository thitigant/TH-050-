# Software Test Specification (STS) – Sprint 1 (Part E)
**Course:** CPE 334 Introduction to Software Engineering in the Age of AI Agents  
**Theme 10:** Review, Feedback, and Survey System (UniPulse)  
**Document Version:** 1.0.0  

---

## 1. Test Strategy & Scope Overview
The Sprint 1 verification strategy establishes comprehensive multi-level automated test coverage across:
1. **Unit Tests:** Input validation schemas, boundary checks, rating calculations, and error formatting.
2. **Integration Tests (API & Database):** REST endpoints, Prisma transactional queries, unique constraints, cascade deletions, and token blacklisting against a real PostgreSQL test database.
3. **End-to-End (E2E) Journey Tests:** User journeys through browser UI from login to survey creation, publishing, respondent form submission, duplicate rejection, and analytics dashboard inspection.

---

## 2. Test Specifications Catalog (TEST-01 to TEST-34)

| Test ID | Linked AC | Test Level | Preconditions & Inputs | Execution Action | Expected Result |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **TEST-01** | `AC-01` | Integration | Valid registration payload with role `RESPONDENT`. | `POST /api/v1/auth/register` | HTTP 201 Created; User saved in DB; password is encrypted string. |
| **TEST-02** | `AC-02` | Integration | Seeded user `student1@unipulse.edu` with correct password. | `POST /api/v1/auth/login` | HTTP 200 OK; Returns signed JWT token with valid payload. |
| **TEST-03** | `AC-02` | Integration | Seeded user `student1@unipulse.edu` with incorrect password. | `POST /api/v1/auth/login` | HTTP 401 Unauthorized; code `INVALID_CREDENTIALS`. |
| **TEST-04** | `AC-03` | Integration | Request with valid `Authorization: Bearer <token>`. | `GET /api/v1/auth/me` | HTTP 200 OK; Returns authenticated user profile. |
| **TEST-05** | `AC-03` | Security | Request with no Authorization header or forged JWT signature. | `GET /api/v1/auth/me` | HTTP 401 Unauthorized; code `UNAUTHORIZED`. |
| **TEST-06** | `AC-04` | Integration | Authenticated user invokes logout endpoint. | `POST /api/v1/auth/logout` | HTTP 200 OK; Token JTI inserted into `RevokedToken` table. |
| **TEST-07** | `AC-04` | Security | Immediate subsequent request with previously logged-out token. | `GET /api/v1/auth/me` | HTTP 401 Unauthorized; code `TOKEN_REVOKED`. |
| **TEST-08** | `AC-05` | Security | Authenticated Respondent attempting to create a survey. | `POST /api/v1/surveys` | HTTP 403 Forbidden; code `FORBIDDEN_ROLE`. |
| **TEST-09** | `AC-08` | Integration | Authenticated Owner with valid survey payload (title, category). | `POST /api/v1/surveys` | HTTP 201 Created; Survey created with status `DRAFT`. |
| **TEST-10** | `AC-08` | Boundary | Survey creation payload with title < 5 characters or > 120 characters. | `POST /api/v1/surveys` | HTTP 422 Unprocessable Entity; validation error details returned. |
| **TEST-11** | `AC-09` | Integration | Owner adds a valid Rating question to existing draft survey. | `POST /api/v1/surveys/:id/questions` | HTTP 201 Created; Question persisted with `orderIndex`. |
| **TEST-12** | `AC-09` | Integration | Owner adds Single Choice question with options. | `POST /api/v1/surveys/:id/questions` | HTTP 201 Created; Question and options saved via cascade. |
| **TEST-13** | `AC-10` | Boundary | Draft survey already has 25 questions; owner attempts 26th. | `POST /api/v1/surveys/:id/questions` | HTTP 422 Unprocessable Entity; code `QUESTION_LIMIT_EXCEEDED`. |
| **TEST-14** | `AC-17` | DB / TDD | Respondent attempts second submission for same survey. | `POST /api/v1/surveys/:id/responses` | HTTP 409 Conflict; code `DUPLICATE_SUBMISSION`; DB unique constraint fires. |
| **TEST-15** | `AC-12` | Integration | Owner publishes draft survey containing 2 configured questions. | `POST /api/v1/surveys/:id/publish` | HTTP 200 OK; Survey status updated to `PUBLISHED`. |
| **TEST-16** | `AC-13` | Rule / TDD | Owner attempts to publish draft survey containing 0 questions. | `POST /api/v1/surveys/:id/publish` | HTTP 422 Unprocessable Entity; code `EMPTY_SURVEY_CANNOT_PUBLISH`. |
| **TEST-17** | `AC-11` | Security | Owner attempts to add question to survey in `PUBLISHED` status. | `POST /api/v1/surveys/:id/questions` | HTTP 400 Bad Request; code `SURVEY_NOT_IN_DRAFT`. |
| **TEST-18** | `AC-14` | Workflow | Owner closes an active published survey. | `POST /api/v1/surveys/:id/close` | HTTP 200 OK; Survey status updated to `CLOSED`. |
| **TEST-19** | `AC-16` | Rule / TDD | Respondent attempts submission to `CLOSED` survey. | `POST /api/v1/surveys/:id/responses` | HTTP 400 Bad Request; code `SURVEY_NOT_ACCEPTING_RESPONSES`. |
| **TEST-20** | `AC-16` | Rule / TDD | Respondent attempts submission to `DRAFT` survey. | `POST /api/v1/surveys/:id/responses` | HTTP 400 Bad Request; code `SURVEY_NOT_ACCEPTING_RESPONSES`. |
| **TEST-21** | `AC-18` | Rule / TDD | Survey Owner attempts to submit a response to their own survey. | `POST /api/v1/surveys/:id/responses` | HTTP 403 Forbidden; code `OWNER_CANNOT_RESPOND`. |
| **TEST-22** | `AC-01` | Unit | Role string other than `SURVEY_OWNER` or `RESPONDENT` (e.g., `ADMIN`). | Registration validator | Zod validation fails; returns invalid enum error. |
| **TEST-23** | `AC-12` | Unit / TDD | Domain service rule checking publish precondition. | `canPublishSurvey(survey)` | Returns false when questions array is empty. |
| **TEST-24** | `AC-10` | Unit | Domain service question limit boundary check ($N=25$). | `canAddQuestion(count)` | Returns false when count is 25. |
| **TEST-25** | `AC-11` | Integration | Attempting to update title of a `PUBLISHED` survey. | `PATCH /api/v1/surveys/:id` | HTTP 400 Bad Request; code `SURVEY_IMMUTABLE`. |
| **TEST-26** | `AC-15` | Integration | Valid respondent submits answers to published survey. | `POST /api/v1/surveys/:id/responses` | HTTP 201 Created; Response record created with foreign keys. |
| **TEST-27** | `AC-18` | Security | Owner token passed to submission route for own survey. | `POST /api/v1/surveys/:id/responses` | HTTP 403 Forbidden; rejected at service layer. |
| **TEST-28** | `AC-07` | Security | Respondent A requests submission receipt of Respondent B. | `GET /api/v1/responses/:id` | HTTP 403 Forbidden or 404; query scoped to current user. |
| **TEST-29** | `AC-06` | Security | Owner A requests analytics or publish for Owner B's survey. | `GET /api/v1/surveys/:id/analytics` | HTTP 403 Forbidden; code `FORBIDDEN_OWNERSHIP`. |
| **TEST-30** | `AC-01` | Unit | Password hashing verification on user registration. | Direct DB query after create | `passwordHash` starts with `$2a$` or `$2b$` and $\neq$ raw password. |
| **TEST-31** | `AC-19` | Boundary | Rating answer submitted with value `0` or `6`. | `POST /api/v1/surveys/:id/responses` | HTTP 422 Unprocessable Entity; code `RATING_OUT_OF_RANGE`. |
| **TEST-32** | `AC-15` | Boundary | Required text question submitted with whitespace-only. | `POST /api/v1/surveys/:id/responses` | HTTP 422 Unprocessable Entity; code `EMPTY_REQUIRED_ANSWER`. |
| **TEST-33** | `AC-08` | DB Cascade | Owner deletes draft survey containing 3 questions. | `DELETE /api/v1/surveys/:id` | HTTP 200 OK; Question records in DB automatically deleted. |
| **TEST-34** | `AC-20` | Unit / Calc | Aggregate calculation of ratings: scores `[5, 4, 5, 2]`. | `computeRatingSummary()` | Returns `averageScore = 4.00`, total count = 4, correct distribution. |

---

## 3. Test-Driven Development (TDD) Evidence Register
As mandated by course policy, core business rules must be verified through demonstrable failing (RED) test runs followed by passing (GREEN) implementations:
- **TDD Candidate 1 (Single Submission Rule BR-06 / TEST-14):** Test asserts duplicate response rejection via HTTP 409. (Initial RED prior to constraint hook $\rightarrow$ GREEN after unique index).
- **TDD Candidate 2 (Empty Survey Publish Block BR-02 / TEST-16):** Test asserts rejection of publishing 0-question survey with HTTP 422. (Initial RED $\rightarrow$ GREEN after domain pre-check).
- **TDD Candidate 3 (Owner Self-Response Prevention BR-07 / TEST-21):** Test asserts rejection of owner answering own survey with HTTP 403. (Initial RED $\rightarrow$ GREEN).
- **TDD Candidate 4 (Rating Boundary Bounds BR-12 / TEST-31):** Test asserts rejection of out-of-range ratings ($<1$ or $>5$). (Initial RED $\rightarrow$ GREEN).
