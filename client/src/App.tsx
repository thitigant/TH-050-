import { useState } from 'react';
import { SurveySummaryDashboard, type SurveyAnalyticsData } from './components/SurveySummaryDashboard';
import './App.css';

const SAMPLE_DEMO_DATA: SurveyAnalyticsData = {
  surveyId: 'demo_srv_001',
  title: 'CPE 334 Lab 4 Course Feedback (Demo Preview)',
  status: 'PUBLISHED',
  totalResponses: 24,
  questions: [
    {
      questionId: 'qst_demo_1',
      prompt: 'How effective was the automated testing workshop?',
      questionType: 'RATING',
      summary: {
        averageScore: 4.62,
        totalRatings: 24,
        distribution: { '1': 0, '2': 0, '3': 2, '4': 5, '5': 17 },
      },
    },
    {
      questionId: 'qst_demo_2',
      prompt: 'Preferred development workflow?',
      questionType: 'SINGLE_CHOICE',
      summary: {
        totalSelections: 24,
        options: [
          { optionId: 'opt_1', label: 'TDD (Test-Driven Development)', count: 18, percentage: 75.0 },
          { optionId: 'opt_2', label: 'Code-first with Integration Tests', count: 6, percentage: 25.0 },
        ],
      },
    },
    {
      questionId: 'qst_demo_3',
      prompt: 'What suggestions do you have for the remaining course sprints?',
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
  const [activeSurveyId, setActiveSurveyId] = useState<string>('');
  const [inputSurveyId, setInputSurveyId] = useState<string>('');
  const [viewMode, setViewMode] = useState<'demo' | 'live'>('demo');

  const handleLoadSurvey = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputSurveyId.trim()) {
      setActiveSurveyId(inputSurveyId.trim());
      setViewMode('live');
    }
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc', paddingBottom: '3rem' }}>
      <header
        style={{
          backgroundColor: '#ffffff',
          borderBottom: '1px solid #e2e8f0',
          padding: '1rem 2rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ fontSize: '1.5rem', fontWeight: 800, color: '#3b82f6' }}>UniPulse</span>
          <span style={{ fontSize: '0.875rem', color: '#64748b' }}>| Survey Analytics & Summary Dashboard</span>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            type="button"
            onClick={() => setViewMode('demo')}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              backgroundColor: viewMode === 'demo' ? '#3b82f6' : '#ffffff',
              color: viewMode === 'demo' ? '#ffffff' : '#334155',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Demo Preview
          </button>
          <button
            type="button"
            onClick={() => setViewMode('live')}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              backgroundColor: viewMode === 'live' ? '#3b82f6' : '#ffffff',
              color: viewMode === 'live' ? '#ffffff' : '#334155',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Live Survey Lookup
          </button>
        </div>
      </header>

      {viewMode === 'live' && (
        <div style={{ maxWidth: '900px', margin: '1.5rem auto 0 auto', padding: '0 2rem' }}>
          <form
            onSubmit={handleLoadSurvey}
            style={{
              display: 'flex',
              gap: '0.75rem',
              backgroundColor: '#ffffff',
              padding: '1rem',
              borderRadius: '8px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            }}
          >
            <input
              type="text"
              placeholder="Enter Survey ID (e.g. srv_001)..."
              value={inputSurveyId}
              onChange={(e) => setInputSurveyId(e.target.value)}
              style={{
                flex: 1,
                padding: '0.625rem 0.875rem',
                border: '1px solid #cbd5e1',
                borderRadius: '6px',
                fontSize: '0.9375rem',
              }}
            />
            <button
              type="submit"
              style={{
                backgroundColor: '#3b82f6',
                color: '#ffffff',
                border: 'none',
                padding: '0.625rem 1.25rem',
                borderRadius: '6px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Load Analytics
            </button>
          </form>
        </div>
      )}

      <main style={{ marginTop: '1.5rem' }}>
        {viewMode === 'demo' ? (
          <SurveySummaryDashboard initialData={SAMPLE_DEMO_DATA} />
        ) : activeSurveyId ? (
          <SurveySummaryDashboard surveyId={activeSurveyId} />
        ) : (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
            <p>Please enter a Survey ID above and click &quot;Load Analytics&quot;.</p>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
