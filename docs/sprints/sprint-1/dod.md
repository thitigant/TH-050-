# Sprint 1 Product Definition of Done (DoD) (Part E)
**Course:** CPE 334 Introduction to Software Engineering in the Age of AI Agents  
**Theme 10:** Review, Feedback, and Survey System (UniPulse)  
**Document Version:** 1.0.0  

---

## 1. Product Definition of Done Overview
A feature or sprint increment in UniPulse is considered **"DONE"** only when all criteria in this checklist are verified by executable automated evidence, peer review, and continuous integration checks—not merely by developer assertion or AI claim.

---

## 2. Sprint 1 Exit Criteria Checklist

### 2.1 Feature & Behavioral Completeness
- [x] All 11 allocated Sprint 1 features (`F-01` through `F-10`, and `F-12`) are implemented across UI, API, and Database layers.
- [x] Full vertical slice demonstrated:
  1. Survey Owner registers/logs in, authors a survey draft with title and category.
  2. Owner adds Text, Single Choice, and Rating questions (1–5) and publishes the survey.
  3. Respondent logs in, browses available published surveys, opens the survey form, and submits valid answers.
  4. Database saves response and child answers atomically.
  5. Respondent can view submission receipt in their history.
  6. Owner accesses aggregate analytics showing total submissions and calculated averages.
- [x] Rejection rules strictly enforced:
  - Rejection of empty survey publishing (`HTTP 422`).
  - Rejection of duplicate submission by same respondent (`HTTP 409`).
  - Rejection of responses to closed or draft surveys (`HTTP 400`).
  - Rejection of owner answering own survey (`HTTP 403`).
  - Rejection of rating values $<1$ or $>5$ (`HTTP 422`).

### 2.2 Quality Assurance & Automated Verification
- [x] Multi-level test suite executed and 100% passing:
  - Unit tests for validation schemas, domain rules, and aggregate computations.
  - Integration tests for API endpoints and Prisma database queries.
  - Security tests verifying unauthenticated 401s, unauthorized 403s, and query ownership scoping.
- [x] TDD evidence recorded for critical business rules (`BR-02`, `BR-06`, `BR-07`, `BR-12`), showing verified RED failing test runs before GREEN passing fixes.
- [x] Zero skipped or disabled tests; zero artificial assertions.

### 2.3 Security & Relational Integrity
- [x] Passwords hashed using bcrypt (cost factor 12); verified zero plaintext stored in database.
- [x] JWT sessions properly signed with HS256 and verified on all protected endpoints.
- [x] Token revocation active on logout via `RevokedToken` table.
- [x] Database composite unique constraint `(surveyId, respondentId)` active on PostgreSQL schema.
- [x] Foreign key cascade deletions active on draft survey questions.

### 2.4 Engineering Process, Git & Code Health
- [x] Strict Git branching model followed: Issue created $\rightarrow$ Feature branch created $\rightarrow$ PR submitted into `sprint-1` $\rightarrow$ Teammate code review approved $\rightarrow$ Integrated.
- [x] Authors never approve their own Pull Requests; all PRs contain substantive review notes and evidence.
- [x] TypeScript compiler check passes with zero errors under strict mode (`npm run typecheck`).
- [x] Linter and formatter checks clean with zero errors (`npm run lint`).

### 2.5 Documentation & Setup Reproducibility
- [x] Complete SRS (`docs/srs.md`), Feature Inventory (`docs/features.md`), Traceability Matrix (`docs/traceability.md`), System SDS (`docs/system-sds.md`), Sprint Plan (`docs/sprints/plan.md`), Feature Contracts (`docs/sprints/sprint-1/features-sds.md`), and STS (`docs/sprints/sprint-1/sts.md`) up to date in repository.
- [x] `README.md` contains clear step-by-step instructions for local reproduction: dependency installation, environment setup (`.env.example`), database migration, and test execution.
- [x] Seed script (`npm run db:seed`) creates deterministic test accounts (`owner1`, `student1`, `student2`) with documented passwords.
- [x] Incomplete work, limitations, and deferred items explicitly documented for Sprint 2.
