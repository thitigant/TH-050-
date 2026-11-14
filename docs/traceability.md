# Requirements Traceability Matrix (Part B)
**Course:** CPE 334 Introduction to Software Engineering in the Age of AI Agents  
**Theme 10:** Review, Feedback, and Survey System (UniPulse)  
**Document Version:** 1.0.0  

---

## 1. Traceability Matrix Overview
This matrix establishes bi-directional traceability across all **46 active baseline requirements** (21 Functional Requirements, 13 active Business Rules, and 12 Non-Functional Requirements) to their realizing features, assigned sprint checkpoints, and planned verification methods.

---

## 2. Functional Requirements Traceability (FR)

| Req ID | Requirement Statement | Realizing Feature | Target Sprint | Planned Verification / Test ID | Acceptance Criteria |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **FR-01** | User Registration with Role Assignment | `F-01` | Sprint 1 | `TEST-01` (API Integration) | `AC-01` |
| **FR-02** | User Authentication via Credentials | `F-01` | Sprint 1 | `TEST-02` (API Integration) | `AC-02` |
| **FR-03** | Authenticated User Identity Retrieval | `F-01` | Sprint 1 | `TEST-03` (API Integration) | `AC-03` |
| **FR-04** | User Logout & Token Revocation | `F-01` | Sprint 1 | `TEST-04` (Security / Token) | `AC-04` |
| **FR-05** | Create Draft Survey Header | `F-03` | Sprint 1 | `TEST-05` (API & Unit) | `AC-05` |
| **FR-06** | Question Configuration & Ordering | `F-04` | Sprint 1 | `TEST-06` (API & Schema) | `AC-06` |
| **FR-07** | Update Draft Survey & Metadata | `F-04` | Sprint 1 | `TEST-07` (API Integration) | `AC-07` |
| **FR-08** | Publish Draft Survey | `F-05` | Sprint 1 | `TEST-08` (Workflow / API) | `AC-08` |
| **FR-09** | Close Published Survey Manually | `F-05` | Sprint 1 | `TEST-09` (Workflow / API) | `AC-09` |
| **FR-10** | Browse Published Surveys Catalog | `F-06` | Sprint 1 | `TEST-10` (UI & API) | `AC-10` |
| **FR-11** | Inspect Survey Questions for Submission | `F-07` | Sprint 1 | `TEST-11` (UI & API) | `AC-11` |
| **FR-12** | Submit Identified Survey Response | `F-08` | Sprint 1 | `TEST-12` (E2E Journey) | `AC-12` |
| **FR-13** | Validation of Response Completeness | `F-08` | Sprint 1 | `TEST-13` (Unit / Validator) | `AC-13` |
| **FR-14** | Duplicate Submission Detection & Reject | `F-09` | Sprint 1 | `TEST-14` (DB Constraint / API) | `AC-14` |
| **FR-15** | View Personal Submission Receipts | `F-10` | Sprint 1 | `TEST-15` (API & UI Query) | `AC-15` |
| **FR-16** | Owner Aggregate Summary Dashboard | `F-12` | Sprint 1 | `TEST-16` (Analytics API & UI) | `AC-16` |
| **FR-17** | Metric Calculation (Means & Counts) | `F-12` | Sprint 1 | `TEST-17` (Unit Calculation) | `AC-17` |
| **FR-18** | Anonymous Response Isolation | `F-13` | Sprint 2 | `TEST-18` (Cryptographic API) | `AC-18` |
| **FR-19** | Respondent Eligibility Checking | `F-16` | Sprint 2 | `TEST-19` (Authorization Rule) | `AC-19` |
| **FR-20** | Automated Closing Deadline | `F-15` | Sprint 2 | `TEST-20` (Time Worker / API) | `AC-20` |
| **FR-21** | Data Export to CSV & JSON | `F-19` | Sprint 3 | `TEST-21` (Export Stream Test) | `AC-21` |

---

## 3. Business Rules Traceability (BR)

