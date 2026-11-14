# Sprint 1 Feature Engineering Contracts (Part E)
**Course:** CPE 334 Introduction to Software Engineering in the Age of AI Agents  
**Theme 10:** Review, Feedback, and Survey System (UniPulse)  
**Document Version:** 1.0.0 (Pre-Implementation Baseline)  

---

## 1. Overview of Sprint 1 Contracts
This document specifies pre-implementation engineering contracts for all features implemented in Sprint 1 (`F-01` through `F-10`, and `F-12`). Each contract defines observable behaviors, endpoint paths, request/response schemas, validation rules, error formats, and Acceptance Criteria (AC).

---

## 2. Feature Contract: F-01 Authentication & Session Management
- **Linked Requirements:** `FR-01`, `FR-02`, `FR-03`, `FR-04`, `BR-01`, `BR-11`, `BR-13`, `NFR-02`, `NFR-05`
- **Responsible Components:** `AuthController`, `AuthService`, `JwtService`, `RevokedTokenRepository`

### API Specifications
1. **Register User:** `POST /api/v1/auth/register`
   - **Request:**
     ```json
     {
       "email": "student1@unipulse.edu",
       "password": "Password123!",
       "fullName": "Student One",
       "role": "RESPONDENT"
     }
     ```
   - **Validation:** Email must match valid email format; password $\ge 8$ chars with letters and numbers; role $\in$ `['SURVEY_OWNER', 'RESPONDENT']`.
   - **Response (201 Created):**
     ```json
     {
       "data": {
         "id": "usr_abc123",
         "email": "student1@unipulse.edu",
         "fullName": "Student One",
         "role": "RESPONDENT",
         "createdAt": "2026-11-12T10:00:00.000Z"
       }
     }
     ```
   - **Errors:** `400 EMAIL_ALREADY_EXISTS`, `422 INVALID_PAYLOAD`.

2. **Login User:** `POST /api/v1/auth/login`
   - **Request:** `{ "email": "student1@unipulse.edu", "password": "Password123!" }`
   - **Response (200 OK):**
     ```json
     {
       "data": {
         "token": "eyJhbGciOi...",
         "user": {
           "id": "usr_abc123",
           "email": "student1@unipulse.edu",
           "fullName": "Student One",
           "role": "RESPONDENT"
         }
       }
     }
     ```
   - **Errors:** `401 INVALID_CREDENTIALS`.

3. **Get Current Identity:** `GET /api/v1/auth/me`
   - **Headers:** `Authorization: Bearer <token>`
   - **Response (200 OK):** Returns authenticated user object.
   - **Errors:** `401 UNAUTHORIZED`, `401 TOKEN_REVOKED`.

4. **Logout User:** `POST /api/v1/auth/logout`
   - **Headers:** `Authorization: Bearer <token>`
   - **Behavior:** Extracts `jti` from JWT and creates a record in `RevokedToken` table with token expiration time.
   - **Response (200 OK):** `{ "data": { "message": "Successfully logged out" } }`

### Acceptance Criteria
- **AC-01:** Successful registration creates user with bcrypt-hashed password and returns 201 without plaintext password in response.
- **AC-02:** Login with valid credentials returns a 24-hour signed JWT; login with incorrect password returns 401 with generic message.
- **AC-03:** Valid Bearer token returns current user info; unauthenticated or malformed requests return 401.
- **AC-04:** Calling `/logout` invalidates the token; immediate subsequent use of the same token returns 401 `TOKEN_REVOKED`.

---

## 3. Feature Contract: F-02 Server-Side Role & Ownership Authorization
- **Linked Requirements:** `BR-01`, `BR-07`, `BR-08`, `BR-10`, `NFR-02`
- **Responsible Components:** `authMiddleware`, `requireRole('SURVEY_OWNER' | 'RESPONDENT')`, `ownershipGuard`

### Behavior & Enforcement Rules
- **Role Enforcement:** Endpoints intended for instructors/creators use `requireRole('SURVEY_OWNER')`. If an authenticated respondent attempts access, server immediately responds with HTTP 403:
  ```json
  { "error": { "code": "FORBIDDEN_ROLE", "message": "Access denied. Requires SURVEY_OWNER role." } }
  ```
- **Ownership Scoping:** When updating or publishing a survey, or retrieving analytics, server verifies `survey.ownerId === req.user.id`. If another owner attempts modification, server responds with HTTP 403 `FORBIDDEN_OWNERSHIP`.
- **Respondent Privacy:** Respondent query `/api/v1/responses/my-history` hardcodes `WHERE respondentId = req.user.id`. Attempting to pass another user's ID via query param or payload is ignored.

### Acceptance Criteria
- **AC-05:** Authenticated Respondent accessing Survey Owner endpoints receives HTTP 403.
- **AC-06:** Owner A cannot modify, publish, or view analytics for surveys owned by Owner B (returns HTTP 403).
- **AC-07:** Respondent cannot view individual answer records of another respondent.

