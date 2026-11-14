import type { Survey } from '../types/survey.js';

interface BrowseSurveysViewProps {
  surveys: Survey[];
  submittedSurveyIds: Set<string>;
  onSelectSurvey: (survey: Survey) => void;
  onTestDuplicate: (survey: Survey) => void;
}

export function BrowseSurveysView({
  surveys,
  submittedSurveyIds,
  onSelectSurvey,
  onTestDuplicate,
}: BrowseSurveysViewProps) {
  const publishedSurveys = surveys.filter((s) => s.status === 'PUBLISHED');

  return (
    <div style={{ maxWidth: '960px', margin: '0 auto', padding: '0 1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
            Available Surveys (Catalog)
          </h2>
          <p style={{ color: '#64748b', fontSize: '0.9rem', margin: '0.25rem 0 0 0' }}>
            Enrolled students can browse and submit responses to active published surveys.
          </p>
        </div>
        <span style={{ fontSize: '0.875rem', color: '#475569', backgroundColor: '#e2e8f0', padding: '0.35rem 0.75rem', borderRadius: '9999px', fontWeight: 600 }}>
          {publishedSurveys.length} Published
        </span>
      </div>

      {publishedSurveys.length === 0 ? (
        <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', padding: '3rem', textAlign: 'center', color: '#64748b' }}>
          <p>No published surveys available right now.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(440px, 1fr))', gap: '1rem' }}>
          {publishedSurveys.map((survey) => {
            const hasSubmitted = submittedSurveyIds.has(survey.id);
            return (
              <div
                key={survey.id}
                style={{
                  backgroundColor: '#ffffff',
                  borderRadius: '10px',
                  border: '1px solid #e2e8f0',
                  padding: '1.25rem',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#2563eb', backgroundColor: '#eff6ff', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>
                      {survey.category}
                    </span>
                    {hasSubmitted ? (
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#15803d', backgroundColor: '#dcfce7', padding: '0.2rem 0.5rem', borderRadius: '9999px' }}>
                        ✓ Already Answered
                      </span>
                    ) : (
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#166534', backgroundColor: '#dcfce7', padding: '0.2rem 0.5rem', borderRadius: '9999px' }}>
                        ● Open for Responses
                      </span>
                    )}
                  </div>

                  <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0f172a', margin: '0.25rem 0 0.5rem 0' }}>
                    {survey.title}
                  </h3>
                  <p style={{ color: '#475569', fontSize: '0.875rem', margin: '0 0 1rem 0', lineHeight: 1.4 }}>
                    {survey.description || 'No description provided.'}
                  </p>
                </div>

                <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                    📝 {survey.questions.length} Questions
                  </span>

                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    {hasSubmitted ? (
                      <button
                        type="button"
                        onClick={() => onTestDuplicate(survey)}
                        style={{
                          backgroundColor: '#fee2e2',
                          color: '#b91c1c',
                          border: '1px solid #fca5a5',
                          borderRadius: '6px',
                          padding: '0.45rem 0.85rem',
                          fontSize: '0.85rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        Test Duplicate (409)
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onSelectSurvey(survey)}
                        style={{
                          backgroundColor: '#2563eb',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: '6px',
                          padding: '0.45rem 1rem',
                          fontSize: '0.875rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          boxShadow: '0 1px 2px rgba(37, 99, 235, 0.2)',
                        }}
                      >
                        Take Survey →
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
