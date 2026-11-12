# Software Requirements Specification (SRS) & Product Scope
**Course:** CPE 334 Introduction to Software Engineering in the Age of AI Agents  
**Semester:** 1/2026  
**Theme 10:** Review, Feedback, and Survey System  
**Product Title:** UniPulse – Campus Feedback & Course Survey Platform  
**Document Version:** 1.0.0 (Baseline for Deliverable 1)  

---

## 1. Stakeholder Problem & Context

### 1.1 Problem Statement
In university environments and academic organizations, gathering structured feedback regarding courses, laboratory workshops, instructor guidance, and extracurricular activities is essential for quality assurance. However, existing manual or generic survey forms often lack:
1. Strict server-enforced role boundaries separating survey administrators/instructors from student respondents.
2. Robust database-level duplicate prevention ensuring each student submits exactly one evaluated response per active survey.
3. Guaranteed survey state lifecycles (`DRAFT`, `PUBLISHED`, `CLOSED`) that prevent data tampering while a survey is live.
4. Fast, dependable aggregation of feedback metrics for instructors without compromising respondent record privacy.

### 1.2 System Purpose & Chosen Context
**UniPulse** is a robust, full-stack web application designed for academic departments. It enables **Survey Owners** (instructors, teaching assistants, and event coordinators) to author surveys, configure validated questions, publish surveys with strict lifecycle control, and inspect real-time aggregate summaries. Concurrently, **Respondents** (enrolled students) can discover published surveys, submit validated feedback without duplicate voting, and inspect their own personal submission receipts.

---

## 2. Actors & Responsibilities

| Actor | Role Key | Description & Responsibilities |
| :--- | :--- | :--- |
| **Survey Owner** | `SURVEY_OWNER` | Faculty member, instructor, or event administrator who authors survey drafts, edits questions, publishes surveys, closes completed surveys, and accesses analytical aggregate reports. |
| **Respondent** | `RESPONDENT` | Enrolled student or participant who authenticates, reviews published surveys, submits verified answers once per survey, and retrieves personal submission receipts. |
| **Unauthenticated Visitor** | `GUEST` | Any external user requesting access to protected application routes or endpoints without valid authentication credentials; strictly restricted to login/registration endpoints. |

---

## 3. Product Scope & Exclusions

### 3.1 In-Scope (Three-Sprint Roadmap)
- Secure authentication system with bcrypt password hashing, JWT session lifecycle, and database-backed token revocation on logout.
- Strict server-side role and ownership authorization checks (enforced at middleware and query levels).
- Comprehensive survey lifecycle management: `DRAFT` $\rightarrow$ `PUBLISHED` $\rightarrow$ `CLOSED`.
- Authoring validated questions: Text responses, Single-choice (Radio), Multiple-choice (Checkbox), and Rating scale (1 to 5).
- Atomic response submissions with guaranteed single-submission rule enforced by database constraints.
- Real-time aggregate metric calculations (average rating, option selection percentages, total submission counters).
- End-to-end containerization via Docker and repeatable deployment pipeline targeting GCP Cloud Run and Cloud SQL.

### 3.2 Explicit Exclusions (Out-of-Scope)
- Integration with external third-party email delivery services (e.g., SendGrid/SES) or SMS OTP providers. Synthetic/local verification is used.
- Third-party payment gateways, monetary rewards, or commercial e-commerce features.
- Single Sign-On (SSO) federation with SAML/Active Directory or OAuth2 providers; local secure credential management is used.
- Automated AI sentiment analysis or natural language generation of survey summaries.

---

## 4. Functional Requirements (FR)

