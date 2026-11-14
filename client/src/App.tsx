import { useState, useEffect } from 'react';
import type { AuthUser, UserRole, Survey, SubmissionReceipt, AnswerInput } from './types/survey.js';
import { INITIAL_SURVEYS } from './data/mockData.js';
import { AuthHeader } from './components/AuthHeader.js';
import { BrowseSurveysView } from './components/BrowseSurveysView.js';
import { SurveyTakingView } from './components/SurveyTakingView.js';
import { OwnerSurveysView } from './components/OwnerSurveysView.js';
import { CreateSurveyView } from './components/CreateSurveyView.js';
import { ReceiptsView } from './components/ReceiptsView.js';
import { SurveySummaryDashboard, type SurveyAnalyticsData } from './components/SurveySummaryDashboard.js';
import './App.css';

const DEFAULT_ANALYTICS_DATA: SurveyAnalyticsData = {
  surveyId: 'srv_cpe334_001',
  title: 'CPE 334 Software Engineering Course Evaluation (Sprint 1)',
  status: 'PUBLISHED',
  totalResponses: 24,
  questions: [
    {
      questionId: 'qst_1',
      prompt: 'How satisfied are you with the TDD and CI/CD engineering workshops?',
      questionType: 'RATING',
      summary: {
        averageScore: 4.62,
        totalRatings: 24,
        distribution: { '1': 0, '2': 0, '3': 2, '4': 5, '5': 17 },
      },
    },
    {
      questionId: 'qst_2',
      prompt: 'Which development methodology fits your team best?',
      questionType: 'SINGLE_CHOICE',
      summary: {
        totalSelections: 24,
        options: [
          { optionId: 'opt_1', label: 'TDD (Test-Driven Development)', count: 18, percentage: 75.0 },
          { optionId: 'opt_2', label: 'Feature-first with Integration Tests', count: 6, percentage: 25.0 },
        ],
      },
    },
    {
      questionId: 'qst_3',
      prompt: 'What suggestions do you have for upcoming Sprint 2 and 3 topics?',
      questionType: 'SHORT_TEXT',
      summary: {
        totalAnswers: 3,
        answers: [
          'Excellent hands-on guide for CI/CD and Docker.',
          'Would love more discussion on microservice architecture.',
          'Great workshop structure!',
        ],
      },
    },
  ],
};

const BASELINE_SURVEY_IDS = new Set(INITIAL_SURVEYS.map((s) => s.id));

