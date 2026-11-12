# Feature Inventory (Part B)
**Course:** CPE 334 Introduction to Software Engineering in the Age of AI Agents  
**Theme 10:** Review, Feedback, and Survey System (UniPulse)  
**Document Version:** 1.0.0  

---

## 1. Feature Catalog Overview
This catalog enumerates all planned system features (`F-01` to `F-21`) spanning the complete product lifecycle across Sprints 1, 2, and 3. Each feature has a unique identifier, target sprint allocation, associated user role, linked requirements, and planned implementation scope.

---

## 2. Sprint 1 Feature Inventory (Engineering Baseline & Slice)

| Feature ID | Feature Title | Target Sprint | Primary Actor | Associated Requirements | Description & Scope |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **F-01** | User Authentication & Session Lifecycle | Sprint 1 | All Actors | FR-01, FR-02, FR-03, FR-04, BR-01, BR-11, BR-13, NFR-02, NFR-05 | Registration, login with bcrypt password comparison, JWT token issuance, session verification via `/api/auth/me`, and logout with database token revocation. |
| **F-02** | Role & Ownership Authorization Guards | Sprint 1 | All Actors | BR-01, BR-07, BR-08, BR-10, NFR-02 | Express middleware enforcing role checks (`requireRole`) and database-query ownership filtering preventing cross-user data leakage. |
| **F-03** | Create Draft Survey with Validation Limits | Sprint 1 | Survey Owner | FR-05, BR-02, BR-03, NFR-03 | Survey creation modal/endpoint accepting title, description, and category with character limits (title: 5-120 chars, max 25 questions). |
| **F-04** | Survey Question Authoring | Sprint 1 | Survey Owner | FR-06, FR-07, BR-02, BR-03, BR-04, BR-12, BR-13 | Adding, editing, and removing Text, Single Choice, and Rating Scale (1-5) questions while in `DRAFT` status. |
| **F-05** | Survey Lifecycle Management (Publish & Close) | Sprint 1 | Survey Owner | FR-08, FR-09, BR-02, BR-04, BR-05, BR-10 | State transitions from `DRAFT` $\rightarrow$ `PUBLISHED` (requires $\ge 1$ question) and `PUBLISHED` $\rightarrow$ `CLOSED`. Locking edits upon publish. |
| **F-06** | Browse Published Surveys | Sprint 1 | Respondent | FR-10, BR-05, NFR-06, NFR-11 | Catalog page displaying list of currently active `PUBLISHED` surveys with completion status indicator for current respondent. |
| **F-07** | Survey Details & Question Rendering | Sprint 1 | Respondent | FR-11, BR-05, NFR-06 | Clean form UI rendering active survey questions, validation hints, required badges, and response controls. |
| **F-08** | Response Submission & Persistence | Sprint 1 | Respondent | FR-12, FR-13, BR-05, BR-07, BR-12, BR-13, NFR-01, NFR-04 | Validating submitted answers on server, executing transactional database write of `Response` and `Answer` entities. |
| **F-09** | Duplicate Submission Prevention | Sprint 1 | Respondent | FR-14, BR-06, NFR-03 | Detecting previous responses via database unique constraint `(surveyId, respondentId)` and returning standard 409 Conflict error. |
| **F-10** | Personal Submission History & Receipts | Sprint 1 | Respondent | FR-15, BR-08, NFR-02 | Dedicated page for respondents to view their previous submissions and timestamped answers without access to others' records. |
| **F-12** | Aggregate Results Summary Dashboard | Sprint 1 | Survey Owner | FR-16, FR-17, BR-10, NFR-04, NFR-12 | Owner-only analytics screen displaying total responses, rating averages, and selection counts computed via backend SQL aggregation. |

---

## 3. Sprint 2 Feature Inventory (Core Expansion)

| Feature ID | Feature Title | Target Sprint | Primary Actor | Associated Requirements | Description & Scope |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **F-13** | Anonymous Response Mode | Sprint 2 | Both Roles | FR-18, NFR-12 | Architectural isolation separating user identity verification tokens from stored answer payloads to guarantee voter privacy. |
| **F-14** | Advanced Question Types | Sprint 2 | Survey Owner | FR-06, BR-03 | Support for Multiple Choice (multi-select checkboxes), Likert agreement scales, and formatted instructions. |
| **F-15** | Scheduled Expiry & Automatic Closure | Sprint 2 | Survey Owner | FR-20, BR-05 | Configurable closing date/time with automated backend worker and pre-submission cutoff checking. |
| **F-16** | Respondent Eligibility & Access Control | Sprint 2 | Survey Owner | FR-19, BR-08 | Restricting survey participation by target academic cohorts or invitation access keys. |
| **F-17** | Survey Duplication & Template Cloning | Sprint 2 | Survey Owner | FR-05, FR-07 | One-click duplication of existing surveys to rapidly generate recurrent term surveys. |

---

## 4. Sprint 3 Feature Inventory (Completion & Hardening)

| Feature ID | Feature Title | Target Sprint | Primary Actor | Associated Requirements | Description & Scope |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **F-18** | Visual Analytics & Distribution Charts | Sprint 3 | Survey Owner | FR-16, FR-17 | Rich interactive charts (bar charts for choice distribution, score distribution curves for rating questions). |
| **F-19** | Survey Results Export (CSV / JSON) | Sprint 3 | Survey Owner | FR-21, BR-10 | Authenticated download of aggregated and anonymized survey datasets in structured CSV and JSON formats. |
| **F-20** | Health Check & System Observability | Sprint 3 | System Admin | NFR-01, NFR-04 | Production `/api/health` endpoint monitoring database connectivity, uptime, memory, and migration version. |
| **F-21** | Error Resilience & Hardening | Sprint 3 | All Actors | NFR-01, NFR-03, NFR-06 | Comprehensive boundary testing, input fuzzing resilience, graceful database reconnection, and accessible UI enhancements. |

---

## 5. Scope Governance & Change Proposals

| Proposal ID | Target Item | Description of Change | Rationale | Approval Status |
| :--- | :--- | :--- | :--- | :--- |
| **CP-01** | `F-05` / `FR-09` | Moved manual Survey Closure from Sprint 2 into Sprint 1. | Allows full end-to-end testing of `CLOSED` state rejection rules (`BR-05`) during Sprint 1 evaluation. | **Approved** |
| **CP-02** | `BR-09` | Withdrew requirement for automatic response quota termination in Sprint 1. | Replaced with explicit manual owner closure (`FR-09`) and Sprint 2 scheduled deadline (`FR-20`). | **Approved** |
| **CP-03** | `BR-03` | Capped question count at 25 questions per survey. | Prevents excessive payload size and ensures predictable rendering performance on mobile browsers. | **Approved** |