| Requirement ID | Title | Description | Target Sprint |
| :--- | :--- | :--- | :--- |
| **FR-01** | User Registration | System shall allow new users to register by providing name, valid institutional email, password, and designated role. | Sprint 1 |
| **FR-02** | User Authentication | System shall authenticate users via email and password, returning a signed JWT access token upon success. | Sprint 1 |
| **FR-03** | Identity Retrieval | System shall provide a `/api/auth/me` endpoint to retrieve authenticated user profile and assigned role. | Sprint 1 |
| **FR-04** | User Logout | System shall terminate user session and record token hash in `RevokedToken` table to invalidate subsequent requests. | Sprint 1 |
| **FR-05** | Create Draft Survey | Survey Owners shall be able to create new survey headers with title, description, and target category. | Sprint 1 |
| **FR-06** | Question Authoring | Survey Owners shall add, edit, order, and delete questions (Text, Single Choice, Rating) within draft surveys. | Sprint 1 |
| **FR-07** | Update Draft Survey | Survey Owners shall edit metadata and question details while survey remains in `DRAFT` status. | Sprint 1 |
| **FR-08** | Publish Survey | Survey Owners shall transition a draft survey to `PUBLISHED` status, opening it for responses. | Sprint 1 |
| **FR-09** | Close Survey | Survey Owners shall transition a published survey to `CLOSED` status, terminating response collection. | Sprint 1 |
| **FR-10** | Browse Published Surveys | Authenticated Respondents shall list all currently `PUBLISHED` surveys available for submission. | Sprint 1 |
| **FR-11** | Inspect Survey Details | Respondents shall fetch survey details and active questions for published surveys. | Sprint 1 |
| **FR-12** | Submit Identified Response | Respondents shall submit answers to all required questions of a published survey under authenticated identity. | Sprint 1 |
| **FR-13** | Validation of Responses | Server shall validate that all required questions have valid answers adhering to question type rules. | Sprint 1 |
| **FR-14** | Duplicate Rejection | Server shall detect and reject subsequent response submissions from the same respondent for the same survey. | Sprint 1 |
| **FR-15** | Personal Submission History | Respondents shall view their own past submissions and verified answer records. | Sprint 1 |
| **FR-16** | Aggregate Result Summary | Survey Owners shall view aggregate statistics for their own published or closed surveys. | Sprint 1 |
| **FR-17** | Metric Computation | Server shall calculate total responses, average scores for rating questions, and percentage counts for choice questions. | Sprint 1 |
| **FR-18** | Anonymous Response Mode | Survey Owners may enable anonymous mode where respondent identity is detached from response records with cryptographic proof. | Sprint 2 |
| **FR-19** | Eligibility Restrictions | Survey Owners shall specify respondent eligibility criteria (e.g., specific academic cohorts/departments). | Sprint 2 |
| **FR-20** | Automated Closing Deadline | Survey Owners shall set an expiry timestamp after which the survey automatically closes for submissions. | Sprint 2 |
| **FR-21** | Data Export (CSV/JSON) | Survey Owners shall export aggregated results and sanitized responses in standard CSV and JSON formats. | Sprint 3 |

---

## 5. Business Rules (BR)

| Rule ID | Statement of Business Rule | Enforcement Mechanism |
| :--- | :--- | :--- |
| **BR-01** | User accounts must strictly belong to either `SURVEY_OWNER` or `RESPONDENT` role; roles cannot be escalated via client request payload. | Backend JWT payload verification & role authorization middleware. |
| **BR-02** | A survey must contain a valid title (5–120 characters) and at least 1 configured question before it can be transitioned to `PUBLISHED`. | Service-layer validation during publish transaction. |
| **BR-03** | A survey can have a maximum of 25 questions to ensure focused evaluation and maintainable performance. | API request schema validation & domain boundary check. |
| **BR-04** | Once a survey is transitioned to `PUBLISHED` or `CLOSED`, its title, description, questions, and options are immutable. | Pre-update check rejecting modifications if status $\neq$ `DRAFT`. |
| **BR-05** | Only surveys with status `PUBLISHED` shall accept response submissions. `DRAFT` and `CLOSED` surveys must reject submissions with error code `SURVEY_NOT_ACCEPTING_RESPONSES` (HTTP 400). | Submission controller status pre-check. |
| **BR-06** | A respondent can submit at most ONE response per survey. Any subsequent submission attempt must be rejected with error code `DUPLICATE_SUBMISSION` (HTTP 409). | Database composite unique constraint `@@unique([surveyId, respondentId])` and pre-flight query. |
| **BR-07** | A Survey Owner cannot submit responses to their own created surveys to prevent conflict of interest. | Server-side validation comparing `survey.ownerId` with `auth.userId`. |
| **BR-08** | Respondents are strictly forbidden from viewing another respondent's individual answers or submissions. | Query-scoping (`WHERE respondentId = auth.userId`) returning HTTP 403/404. |
| **BR-09** | *(Withdrawn per Change Proposal CP-02)* Replaced with explicit owner-controlled status transition and scheduled deadline. | Documented change governance in Part B. |
| **BR-10** | Survey aggregate analytics, question details of drafts, and closure controls are restricted strictly to the survey's author. | Ownership authorization guard (`survey.ownerId === auth.userId`). |
| **BR-11** | User passwords must be stored using bcrypt with a work factor (cost) of 12; plaintext passwords are strictly forbidden. | Authentication model pre-save hook. |
| **BR-12** | Rating scale questions must accept numeric integer responses strictly within the inclusive range $[1, 5]$. | Input schema validation returning HTTP 422 if violated. |
| **BR-13** | Text questions marked as required must have non-empty answer strings between 1 and 1000 characters. | Payload validator trimming whitespace. |
| **BR-14** | When a survey is deleted (only permissible while in `DRAFT`), all associated questions and draft relations must cascade delete cleanly. | Database foreign key `ON DELETE CASCADE`. |