---

## 4. Feature Contract: F-03 & F-04 Survey Drafting & Question Authoring
- **Linked Requirements:** `FR-05`, `FR-06`, `FR-07`, `BR-02`, `BR-03`, `BR-04`, `BR-12`, `BR-13`, `BR-14`
- **Responsible Components:** `SurveyController`, `QuestionController`, `SurveyService`

### API Specifications
1. **Create Survey Header:** `POST /api/v1/surveys`
   - **Headers:** `Authorization: Bearer <owner_token>`
   - **Request:**
     ```json
     {
       "title": "CPE 334 Lab 4 Course Feedback",
       "description": "Please provide your candid review of Lab 4 modules.",
       "category": "Course Evaluation"
     }
     ```
   - **Validation:** Title (5–120 characters); description (optional, $\le 500$ chars); status defaults to `DRAFT`.
   - **Response (201 Created):** `{ "data": { "id": "srv_001", "status": "DRAFT", ... } }`

2. **Add Question to Survey:** `POST /api/v1/surveys/:id/questions`
   - **Headers:** `Authorization: Bearer <owner_token>`
   - **Request:**
     ```json
     {
       "prompt": "How effective was the automated testing workshop?",
       "questionType": "RATING",
       "isRequired": true,
       "orderIndex": 1
     }
     ```
   - **Validation:** Survey must be in `DRAFT` status; question prompt 3–300 chars; total questions $\le 25$.
   - **Response (201 Created):** Returns created question object.
   - **Errors:** `400 SURVEY_NOT_IN_DRAFT`, `422 QUESTION_LIMIT_EXCEEDED` (if $>25$).

3. **Delete Draft Survey:** `DELETE /api/v1/surveys/:id`
   - **Headers:** `Authorization: Bearer <owner_token>`
   - **Behavior:** Cascades and deletes all draft questions. Allowed only when `status === 'DRAFT'`.

### Acceptance Criteria
- **AC-08:** Owner can create a survey draft with title and category.
- **AC-09:** Owner can add Text, Single Choice, and Rating questions to draft surveys.
- **AC-10:** Adding a 26th question to a survey draft is rejected with HTTP 422.
- **AC-11:** Modifying questions on a survey that is already `PUBLISHED` or `CLOSED` returns HTTP 400.

---

## 5. Feature Contract: F-05 Survey Lifecycle Management (Publish & Close)
- **Linked Requirements:** `FR-08`, `FR-09`, `BR-02`, `BR-04`, `BR-05`, `BR-10`
- **Responsible Components:** `SurveyLifecycleService`

### API Specifications
1. **Publish Survey:** `POST /api/v1/surveys/:id/publish`
   - **Headers:** `Authorization: Bearer <owner_token>`
   - **Pre-Conditions:** Status must be `DRAFT`; count of questions must be $\ge 1$.
   - **Behavior:** Transitions status to `PUBLISHED`; locks question edits.
   - **Response (200 OK):** `{ "data": { "id": "srv_001", "status": "PUBLISHED", "updatedAt": "..." } }`
   - **Errors:** `422 EMPTY_SURVEY_CANNOT_PUBLISH` (if questions count is 0), `400 INVALID_STATE_TRANSITION`.

2. **Close Survey:** `POST /api/v1/surveys/:id/close`
   - **Headers:** `Authorization: Bearer <owner_token>`
   - **Pre-Conditions:** Status must be `PUBLISHED`.
   - **Behavior:** Transitions status to `CLOSED`; prevents future response submissions.
   - **Response (200 OK):** `{ "data": { "id": "srv_001", "status": "CLOSED" } }`

### Acceptance Criteria
- **AC-12:** Publishing a draft survey with at least 1 question transitions status to `PUBLISHED`.
- **AC-13:** Publishing a draft survey with 0 questions is rejected with HTTP 422.
- **AC-14:** Owner can close a published survey; once closed, responses can no longer be accepted.

---

## 6. Feature Contract: F-06, F-07, F-08, F-09 Response Submission & Duplicate Prevention
- **Linked Requirements:** `FR-10`, `FR-11`, `FR-12`, `FR-13`, `FR-14`, `BR-05`, `BR-06`, `BR-07`, `BR-12`, `BR-13`, `NFR-01`, `NFR-04`
- **Responsible Components:** `ResponseController`, `ResponseService`, `PrismaClient`

### API Specifications
1. **Browse Published Surveys:** `GET /api/v1/surveys`
   - **Headers:** `Authorization: Bearer <token>`
   - **Behavior:** If role is `RESPONDENT`, returns only surveys where `status = 'PUBLISHED'`, including a boolean `hasSubmitted` flag indicating if the current user has already submitted.
   - **Response (200 OK):** `{ "data": [ { "id": "srv_001", "title": "...", "hasSubmitted": false } ] }`

