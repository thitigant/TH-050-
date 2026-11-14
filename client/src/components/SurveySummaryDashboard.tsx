import React, { useState, useEffect } from 'react';

export interface RatingSummary {
  averageScore: number;
  totalRatings: number;
  distribution: Record<string, number>;
}

export interface ChoiceOptionSummary {
  optionId: string;
  label: string;
  count: number;
  percentage: number;
}

export interface ChoiceSummary {
  totalSelections: number;
  options: ChoiceOptionSummary[];
}

export interface TextSummary {
  totalAnswers: number;
  answers: string[];
}

export interface QuestionSummary {
  questionId: string;
  prompt: string;
  questionType: 'RATING' | 'SINGLE_CHOICE' | 'SHORT_TEXT';
  summary: RatingSummary | ChoiceSummary | TextSummary;
}

export interface SurveyAnalyticsData {
  surveyId: string;
  title: string;
  status: 'DRAFT' | 'PUBLISHED' | 'CLOSED';
  totalResponses: number;
  questions: QuestionSummary[];
}

interface Props {
  surveyId?: string;
  initialData?: SurveyAnalyticsData;
}

export const SurveySummaryDashboard: React.FC<Props> = ({ surveyId, initialData }) => {
  const [data, setData] = useState<SurveyAnalyticsData | null>(initialData || null);
  const [loading, setLoading] = useState<boolean>(!initialData && !!surveyId);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialData || !surveyId) return;

    let isMounted = true;
    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        setError(null);
        const token = localStorage.getItem('token');
        const res = await fetch(`/api/surveys/${surveyId}/summary`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error?.message || `Failed to fetch summary (HTTP ${res.status})`);
        }

        const json = await res.json();
        if (isMounted) {
          setData(json.data);
        }
      } catch (err: unknown) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Unknown error');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchAnalytics();

    return () => {
      isMounted = false;
    };
  }, [surveyId, initialData]);

  if (loading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', fontFamily: 'sans-serif' }}>
        <p>Loading survey aggregate results...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '2rem', color: '#dc2626', fontFamily: 'sans-serif' }}>
        <h3>Error loading results</h3>
        <p>{error}</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', fontFamily: 'sans-serif' }}>
        <p>No survey data available.</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '2rem', fontFamily: 'system-ui, sans-serif' }}>
      {/* Header card */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: '8px',
          padding: '1.5rem',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          marginBottom: '1.5rem',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ margin: '0 0 0.5rem 0', fontSize: '1.75rem', color: '#1e293b' }}>{data.title}</h1>
            <span
              style={{
                display: 'inline-block',
                padding: '0.25rem 0.75rem',
                borderRadius: '9999px',
                fontSize: '0.875rem',
                fontWeight: 600,
                backgroundColor: data.status === 'PUBLISHED' ? '#dcfce7' : '#f1f5f9',
                color: data.status === 'PUBLISHED' ? '#166534' : '#475569',
              }}
            >
              {data.status}
            </span>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '2.25rem', fontWeight: 700, color: '#3b82f6' }}>{data.totalResponses}</div>
            <div style={{ fontSize: '0.875rem', color: '#64748b' }}>Total Responses</div>
          </div>
        </div>
      </div>

      {/* Graceful zero-response state banner */}
      {data.totalResponses === 0 && (
        <div
          style={{
            background: '#f8fafc',
            border: '1px dashed #cbd5e1',
            borderRadius: '8px',
            padding: '2rem',
            textAlign: 'center',
            color: '#64748b',
            marginBottom: '1.5rem',
          }}
        >
          <p style={{ margin: 0, fontWeight: 500 }}>No responses recorded yet for this survey.</p>
          <small>Aggregate charts will populate in real time once respondents submit answers.</small>
        </div>
      )}

      {/* Questions list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {data.questions.map((q, idx) => {
          return (
            <div
              key={q.questionId}
              style={{
                background: '#ffffff',
                borderRadius: '8px',
                padding: '1.5rem',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              }}
            >
              <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.125rem', color: '#0f172a' }}>
                <span style={{ color: '#64748b', marginRight: '0.5rem' }}>Q{idx + 1}.</span>
                {q.prompt}
              </h3>

              {/* RATING */}
              {q.questionType === 'RATING' && (
                (() => {
                  const s = q.summary as RatingSummary;
                  return (
                    <div>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginBottom: '1rem' }}>
                        <span style={{ fontSize: '2rem', fontWeight: 700, color: '#eab308' }}>
                          {s.averageScore.toFixed(2)}
                        </span>
                        <span style={{ color: '#64748b', fontSize: '0.875rem' }}>
                          / 5.00 ({s.totalRatings} ratings)
                        </span>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {['5', '4', '3', '2', '1'].map((star) => {
                          const count = s.distribution[star] || 0;
                          const pct = s.totalRatings > 0 ? (count / s.totalRatings) * 100 : 0;
                          return (
                            <div key={star} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                              <span style={{ width: '40px', fontSize: '0.875rem', color: '#475569' }}>
                                {star} ★
                              </span>
                              <div
                                style={{
                                  flex: 1,
                                  height: '12px',
                                  backgroundColor: '#f1f5f9',
                                  borderRadius: '6px',
                                  overflow: 'hidden',
                                }}
                              >
                                <div
                                  style={{
                                    width: `${pct}%`,
                                    height: '100%',
                                    backgroundColor: '#eab308',
                                    transition: 'width 0.3s ease',
                                  }}
                                />
                              </div>
                              <span style={{ width: '50px', textAlign: 'right', fontSize: '0.875rem', color: '#64748b' }}>
                                {count}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()
              )}

              {/* SINGLE CHOICE */}
              {q.questionType === 'SINGLE_CHOICE' && (
                (() => {
                  const s = q.summary as ChoiceSummary;
                  return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      {s.options.map((opt) => (
                        <div key={opt.optionId}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                            <span style={{ fontSize: '0.875rem', color: '#334155' }}>{opt.label}</span>
                            <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#0f172a' }}>
                              {opt.count} ({opt.percentage.toFixed(1)}%)
                            </span>
                          </div>
                          <div
                            style={{
                              height: '10px',
                              backgroundColor: '#f1f5f9',
                              borderRadius: '5px',
                              overflow: 'hidden',
                            }}
                          >
                            <div
                              style={{
                                width: `${opt.percentage}%`,
                                height: '100%',
                                backgroundColor: '#3b82f6',
                                transition: 'width 0.3s ease',
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()
              )}

              {/* SHORT TEXT */}
              {q.questionType === 'SHORT_TEXT' && (
                (() => {
                  const s = q.summary as TextSummary;
                  return (
                    <div>
                      <div style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '0.5rem' }}>
                        {s.totalAnswers} response{s.totalAnswers === 1 ? '' : 's'} recorded
                      </div>
                      {s.answers.length === 0 ? (
                        <p style={{ margin: 0, fontStyle: 'italic', color: '#94a3b8', fontSize: '0.875rem' }}>
                          No text feedback submitted.
                        </p>
                      ) : (
                        <ul style={{ margin: 0, paddingLeft: '1.25rem', color: '#334155', fontSize: '0.875rem' }}>
                          {s.answers.map((ans, aIdx) => (
                            <li key={aIdx} style={{ marginBottom: '0.25rem' }}>
                              {ans}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  );
                })()
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