function UniPulseMain() {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [loginEmail, setLoginEmail] = useState<string>('owner1@unipulse.edu');
  const [loginPassword, setLoginPassword] = useState<string>('Password123!');
  const [loginError, setLoginError] = useState<string>('');
  const [isLoggingIn, setIsLoggingIn] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<string>('owner_surveys');
  const [surveys, setSurveys] = useState<Survey[]>(() => {
    try {
      for (const ver of ['v1', 'v2', 'v3']) {
        localStorage.removeItem(`unipulse_surveys_${ver}`);
        localStorage.removeItem(`unipulse_submitted_${ver}`);
        localStorage.removeItem(`unipulse_receipts_${ver}`);
        localStorage.removeItem(`unipulse_responses_${ver}`);
        localStorage.removeItem(`unipulse_backend_summaries_${ver}`);
      }
      const saved = localStorage.getItem('unipulse_surveys_v4');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // Ignore storage error
    }
    return INITIAL_SURVEYS;
  });
  const [selectedSurveyForTaking, setSelectedSurveyForTaking] = useState<Survey | null>(null);
  const [submittedSurveyIds, setSubmittedSurveyIds] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem('unipulse_submitted_v4');
      if (saved) return new Set(JSON.parse(saved));
    } catch {
      // Ignore storage error
    }
    return new Set();
  });
  const [receipts, setReceipts] = useState<SubmissionReceipt[]>(() => {
    try {
      const saved = localStorage.getItem('unipulse_receipts_v4');
      if (saved) return JSON.parse(saved);
    } catch {
      // Ignore storage error
    }
    return [];
  });
  const [responsesBySurvey, setResponsesBySurvey] = useState<Record<string, AnswerInput[][]>>(() => {
    try {
      const saved = localStorage.getItem('unipulse_responses_v4');
      if (saved) return JSON.parse(saved);
    } catch {
      // Ignore storage error
    }
    return {};
  });
  const [backendSummaries, setBackendSummaries] = useState<Record<string, SurveyAnalyticsData>>(() => {
    try {
      const saved = localStorage.getItem('unipulse_backend_summaries_v4');
      if (saved) return JSON.parse(saved);
    } catch {
      // Ignore storage error
    }
    return {};
  });
  const [activeAnalyticsSurveyId, setActiveAnalyticsSurveyId] = useState<string>('srv_cpe334_001');

  useEffect(() => {
    try {
      localStorage.setItem('unipulse_surveys_v4', JSON.stringify(surveys));
    } catch {
      // Ignore storage error
    }
  }, [surveys]);

  useEffect(() => {
    try {
      localStorage.setItem('unipulse_submitted_v4', JSON.stringify(Array.from(submittedSurveyIds)));
    } catch {
      // Ignore storage error
    }
  }, [submittedSurveyIds]);

  useEffect(() => {
    try {
      localStorage.setItem('unipulse_receipts_v4', JSON.stringify(receipts));
    } catch {
      // Ignore storage error
    }
  }, [receipts]);

  useEffect(() => {
    try {
      localStorage.setItem('unipulse_responses_v4', JSON.stringify(responsesBySurvey));
    } catch {
      // Ignore storage error
    }
  }, [responsesBySurvey]);

  useEffect(() => {
    try {
      localStorage.setItem('unipulse_backend_summaries_v4', JSON.stringify(backendSummaries));
    } catch {
      // Ignore storage error
    }
  }, [backendSummaries]);

  const syncStudentResponseForSurvey = async (survey: Survey, token: string, email: string) => {
    try {
      const res = await fetch(`/api/surveys/${survey.id}/responses/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const submissionKey = `${email}:${survey.id}`;
      if (res.status === 404 && BASELINE_SURVEY_IDS.has(survey.id)) {
        setSubmittedSurveyIds((prev) => {
          if (!prev.has(survey.id) && !prev.has(submissionKey)) return prev;
          const next = new Set(prev);
          next.delete(survey.id);
          next.delete(submissionKey);
          return next;
        });
        setReceipts((prev) => prev.filter((r) => r.surveyId !== survey.id));
        setResponsesBySurvey((prev) => {
          if (!prev[survey.id]) return prev;
          const next = { ...prev };
          delete next[survey.id];
          return next;
        });
        return;
      }
      if (!res.ok) return;
      const body = await res.json();
      const resp = body?.data;
      if (!resp || !resp.id) return;

      setSubmittedSurveyIds((prev) => {
        const next = new Set(prev);
        next.add(submissionKey);
        next.add(survey.id);
        return next;
      });

      const dbAnswers: AnswerInput[] = Array.isArray(resp.Answer)
        ? resp.Answer.map((a: any) => ({
            questionId: a.questionId,
            ratingValue: a.ratingValue ?? undefined,
            selectedOptionId: a.selectedOptionId ?? undefined,
            textValue: a.textValue ?? undefined,
          }))
        : [];

      setReceipts((prev) => {
        const exists = prev.some((r) => r.receiptId === resp.id || r.surveyId === survey.id);
        if (exists) return prev;
        return [
          {
            receiptId: resp.id,
            surveyId: survey.id,
            surveyTitle: resp.Survey?.title || survey.title,
            submittedAt: resp.submittedAt || new Date().toISOString(),
            answersCount: dbAnswers.length || survey.questions.length,
          },
          ...prev,
        ];
      });

      if (dbAnswers.length > 0) {
        setResponsesBySurvey((prev) => {
          const existing = prev[survey.id] || [];
          if (existing.length > 0) return prev;
          return {
            ...prev,
            [survey.id]: [dbAnswers],
          };
        });
      }
    } catch {
      // Ignore network error
    }
  };

  const syncOwnerSummaryForSurvey = async (surveyId: string, token: string) => {
    try {
      const res = await fetch(`/api/surveys/${surveyId}/summary`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const body = await res.json();
      if (body?.data && typeof body.data.totalResponses === 'number') {
        setBackendSummaries((prev) => ({
          ...prev,
          [surveyId]: body.data,
        }));
        if (body.data.totalResponses === 0 && BASELINE_SURVEY_IDS.has(surveyId)) {
          setResponsesBySurvey((prev) => {
            if (!prev[surveyId]) return prev;
            const next = { ...prev };
            delete next[surveyId];
            return next;
          });
        }
      }
    } catch {
      // Ignore network error
    }
  };

  const syncUserSessionData = (user: AuthUser) => {
    if (!user.token) return;
    if (user.role === 'RESPONDENT') {
      for (const s of surveys) {
        void syncStudentResponseForSurvey(s, user.token, user.email);
      }
    } else if (user.role === 'SURVEY_OWNER') {
      for (const s of surveys) {
        void syncOwnerSummaryForSurvey(s.id, user.token);
      }
    }
  };

  const handleLogin = async (email: string, role?: UserRole, password = 'Password123!') => {
    setLoginError('');
    setIsLoggingIn(true);
    const inferredRole: UserRole =
      role || (email.toLowerCase().includes('owner') ? 'SURVEY_OWNER' : 'RESPONDENT');
    let finalRole: UserRole = inferredRole;

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setLoginError(data?.error?.message || 'Invalid email or password');
        return;
      }

      finalRole = data.data.user.role || inferredRole;
      const loggedInUser: AuthUser = {
        id: data.data.user.id,
        email: data.data.user.email,
        role: finalRole,
        token: data.data.token,
      };
      setCurrentUser(loggedInUser);
      syncUserSessionData(loggedInUser);

      if (finalRole === 'SURVEY_OWNER') {
        setActiveTab('owner_surveys');
      } else {
        setActiveTab('browse');
      }
      setSelectedSurveyForTaking(null);
    } catch {
      setLoginError('Unable to reach authentication server. Please try again.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    if (currentUser?.token) {
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: { Authorization: `Bearer ${currentUser.token}` },
        });
      } catch {
        // Ignore network error on logout
      }
    }
    setCurrentUser(null);
    setActiveTab('browse');
    setSelectedSurveyForTaking(null);
  };

  const handlePublishSurvey = async (surveyId: string) => {
    setSurveys((prev) =>
      prev.map((s) =>
        s.id === surveyId && s.questions.length > 0
          ? { ...s, status: 'PUBLISHED', publishedAt: new Date().toISOString() }
          : s
      )
    );
    if (currentUser?.token) {
      try {
        await fetch(`/api/surveys/${surveyId}/publish`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${currentUser.token}` },
        });
      } catch {
        // Ignore network error; UI state updated
      }
    }
  };

  const handleCloseSurvey = async (surveyId: string) => {
    setSurveys((prev) =>
      prev.map((s) =>
        s.id === surveyId ? { ...s, status: 'CLOSED', closedAt: new Date().toISOString() } : s
      )
    );
    if (currentUser?.token) {
      try {
        await fetch(`/api/surveys/${surveyId}/close`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${currentUser.token}` },
        });
      } catch {
        // Ignore network error; UI state updated
      }
    }
  };

  const handleDeleteSurvey = async (surveyId: string) => {
    setSurveys((prev) => prev.filter((s) => s.id !== surveyId));
    setResponsesBySurvey((prev) => {
      const next = { ...prev };
      delete next[surveyId];
      return next;
    });
    setBackendSummaries((prev) => {
      const next = { ...prev };
      delete next[surveyId];
      return next;
    });
    setReceipts((prev) => prev.filter((r) => r.surveyId !== surveyId));
    setSubmittedSurveyIds((prev) => {
      const next = new Set(prev);
      for (const item of prev) {
        if (item === surveyId || item.endsWith(`:${surveyId}`)) {
          next.delete(item);
        }
      }
      return next;
    });
    if (currentUser?.token) {
      try {
        await fetch(`/api/surveys/${surveyId}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${currentUser.token}` },
        });
      } catch {
        // Ignore network error; UI state updated
      }
    }
  };

  const handleCreateSurvey = async (newSurveyData: Omit<Survey, 'id' | 'createdAt' | 'ownerId'>) => {
    let createdId = `srv_${Date.now()}`;
    let mappedQuestions = newSurveyData.questions;

    if (currentUser?.token) {
      try {
        const createRes = await fetch('/api/surveys', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${currentUser.token}`,
          },
          body: JSON.stringify({
            title: newSurveyData.title,
            description: newSurveyData.description,
            questions: newSurveyData.questions.map((q, idx) => ({
              text: q.prompt,
              type: q.questionType,
              isRequired: q.isRequired,
              displayOrder: idx + 1,
              options: q.options?.map((o) => o.label),
            })),
          }),
        });
        if (createRes.ok) {
          const createBody = await createRes.json();
          const dbSurvey = createBody.data;
          if (dbSurvey?.id) {
            createdId = dbSurvey.id;
            if (Array.isArray(dbSurvey.Question)) {
              mappedQuestions = dbSurvey.Question.map((dbQ: any, i: number) => ({
                id: dbQ.id,
                prompt: dbQ.text,
                questionType: dbQ.type,
                isRequired: dbQ.isRequired,
                order: dbQ.displayOrder ?? i + 1,
                options: Array.isArray(dbQ.QuestionOption)
                  ? dbQ.QuestionOption.map((dbO: any, oi: number) => ({
                      id: dbO.id,
                      label: dbO.label,
                      order: dbO.displayOrder ?? oi + 1,
                    }))
                  : undefined,
              }));
            }
            if (newSurveyData.status === 'PUBLISHED') {
              await fetch(`/api/surveys/${createdId}/publish`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${currentUser.token}` },
              });
            }
          }
        }
      } catch {
        // Fallback to local ID
      }
    }

    const newSurvey: Survey = {
      ...newSurveyData,
      id: createdId,
      questions: mappedQuestions,
      ownerId: currentUser?.id || 'usr_owner_1',
      createdAt: new Date().toISOString(),
    };
    setSurveys((prev) => [newSurvey, ...prev]);
    setActiveTab('owner_surveys');
  };

  const handleSubmitAnswers = async (
    answers: AnswerInput[]
  ): Promise<{ success: boolean; error?: string; receiptId?: string }> => {
    if (!selectedSurveyForTaking) return { success: false, error: 'No survey selected' };

    const submissionKey = `${currentUser?.email || 'student'}:${selectedSurveyForTaking.id}`;

    // Duplicate prevention check (BR-07)
    if (submittedSurveyIds.has(submissionKey) || submittedSurveyIds.has(selectedSurveyForTaking.id)) {
      return {
        success: false,
        error: `HTTP 409 Conflict: Duplicate submission rejected. Respondent (${currentUser?.email || 'student'}) has already submitted a response to this survey.`,
      };
    }

    // Try live API if token available
    if (currentUser?.token) {
      try {
        const res = await fetch(`/api/surveys/${selectedSurveyForTaking.id}/responses`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${currentUser.token}`,
          },
          body: JSON.stringify({
            answers: answers.map((a) => ({
              ...a,
              numericValue: a.ratingValue,
            })),
          }),
        });
        const data = await res.json();
        if (res.status === 409) {
          setSubmittedSurveyIds((prev) => {
            const next = new Set(prev);
            next.add(submissionKey);
            next.add(selectedSurveyForTaking.id);
            return next;
          });
          await syncStudentResponseForSurvey(
            selectedSurveyForTaking,
            currentUser.token,
            currentUser.email
          );
          return {
            success: false,
            error: `HTTP 409 Conflict: ${data.error?.message || 'Duplicate submission detected'}`,
          };
        }
        if (res.status === 422 || res.status === 403) {
          return {
            success: false,
            error: `HTTP ${res.status}: ${data.error?.message || 'Validation failed'}`,
          };
        }
        if (res.ok) {
          const rcptId = data.data?.responseId || data.data?.receiptId || `rcpt_${Date.now()}`;
          const targetId = selectedSurveyForTaking.id;
          setSubmittedSurveyIds((prev) => {
            const next = new Set(prev);
            next.add(submissionKey);
            next.add(targetId);
            return next;
          });
          setResponsesBySurvey((prev) => ({
            ...prev,
            [targetId]: [...(prev[targetId] || []), answers],
          }));
          setActiveAnalyticsSurveyId(targetId);
          setReceipts((prev) => [
            {
              receiptId: rcptId,
              surveyId: targetId,
              surveyTitle: selectedSurveyForTaking.title,
              submittedAt: new Date().toISOString(),
              answersCount: answers.length,
            },
            ...prev,
          ]);
          return { success: true, receiptId: rcptId };
        }
      } catch {
        // Fallback to local response recording
      }
    }

    // Local deterministic response recording
    const targetId = selectedSurveyForTaking.id;
    const receiptId = `rcpt_${Date.now().toString(36).toUpperCase()}_${Math.floor(1000 + Math.random() * 9000)}`;
    setSubmittedSurveyIds((prev) => {
      const next = new Set(prev);
      next.add(submissionKey);
      next.add(targetId);
      return next;
    });
    setResponsesBySurvey((prev) => ({
      ...prev,
      [targetId]: [...(prev[targetId] || []), answers],
    }));
    setActiveAnalyticsSurveyId(targetId);
    setReceipts((prev) => [
      {
        receiptId,
        surveyId: targetId,
        surveyTitle: selectedSurveyForTaking.title,
        submittedAt: new Date().toISOString(),
        answersCount: answers.length,
      },
      ...prev,
    ]);

    return { success: true, receiptId };
  };

  const handleTestDuplicate = (survey: Survey) => {
    setSelectedSurveyForTaking(survey);
  };

  const handleViewAnalyticsForSurvey = (surveyId: string) => {
    setActiveAnalyticsSurveyId(surveyId);
    setActiveTab('analytics');
  };

  const buildAnalyticsData = (surveyId: string): SurveyAnalyticsData => {
    const targetSurvey = surveys.find((s) => s.id === surveyId) || surveys[0];
    if (!targetSurvey) return DEFAULT_ANALYTICS_DATA;

    const extraSubmissions = responsesBySurvey[targetSurvey.id] || [];
    const dbSummary = backendSummaries[targetSurvey.id];
    const useDbSummary = !!dbSummary && dbSummary.totalResponses > extraSubmissions.length;
    const isDefaultDemoSurvey = targetSurvey.id === 'srv_cpe334_001';
    const baseTotal = isDefaultDemoSurvey ? DEFAULT_ANALYTICS_DATA.totalResponses : 0;
    const addedCount = useDbSummary ? dbSummary.totalResponses : extraSubmissions.length;

    return {
      surveyId: targetSurvey.id,
      title: targetSurvey.title,
      status: targetSurvey.status,
      totalResponses: baseTotal + addedCount,
      questions: targetSurvey.questions.map((q) => {
        const qAnswers = extraSubmissions
          .map((ansList) => ansList.find((a) => a.questionId === q.id))
          .filter((a): a is AnswerInput => !!a);
        const dbQ = useDbSummary
          ? dbSummary.questions.find((dq) => dq.questionId === q.id)
          : undefined;

        if (q.questionType === 'RATING') {
          const baseDist: Record<string, number> = isDefaultDemoSurvey && q.id === 'qst_1'
            ? { '1': 0, '2': 0, '3': 2, '4': 5, '5': 17 }
            : { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 };

          if (dbQ && dbQ.questionType === 'RATING') {
            const dbRating = dbQ.summary as { distribution?: Record<string, number> };
            if (dbRating.distribution) {
              for (const [star, count] of Object.entries(dbRating.distribution)) {
                baseDist[star] = (baseDist[star] || 0) + (count || 0);
              }
            }
          } else {
            for (const a of qAnswers) {
              if (a.ratingValue && a.ratingValue >= 1 && a.ratingValue <= 5) {
                const key = String(a.ratingValue);
                baseDist[key] = (baseDist[key] || 0) + 1;
              }
            }
          }

          let totalRatings = 0;
          let weightedSum = 0;
          for (const [star, count] of Object.entries(baseDist)) {
            totalRatings += count;
            weightedSum += Number(star) * count;
          }
          const averageScore = totalRatings > 0 ? Math.round((weightedSum / totalRatings) * 100) / 100 : 0;

          return {
            questionId: q.id,
            prompt: q.prompt,
            questionType: 'RATING',
            summary: {
              averageScore,
              totalRatings,
              distribution: baseDist,
            },
          };
        }

        if (q.questionType === 'SINGLE_CHOICE') {
          const opts = q.options || [];
          const countsByOpt: Record<string, number> = {};
          for (const o of opts) {
            countsByOpt[o.id] =
              isDefaultDemoSurvey && q.id === 'qst_2'
                ? o.id === 'opt_1'
                  ? 18
                  : o.id === 'opt_2'
                  ? 6
                  : 0
                : 0;
          }
          if (dbQ && dbQ.questionType === 'SINGLE_CHOICE') {
            const dbChoice = dbQ.summary as { options?: Array<{ optionId: string; count: number }> };
            for (const dbOpt of dbChoice.options || []) {
              if (countsByOpt[dbOpt.optionId] !== undefined) {
                countsByOpt[dbOpt.optionId] += dbOpt.count || 0;
              }
            }
          } else {
            for (const a of qAnswers) {
              if (a.selectedOptionId && countsByOpt[a.selectedOptionId] !== undefined) {
                countsByOpt[a.selectedOptionId] += 1;
              }
            }
          }
          const totalSelections = Object.values(countsByOpt).reduce((acc, c) => acc + c, 0);
          return {
            questionId: q.id,
            prompt: q.prompt,
            questionType: 'SINGLE_CHOICE',
            summary: {
              totalSelections,
              options: opts.map((o) => {
                const count = countsByOpt[o.id] || 0;
                const percentage =
                  totalSelections > 0 ? Math.round((count / totalSelections) * 1000) / 10 : 0;
                return {
                  optionId: o.id,
                  label: o.label,
                  count,
                  percentage,
                };
              }),
            },
          };
        }

        // SHORT_TEXT
        const baseTexts =
          isDefaultDemoSurvey && q.id === 'qst_3'
            ? [
                'Excellent hands-on guide for CI/CD and Docker.',
                'Would love more discussion on microservice architecture.',
                'Great workshop structure!',
              ]
            : [];
        const newTexts =
          dbQ && dbQ.questionType === 'SHORT_TEXT'
            ? ((dbQ.summary as { answers?: string[] }).answers || [])
            : qAnswers
                .map((a) => a.textValue?.trim())
                .filter((t): t is string => !!t && t.length > 0);
        const allTexts = [...newTexts, ...baseTexts];

        return {
          questionId: q.id,
          prompt: q.prompt,
          questionType: 'SHORT_TEXT',
          summary: {
            totalAnswers: allTexts.length,
            answers: allTexts,
          },
        };
      }),
    };
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc', paddingBottom: '4rem' }}>
      <AuthHeader
        currentUser={currentUser}
        activeTab={activeTab}
        onSelectTab={(tab) => {
          setActiveTab(tab);
          setSelectedSurveyForTaking(null);
          if (currentUser) {
            syncUserSessionData(currentUser);
          }
        }}
        onLogin={handleLogin}
        onLogout={handleLogout}
      />

      <main style={{ maxWidth: '1280px', margin: '0 auto', padding: '2rem 1.5rem 0' }}>
        {!currentUser ? (
          /* Centered Sign In Card (matches original localhost:4000 design) */
          <div
            style={{
              maxWidth: '28rem',
              margin: '2.5rem auto 0',
              backgroundColor: '#ffffff',
              borderRadius: '1rem',
              border: '1px solid #e2e8f0',
              padding: '2rem',
              boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
            }}
          >
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <h2
                style={{
                  margin: 0,
                  fontSize: '1.5rem',
                  fontWeight: 700,
                  color: '#1e293b',
                }}
              >
                Welcome to UniPulse
              </h2>
              <p
                style={{
                  margin: '0.35rem 0 0',
                  fontSize: '0.875rem',
                  color: '#64748b',
                }}
              >
                Please sign in to manage or complete course surveys
              </p>
            </div>

            {loginError && (
              <div
                style={{
                  marginBottom: '1rem',
                  padding: '0.65rem 0.85rem',
                  borderRadius: '0.5rem',
                  backgroundColor: '#fef2f2',
                  border: '1px solid #fecaca',
                  color: '#b91c1c',
                  fontSize: '0.8rem',
                }}
              >
                {loginError}
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleLogin(loginEmail, undefined, loginPassword);
              }}
              style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
            >
              <div>
                <label
                  htmlFor="login-email"
                  style={{
                    display: 'block',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    color: '#64748b',
                    marginBottom: '0.35rem',
                  }}
                >
                  Email
                </label>
                <input
                  id="login-email"
                  type="email"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '0.625rem 0.875rem',
                    borderRadius: '0.5rem',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.875rem',
                    color: '#1e293b',
                    outline: 'none',
                  }}
                />
              </div>

              <div>
                <label
                  htmlFor="login-password"
                  style={{
                    display: 'block',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    color: '#64748b',
                    marginBottom: '0.35rem',
                  }}
                >
                  Password
                </label>
                <input
                  id="login-password"
                  type="password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '0.625rem 0.875rem',
                    borderRadius: '0.5rem',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.875rem',
                    color: '#1e293b',
                    outline: 'none',
                  }}
                />
              </div>

              <button
                type="submit"
                disabled={isLoggingIn}
                style={{
                  width: '100%',
                  backgroundColor: '#4f46e5',
                  color: '#ffffff',
                  fontWeight: 600,
                  padding: '0.625rem 1rem',
                  borderRadius: '0.5rem',
                  border: 'none',
                  fontSize: '0.875rem',
                  cursor: isLoggingIn ? 'wait' : 'pointer',
                  transition: 'background-color 0.15s ease',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                }}
                onMouseOver={(e) => {
                  if (!isLoggingIn) e.currentTarget.style.backgroundColor = '#4338ca';
                }}
                onMouseOut={(e) => {
                  if (!isLoggingIn) e.currentTarget.style.backgroundColor = '#4f46e5';
                }}
              >
                <span>{isLoggingIn ? 'Signing in...' : 'Sign In'}</span>
              </button>
            </form>

            {/* Quick Demo Login Buttons */}
            <div
              style={{
                marginTop: '1.5rem',
                paddingTop: '1.5rem',
                borderTop: '1px solid #f1f5f9',
              }}
            >
              <p
                style={{
                  margin: '0 0 0.75rem',
                  fontSize: '0.75rem',
                  color: '#94a3b8',
                  textAlign: 'center',
                }}
              >
                Quick Demo Login (CPE 334 Evaluator)
              </p>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '0.5rem',
                }}
              >
                <button
                  type="button"
                  onClick={() => {
                    setLoginEmail('owner1@unipulse.edu');
                    setLoginPassword('Password123!');
                    handleLogin('owner1@unipulse.edu', 'SURVEY_OWNER', 'Password123!');
                  }}
                  style={{
                    padding: '0.55rem 0.75rem',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    backgroundColor: '#f1f5f9',
                    color: '#334155',
                    border: 'none',
                    borderRadius: '0.5rem',
                    cursor: 'pointer',
                    transition: 'background-color 0.15s ease',
                    textAlign: 'center',
                  }}
                  onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#e2e8f0')}
                  onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#f1f5f9')}
                >
                  <i
                    className="fa-solid fa-chalkboard-user"
                    style={{ marginRight: '0.35rem', color: '#4f46e5' }}
                  />
                  Owner (Alice)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setLoginEmail('student1@unipulse.edu');
                    setLoginPassword('Password123!');
                    handleLogin('student1@unipulse.edu', 'RESPONDENT', 'Password123!');
                  }}
                  style={{
                    padding: '0.55rem 0.75rem',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    backgroundColor: '#f1f5f9',
                    color: '#334155',
                    border: 'none',
                    borderRadius: '0.5rem',
                    cursor: 'pointer',
                    transition: 'background-color 0.15s ease',
                    textAlign: 'center',
                  }}
                  onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#e2e8f0')}
                  onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#f1f5f9')}
                >
                  <i
                    className="fa-solid fa-user-graduate"
                    style={{ marginRight: '0.35rem', color: '#059669' }}
                  />
                  Student (Charlie)
                </button>
              </div>
            </div>
          </div>
        ) : selectedSurveyForTaking ? (
          /* Taking Survey Sub-view */
          <SurveyTakingView
            survey={selectedSurveyForTaking}
            studentEmail={currentUser.email}
            isAlreadySubmitted={submittedSurveyIds.has(selectedSurveyForTaking.id)}
            onBack={() => setSelectedSurveyForTaking(null)}
            onSubmit={handleSubmitAnswers}
          />
        ) : (
          <>
            {activeTab === 'owner_surveys' && (
              <OwnerSurveysView
                surveys={surveys}
                responseCounts={Object.fromEntries(
                  surveys.map((s) => [s.id, buildAnalyticsData(s.id).totalResponses])
                )}
                onPublish={handlePublishSurvey}
                onCloseSurvey={handleCloseSurvey}
                onDeleteSurvey={handleDeleteSurvey}
                onViewAnalytics={handleViewAnalyticsForSurvey}
                onOpenCreate={() => setActiveTab('create_survey')}
              />
            )}

            {activeTab === 'create_survey' && (
              <CreateSurveyView
                ownerEmail={currentUser.email}
                onCancel={() => setActiveTab('owner_surveys')}
                onCreateSurvey={handleCreateSurvey}
              />
            )}

            {activeTab === 'browse' && (
              <BrowseSurveysView
                surveys={surveys}
                submittedSurveyIds={submittedSurveyIds}
                onSelectSurvey={(srv) => setSelectedSurveyForTaking(srv)}
                onTestDuplicate={handleTestDuplicate}
              />
            )}

            {activeTab === 'receipts' && (
              <ReceiptsView
                receipts={receipts}
                studentEmail={currentUser.email}
              />
            )}

            {activeTab === 'analytics' && (() => {
              const activeAnalytics = buildAnalyticsData(activeAnalyticsSurveyId);
              return (
                <div>
                  <div
                    style={{
                      maxWidth: '900px',
                      margin: '0 auto',
                      padding: '1rem 2rem 0 2rem',
                      display: 'flex',
                      flexWrap: 'wrap',
                      alignItems: 'center',
                      gap: '0.5rem',
                    }}
                  >
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#475569', marginRight: '0.25rem' }}>
                      Select Survey:
                    </span>
                    {surveys.map((s) => {
                      const count = buildAnalyticsData(s.id).totalResponses;
                      const isSelected = activeAnalytics.surveyId === s.id;
                      return (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => setActiveAnalyticsSurveyId(s.id)}
                          style={{
                            padding: '0.4rem 0.85rem',
                            borderRadius: '9999px',
                            border: isSelected ? '2px solid #2563eb' : '1px solid #cbd5e1',
                            backgroundColor: isSelected ? '#eff6ff' : '#ffffff',
                            color: isSelected ? '#1d4ed8' : '#334155',
                            fontSize: '0.82rem',
                            fontWeight: isSelected ? 700 : 600,
                            cursor: 'pointer',
                          }}
                        >
                          {s.title} ({count})
                        </button>
                      );
                    })}
                  </div>
                  <SurveySummaryDashboard
                    key={`${activeAnalytics.surveyId}-${activeAnalytics.totalResponses}-${activeAnalytics.status}`}
                    surveyId={activeAnalytics.surveyId}
                    initialData={activeAnalytics}
                  />
                </div>
              );
            })()}
          </>
        )}
      </main>
    </div>
  );
}

export default function App() {
  return <UniPulseMain key="unipulse_clean_v4" />;
}