| Rule ID | Rule Statement | Enforcing Feature | Target Sprint | Planned Verification / Test ID | Expected Outcome |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **BR-01** | Strict Role Allocation (`SURVEY_OWNER`, `RESPONDENT`) | `F-01`, `F-02` | Sprint 1 | `TEST-22` (Security Unit) | Invalid role values rejected with 400. |
| **BR-02** | Valid title (5–120 chars) and $\ge 1$ question to publish | `F-05` | Sprint 1 | `TEST-23` (TDD Domain Rule) | Publish rejected with 422 if 0 questions. |
| **BR-03** | Max 25 questions per survey | `F-04` | Sprint 1 | `TEST-24` (Boundary Unit) | Attempting 26th question rejected with 422. |
| **BR-04** | Immutability of questions after publishing | `F-04`, `F-05` | Sprint 1 | `TEST-25` (API Transition Rule) | Modifying published survey returns 400. |
| **BR-05** | Only `PUBLISHED` status accepts responses | `F-08` | Sprint 1 | `TEST-26` (Workflow Test) | Submitting to `DRAFT`/`CLOSED` rejected 400. |
| **BR-06** | Single submission per respondent per survey | `F-09` | Sprint 1 | `TEST-14` (Concurrent DB Test) | Second submission rejected with 409 Conflict. |
| **BR-07** | Owner cannot submit response to own survey | `F-08` | Sprint 1 | `TEST-27` (Authorization Test) | Owner submission returns 403 Forbidden. |
| **BR-08** | Respondent cannot access other respondents' data | `F-02`, `F-10` | Sprint 1 | `TEST-28` (Security Guard) | Cross-user query returns 403 or 404. |
| **BR-09** | *(Withdrawn via Change Proposal CP-02)* | N/A | N/A | N/A | Documented in Change Log. |
| **BR-10** | Owner analytics restricted to survey creator | `F-02`, `F-12` | Sprint 1 | `TEST-29` (Ownership Security) | Non-owner accessing analytics gets 403. |
| **BR-11** | Password hashed with bcrypt (cost 12) | `F-01` | Sprint 1 | `TEST-30` (DB Inspection) | Plaintext password never stored in DB. |
| **BR-12** | Rating answers bounded strictly within $[1, 5]$ | `F-08` | Sprint 1 | `TEST-31` (Boundary Validator) | Submitting 0 or 6 returns 422 Validation Error. |
| **BR-13** | Required text answer length between 1 and 1000 | `F-08` | Sprint 1 | `TEST-32` (String Length Unit) | Whitespace-only or >1000 chars returns 422. |
| **BR-14** | Draft survey deletion cascades to questions | `F-04` | Sprint 1 | `TEST-33` (DB Foreign Key) | Questions removed automatically upon survey delete. |

---

## 4. Non-Functional Requirements Traceability (NFR)

| NFR ID | Category & Target Metric | System Responsibility | Verification Sprint | Verification Method & Test Reference |
| :--- | :--- | :--- | :--- | :--- |
| **NFR-01** | API Response Time $\le 500$ ms (p95) | API Routing & Prisma DB queries | Sprint 1 & 2 | Benchmark timing script on submission endpoint. |
| **NFR-02** | 100% Endpoint Role & Ownership Guarding | `authMiddleware` & `requireRole` | Sprint 1 | `TEST-03`, `TEST-04`, `TEST-28`, `TEST-29` |
| **NFR-03** | Uniform Envelope `{ data }` / `{ error }` | Express Global Error Handler | Sprint 1 | `TEST-34` (Contract Schema Test) |
| **NFR-04** | Persistent Storage across Restarts | Dockerized PostgreSQL volume | Sprint 1 & Lab 5 | Restart test: verify data retrieval after container stop/start. |
| **NFR-05** | Zero Plaintext Password Storage | Bcrypt password hashing hook | Sprint 1 | `TEST-30` (Direct database query assertion). |
| **NFR-06** | Explicit UI States (Loading, Empty, Error) | Frontend React Query & State | Sprint 1 & 2 | Component unit tests & Playwright visual journey. |
| **NFR-07** | Strict TypeScript Zero Compiler Errors | `tsconfig.json` strict mode | Sprint 1, 2, 3 | CI pipeline check: `npm run typecheck`. |
| **NFR-08** | Multi-stage Docker Containerization | `Dockerfile` & `docker-compose.yml` | Sprint 2 / Lab 5 | `docker compose up --build` verification check. |
| **NFR-09** | GCP Cloud Run & Cloud SQL Deployment | GCP Cloud Build / Deploy | Sprint 2 / Lab 5 | Public live URL health probe check. |
| **NFR-10** | Deterministic Idempotent Seed Data | `prisma/seed.ts` | Sprint 1 | Repeat seed execution without constraint collision. |
| **NFR-11** | Zero Draft Survey Leakage | Query filter `status = 'PUBLISHED'` | Sprint 1 | `TEST-10` (Public query assertion). |
| **NFR-12** | Aggregate Summary Identity Anonymity | SQL `SELECT AVG, COUNT` aggregations | Sprint 1 | `TEST-16`, `TEST-17` (Ensure no user IDs in analytics payload). |

---

## 5. Coverage Summary
- Total Functional Requirements: **21** (Sprint 1: 17, Sprint 2: 3, Sprint 3: 1)
- Total Active Business Rules: **13** (All 13 enforced and verified in Sprint 1)
- Total Non-Functional Requirements: **12** (All mapped with measurable benchmarks)
- **Baseline Requirements Coverage:** **100.0%**
