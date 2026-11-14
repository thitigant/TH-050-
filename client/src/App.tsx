import { useState, useEffect } from 'react';
import type { AuthUser, UserRole, Survey, SubmissionReceipt, AnswerInput } from './types/survey.js';
import { INITIAL_SURVEYS } from './data/mockData.js';
import { AuthHeader } from './components/AuthHeader.js';
import { BrowseSurveysView } from './components/BrowseSurveysView.js';
import { SurveyTakingView } from './components/SurveyTakingView.js';
import { OwnerSurveysView } from './components/OwnerSurveysView.js';
import { CreateSurveyView } from './components/CreateSurveyView.js';
import { ReceiptsView } from './components/ReceiptsView.js';
import { RbacDemoView } from './components/RbacDemoView.js';
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
  const [currentUser, setCurrentUser] = useState<AuthUser | null>({
    id: 'usr_owner_1',
    email: 'owner1@unipulse.edu',
    role: 'SURVEY_OWNER',
  });
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

  const handleLogin = async (email: string, role: UserRole, password = 'Password123!') => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (res.ok) {
        const data = await res.json();
        setCurrentUser({
          id: data.data.user.id,
          email: data.data.user.email,
          role: data.data.user.role,
          token: data.data.token,
        });
      } else {
        // Fallback to local session
        setCurrentUser({ id: `usr_${Date.now()}`, email, role });
      }
    } catch {
      setCurrentUser({ id: `usr_${Date.now()}`, email, role });
    }

    if (role === 'SURVEY_OWNER') {
      setActiveTab('owner_surveys');
    } else {
      setActiveTab('browse');
    }
    setSelectedSurveyForTaking(null);
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
        s.id === surveyId ? { ...s, status: 'PUBLISHED', publishedAt: new Date().toISOString() } : s
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

      <main style={{ marginTop: '1.75rem' }}>
        {/* Taking Survey Sub-view */}
        {selectedSurveyForTaking ? (
          <SurveyTakingView
            survey={selectedSurveyForTaking}
            studentEmail={currentUser?.email || 'student1@unipulse.edu'}
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
                ownerEmail={currentUser?.email || 'owner1@unipulse.edu'}
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
                studentEmail={currentUser?.email || 'student1@unipulse.edu'}
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

            {activeTab === 'rbac_demo' && (
              <RbacDemoView currentUser={currentUser} />
            )}
          </>
        )}
      </main>
    </div>
  );
}

export default App;