2. **Submit Survey Response:** `POST /api/v1/surveys/:id/responses`
   - **Headers:** `Authorization: Bearer <respondent_token>`
   - **Request:**
     ```json
     {
       "answers": [
         {
           "questionId": "qst_001",
           "textValue": "The hands-on lab manual was exceptionally detailed."
         },
         {
           "questionId": "qst_002",
           "selectedOptionId": "opt_choice_a"
         },
         {
           "questionId": "qst_003",
           "numericValue": 5
         }
       ]
     }
     ```
   - **Server Validation & Constraints:**
     1. Survey must exist and have `status === 'PUBLISHED'`. If `DRAFT` or `CLOSED`, reject with HTTP 400.
     2. Authenticated user must NOT be the survey owner (`BR-07`). If matching, reject with HTTP 403 `OWNER_CANNOT_RESPOND`.
     3. Check uniqueness on `(surveyId, respondentId)`. If record exists or throws unique constraint violation, reject with HTTP 409 `DUPLICATE_SUBMISSION`.
     4. Rating question answers must be integers within $[1, 5]$. If outside bounds, reject with HTTP 422 `RATING_OUT_OF_RANGE`.
     5. All required questions must have valid non-empty answers.
   - **Response (201 Created):**
     ```json
     {
       "data": {
         "responseId": "rsp_987",
         "surveyId": "srv_001",
         "submittedAt": "2026-11-12T10:30:00.000Z",
         "answersRecorded": 3
       }
     }
     ```

### Acceptance Criteria
- **AC-15:** Respondent successfully submits answers to a published survey; answers persist in database and receipt is returned with 201.
- **AC-16:** Submitting a response to a `CLOSED` or `DRAFT` survey is rejected with HTTP 400 `SURVEY_NOT_ACCEPTING_RESPONSES`.
- **AC-17:** A second submission attempt by the same respondent for the same survey is rejected with HTTP 409 `DUPLICATE_SUBMISSION`.
- **AC-18:** Survey Owner attempting to submit a response to their own survey is rejected with HTTP 403 `OWNER_CANNOT_RESPOND`.
- **AC-19:** Submitting a rating answer with value `< 1` or `> 5` is rejected with HTTP 422.

---

## 7. Feature Contract: F-10 & F-12 Submission Receipts & Owner Analytics
- **Linked Requirements:** `FR-15`, `FR-16`, `FR-17`, `BR-08`, `BR-10`, `NFR-12`
- **Responsible Components:** `AnalyticsController`, `AnalyticsService`

### API Specifications
1. **Get Personal Submission History:** `GET /api/v1/responses/my-history`
   - **Headers:** `Authorization: Bearer <respondent_token>`
   - **Response (200 OK):** List of surveys submitted by current user with submission timestamps and answers.

2. **Get Survey Aggregate Analytics:** `GET /api/v1/surveys/:id/analytics`
   - **Headers:** `Authorization: Bearer <owner_token>`
   - **Pre-Conditions:** User must be the owner of the survey (`BR-10`).
   - **Behavior:** Executes SQL aggregate queries (`COUNT`, `AVG`, `GROUP BY`) across recorded answers. Does NOT expose individual respondent identities or row-level respondent mappings.
   - **Response (200 OK):**
     ```json
     {
       "data": {
         "surveyId": "srv_001",
         "title": "CPE 334 Lab 4 Course Feedback",
         "status": "PUBLISHED",
         "totalResponses": 24,
         "questions": [
           {
             "questionId": "qst_003",
             "prompt": "How effective was the automated testing workshop?",
             "questionType": "RATING",
             "summary": {
               "averageScore": 4.62,
               "totalRatings": 24,
               "distribution": { "1": 0, "2": 0, "3": 2, "4": 5, "5": 17 }
             }
           },
           {
             "questionId": "qst_002",
             "prompt": "Preferred development workflow?",
             "questionType": "SINGLE_CHOICE",
             "summary": {
               "totalSelections": 24,
               "options": [
                 { "optionId": "opt_a", "label": "TDD", "count": 18, "percentage": 75.0 },
                 { "optionId": "opt_b", "label": "Code-first", "count": 6, "percentage": 25.0 }
               ]
             }
           }
         ]
       }
     }
     ```

### Acceptance Criteria
- **AC-20:** Survey Owner views aggregate metrics including total responses, average rating, and option frequencies.
- **AC-21:** Aggregate analytics endpoint returns zero respondent-identifying information, preserving voter anonymity in summaries.
- **AC-22:** Non-owner requesting analytics for another owner's survey is rejected with HTTP 403 `FORBIDDEN_OWNERSHIP`.
