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

function App() {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [loginEmail, setLoginEmail] = useState<string>('owner1@unipulse.edu');
  const [loginPassword, setLoginPassword] = useState<string>('Password123!');
  const [loginError, setLoginError] = useState<string>('');
  const [isLoggingIn, setIsLoggingIn] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<string>('owner_surveys');
  const [surveys, setSurveys] = useState<Survey[]>(INITIAL_SURVEYS);
  const [selectedSurveyForTaking, setSelectedSurveyForTaking] = useState<Survey | null>(null);
  const [submittedSurveyIds, setSubmittedSurveyIds] = useState<Set<string>>(new Set());
  const [receipts, setReceipts] = useState<SubmissionReceipt[]>([]);
  const [activeAnalyticsSurveyId, setActiveAnalyticsSurveyId] = useState<string>('srv_cpe334_001');

  // Attempt live survey sync on mount
  useEffect(() => {
    async function fetchLiveSurveys() {
      try {
        const res = await fetch('/api/surveys');
        if (res.ok) {
          const body = await res.json();
          if (body.data && Array.isArray(body.data) && body.data.length > 0) {
            setSurveys(body.data);
          }
        }
      } catch {
        // Use initial mock surveys
      }
    }
    fetchLiveSurveys();
  }, []);

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
      setCurrentUser({
        id: data.data.user.id,
        email: data.data.user.email,
        role: finalRole,
        token: data.data.token,
      });

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

  const handlePublishSurvey = (surveyId: string) => {
    setSurveys((prev) =>
      prev.map((s) =>
        s.id === surveyId && s.questions.length > 0
          ? { ...s, status: 'PUBLISHED', publishedAt: new Date().toISOString() }
          : s
      )
    );
  };

  const handleCloseSurvey = (surveyId: string) => {
    setSurveys((prev) =>
      prev.map((s) =>
        s.id === surveyId ? { ...s, status: 'CLOSED', closedAt: new Date().toISOString() } : s
      )
    );
  };

  const handleCreateSurvey = (newSurveyData: Omit<Survey, 'id' | 'createdAt' | 'ownerId'>) => {
    const newSurvey: Survey = {
      ...newSurveyData,
      id: `srv_${Date.now()}`,
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

    // Duplicate prevention check (BR-07)
    if (submittedSurveyIds.has(selectedSurveyForTaking.id)) {
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
          body: JSON.stringify({ answers }),
        });
        const data = await res.json();
        if (res.status === 409) {
          return { success: false, error: `HTTP 409 Conflict: ${data.error?.message || 'Duplicate submission detected'}` };
        }
        if (!res.ok) {
          return { success: false, error: `HTTP ${res.status}: ${data.error?.message || 'Submission failed'}` };
        }
        const rcptId = data.data?.receiptId || `rcpt_${Date.now()}`;
        setSubmittedSurveyIds((prev) => new Set(prev).add(selectedSurveyForTaking.id));
        setReceipts((prev) => [
          {
            receiptId: rcptId,
            surveyId: selectedSurveyForTaking.id,
            surveyTitle: selectedSurveyForTaking.title,
            submittedAt: new Date().toISOString(),
            answersCount: answers.length,
          },
          ...prev,
        ]);
        return { success: true, receiptId: rcptId };
      } catch {
        // Fallback to local response recording
      }
    }

    // Local deterministic response recording
    const receiptId = `rcpt_${Date.now().toString(36).toUpperCase()}_${Math.floor(1000 + Math.random() * 9000)}`;
    setSubmittedSurveyIds((prev) => new Set(prev).add(selectedSurveyForTaking.id));
    setReceipts((prev) => [
      {
        receiptId,
        surveyId: selectedSurveyForTaking.id,
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

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc', paddingBottom: '4rem' }}>
      <AuthHeader
        currentUser={currentUser}
        activeTab={activeTab}
        onSelectTab={(tab) => {
          setActiveTab(tab);
          setSelectedSurveyForTaking(null);
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
                onPublish={handlePublishSurvey}
                onCloseSurvey={handleCloseSurvey}
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

            {activeTab === 'analytics' && (
              <div>
                <SurveySummaryDashboard
                  surveyId={activeAnalyticsSurveyId}
                  initialData={DEFAULT_ANALYTICS_DATA}
                />
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

export default App;