---

## 6. Non-Functional Requirements (NFR)

| NFR ID | Category | Requirement & Measurable Target | Verification Sprint & Method |
| :--- | :--- | :--- | :--- |
| **NFR-01** | Performance | API endpoints for survey retrieval and response submission must respond within $\le 500$ ms for 95th percentile under normal local load (50 req/sec). | Sprint 1: Integration & load benchmark test. |
| **NFR-02** | Security | Protected API endpoints must reject unauthenticated requests with HTTP 401 and unauthorized roles with HTTP 403, leaking zero protected data. | Sprint 1: Automated security unit & API tests (`TEST-03`, `TEST-04`). |
| **NFR-03** | Interface Consistency | All API responses must adhere to uniform JSON envelopes: `{ data: ... }` for success and `{ error: { code, message, details } }` for errors. | Sprint 1: API contract test suite. |
| **NFR-04** | Data Persistence | All domain entities must persist in a relational PostgreSQL database surviving container/service restart with zero data loss. | Sprint 1: Docker restart integration verification. |
| **NFR-05** | Credential Security | Passwords must be hashed using bcrypt (cost 12); no plaintext credentials stored or logged. | Sprint 1: Database inspection test. |
| **NFR-06** | Usability & States | UI must provide explicit Loading, Empty, Success, and Error states for all user journeys. | Sprint 1: E2E Playwright journey tests. |
| **NFR-07** | Maintainability & Types | TypeScript strict mode enabled across backend and frontend, achieving zero compiler errors. | Sprint 1: Build command check (`tsc --noEmit`). |
| **NFR-08** | Container Readiness | Entire application must package into standardized Docker containers with externalized environment configuration. | Sprint 2 / Lab 5: Docker build and run verification. |
| **NFR-09** | Cloud Deployability | Application must be deployable to GCP Cloud Run with Cloud SQL database connectivity. | Sprint 2 / Lab 5: GCP deployment check. |
| **NFR-10** | Seed Reproducibility | `npm run db:seed` command must execute idempotently, populating deterministic test accounts and sample surveys. | Sprint 1: CI seed test execution. |
| **NFR-11** | Zero Draft Leakage | Public survey discovery endpoints must never return draft surveys or their questions to non-owner users. | Sprint 1: API authorization test (`TEST-10`). |
| **NFR-12** | Privacy Guarantee | Individual response identities must not appear in aggregate survey summaries or statistical metrics. | Sprint 1: Unit & integration test (`TEST-28`). |

---

## 7. Architectural Decisions & Assumptions

- **D-01: Modular Monolith Architecture:** Selected React 18 (Vite SPA) + Node.js (Express API) + Prisma ORM + PostgreSQL. This provides high development velocity, end-to-end TypeScript safety, and satisfies the course requirement without microservice operational overhead.
- **D-02: Stateless JWT with Database Blacklist:** Authentication uses signed HS256 JSON Web Tokens with a 24-hour expiration. Logout records the token JTI in a `RevokedToken` table to achieve immediate revocation while keeping standard requests fast.
- **D-03: Relational Integrity for Duplicate Prevention:** Enforce the single-submission rule (`BR-06`) at the database level via a composite unique index on `Response(surveyId, respondentId)`, preventing race conditions during concurrent submissions.
- **D-04: Authoritative Server Calculations:** All aggregate statistics (means, response totals, percentages) are calculated authoritatively on the backend using SQL aggregation rather than in client memory.
- **D-05: Seed Accounts for Evaluation:** Seed script initializes deterministic test users:
  - `owner1@unipulse.edu` (Survey Owner, Password: `Password123!`)
  - `owner2@unipulse.edu` (Secondary Survey Owner for cross-access testing)
  - `student1@unipulse.edu` (Respondent 1, Password: `Password123!`)
  - `student2@unipulse.edu` (Respondent 2, Password: `Password123!`)
- **D-06: Environment Isolation:** Sensitive variables (`DATABASE_URL`, `JWT_SECRET`, `PORT`) are managed via `.env` files and `.env.example`, strictly kept out of Git.
- **D-07: Uniform REST Error Schema:** All API failures return standard HTTP status codes accompanied by `{ error: { code: string, message: string, details?: any } }`.
- **D-08: Target Cloud Platform:** Designed for containerized deployment on Google Cloud Run with Google Cloud SQL for PostgreSQL.
- **D-09: TDD Discipline:** All critical business rules (`BR-02`, `BR-05`, `BR-06`, `BR-07`, `BR-12`) require automated unit/integration tests demonstrating red (failing) state prior to implementation.
- **D-10: Git Workflow Governance:** Work progresses from Issue $\rightarrow$ Feature Branch $\rightarrow$ Pull Request into `sprint-1` with teammate review approval before merging.
