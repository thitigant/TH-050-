import { useState } from 'react';
import type { Survey, AnswerInput } from '../types/survey.js';

interface SurveyTakingViewProps {
  survey: Survey;
  studentEmail: string;
  isAlreadySubmitted: boolean;
  onBack: () => void;
  onSubmit: (answers: AnswerInput[]) => Promise<{ success: boolean; error?: string; receiptId?: string }>;
}

export function SurveyTakingView({
  survey,
  studentEmail,
  isAlreadySubmitted,
  onBack,
  onSubmit,
}: SurveyTakingViewProps) {
  const [answers, setAnswers] = useState<Record<string, { rating?: number; text?: string; optionId?: string }>>({});
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successReceipt, setSuccessReceipt] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleRatingChange = (questionId: string, val: number) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: { ...prev[questionId], rating: val },
    }));
  };

  const handleOptionChange = (questionId: string, optionId: string) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: { ...prev[questionId], optionId },
    }));
  };

  const handleTextChange = (questionId: string, text: string) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: { ...prev[questionId], text },
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    // Validate required questions
    for (const q of survey.questions) {
      if (q.isRequired) {
        const ans = answers[q.id];
        if (!ans) {
          setErrorMsg(`Please answer required question: "${q.prompt}"`);
          return;
        }
        if (q.questionType === 'RATING' && ans.rating === undefined) {
          setErrorMsg(`Please provide a rating (1-5) for: "${q.prompt}"`);
          return;
        }
        if (q.questionType === 'SINGLE_CHOICE' && !ans.optionId) {
          setErrorMsg(`Please select an option for: "${q.prompt}"`);
          return;
        }
        if (q.questionType === 'SHORT_TEXT' && (!ans.text || ans.text.trim().length === 0)) {
          setErrorMsg(`Please fill in required text for: "${q.prompt}"`);
          return;
        }
      }
    }

    const payload: AnswerInput[] = Object.entries(answers).map(([qid, val]) => ({
      questionId: qid,
      ratingValue: val.rating,
      selectedOptionId: val.optionId,
      textValue: val.text,
    }));

    setSubmitting(true);
    const res = await onSubmit(payload);
    setSubmitting(false);

    if (res.success && res.receiptId) {
      setSuccessReceipt(res.receiptId);
    } else if (res.error) {
      setErrorMsg(res.error);
    }
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '0 1rem' }}>
      <button
        type="button"
        onClick={onBack}
        style={{
          marginBottom: '1rem',
          padding: '0.4rem 0.8rem',
          backgroundColor: '#e2e8f0',
          border: 'none',
          borderRadius: '6px',
          cursor: 'pointer',
          fontWeight: 600,
        }}
      >
        ← Back to Surveys
      </button>

      <div style={{ backgroundColor: '#ffffff', borderRadius: '10px', padding: '1.75rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid #e2e8f0', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
          <div>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#3b82f6', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {survey.category} • Answering as: {studentEmail}
            </span>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', margin: '0.25rem 0' }}>{survey.title}</h2>
            {survey.description && <p style={{ color: '#475569', fontSize: '0.95rem', margin: 0 }}>{survey.description}</p>}
          </div>
          <span style={{ backgroundColor: '#dcfce7', color: '#166534', padding: '0.25rem 0.6rem', borderRadius: '9999px', fontSize: '0.8rem', fontWeight: 700 }}>
            {survey.status}
          </span>
        </div>

        {isAlreadySubmitted && !successReceipt && (
          <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '1rem', marginBottom: '1.5rem', color: '#991b1b' }}>
            <div style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span>⚠️ Notice: You have already submitted this survey!</span>
            </div>
            <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.9rem' }}>
              Per Business Rule <strong>BR-07 (Duplicate Prevention)</strong>, each respondent is limited to exactly one response. Submitting again will trigger an <strong>HTTP 409 Conflict</strong> rejection.
            </p>
          </div>
        )}

        {errorMsg && (
          <div style={{ backgroundColor: '#fef2f2', border: '2px solid #ef4444', borderRadius: '8px', padding: '1rem', marginBottom: '1.5rem', color: '#7f1d1d' }}>
            <div style={{ fontWeight: 800, fontSize: '1rem' }}>⛔ Submission Rejected</div>
            <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.95rem' }}>{errorMsg}</p>
          </div>
        )}

        {successReceipt ? (
          <div style={{ backgroundColor: '#f0fdf4', border: '2px solid #22c55e', borderRadius: '8px', padding: '1.5rem', textAlign: 'center' }}>
            <div style={{ fontSize: '2.5rem' }}>🎉</div>
            <h3 style={{ color: '#15803d', margin: '0.5rem 0', fontWeight: 800 }}>Response Submitted Successfully!</h3>
            <p style={{ color: '#166534', margin: '0.25rem 0' }}>Your submission has been recorded in PostgreSQL database.</p>
            <div style={{ margin: '1rem 0', padding: '0.75rem', backgroundColor: '#ffffff', borderRadius: '6px', border: '1px dashed #86efac', display: 'inline-block' }}>
              <div style={{ fontSize: '0.8rem', color: '#64748b' }}>OFFICIAL SUBMISSION RECEIPT ID:</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>{successReceipt}</div>
            </div>
            <div>
              <button
                type="button"
                onClick={onBack}
                style={{
                  marginTop: '0.5rem',
                  padding: '0.6rem 1.25rem',
                  backgroundColor: '#16a34a',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Return to Surveys Catalog
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {survey.questions.map((q, idx) => (
                <div key={q.id} style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1.25rem', backgroundColor: '#f8fafc' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <div style={{ fontWeight: 700, color: '#1e293b' }}>
                      Q{idx + 1}. {q.prompt}
                      {q.isRequired && <span style={{ color: '#ef4444', marginLeft: '4px' }}>*</span>}
                    </div>
                    <span style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem', backgroundColor: '#e2e8f0', color: '#475569', borderRadius: '4px', fontWeight: 600 }}>
                      {q.questionType}
                    </span>
                  </div>

                  {q.questionType === 'RATING' && (
                    <div>
                      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                        {[1, 2, 3, 4, 5].map((val) => {
                          const isSelected = answers[q.id]?.rating === val;
                          return (
                            <button
                              key={val}
                              type="button"
                              onClick={() => handleRatingChange(q.id, val)}
                              style={{
                                flex: 1,
                                padding: '0.75rem 0',
                                borderRadius: '6px',
                                border: isSelected ? '2px solid #3b82f6' : '1px solid #cbd5e1',
                                backgroundColor: isSelected ? '#eff6ff' : '#ffffff',
                                color: isSelected ? '#1d4ed8' : '#334155',
                                fontWeight: isSelected ? 800 : 600,
                                fontSize: '1.1rem',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease',
                              }}
                            >
                              ⭐ {val}
                            </button>
                          );
                        })}
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#64748b', marginTop: '0.35rem' }}>
                        <span>1 = Poor</span>
                        <span>5 = Excellent</span>
                      </div>
                    </div>
                  )}

                  {q.questionType === 'SINGLE_CHOICE' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
                      {q.options?.map((opt) => {
                        const isSelected = answers[q.id]?.optionId === opt.id;
                        return (
                          <label
                            key={opt.id}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.75rem',
                              padding: '0.625rem 0.875rem',
                              borderRadius: '6px',
                              border: isSelected ? '2px solid #3b82f6' : '1px solid #cbd5e1',
                              backgroundColor: isSelected ? '#eff6ff' : '#ffffff',
                              cursor: 'pointer',
                            }}
                          >
                            <input
                              type="radio"
                              name={q.id}
                              value={opt.id}
                              checked={isSelected}
                              onChange={() => handleOptionChange(q.id, opt.id)}
                            />
                            <span style={{ color: isSelected ? '#1d4ed8' : '#1e293b', fontWeight: isSelected ? 700 : 500 }}>
                              {opt.label}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  )}

                  {q.questionType === 'SHORT_TEXT' && (
                    <div style={{ marginTop: '0.5rem' }}>
                      <textarea
                        rows={3}
                        maxLength={2000}
                        placeholder="Write your feedback here (max 2,000 characters)..."
                        value={answers[q.id]?.text || ''}
                        onChange={(e) => handleTextChange(q.id, e.target.value)}
                        style={{
                          width: '100%',
                          boxSizing: 'border-box',
                          padding: '0.625rem 0.75rem',
                          borderRadius: '6px',
                          border: '1px solid #cbd5e1',
                          fontSize: '0.95rem',
                          fontFamily: 'inherit',
                        }}
                      />
                      <div style={{ textAlign: 'right', fontSize: '0.75rem', color: '#94a3b8' }}>
                        {(answers[q.id]?.text || '').length} / 2000 characters
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={onBack}
                style={{
                  padding: '0.625rem 1.25rem',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  backgroundColor: '#ffffff',
                  color: '#475569',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                style={{
                  padding: '0.625rem 1.75rem',
                  border: 'none',
                  borderRadius: '6px',
                  backgroundColor: '#3b82f6',
                  color: '#ffffff',
                  fontWeight: 700,
                  cursor: submitting ? 'not-allowed' : 'pointer',
                  opacity: submitting ? 0.7 : 1,
                  boxShadow: '0 2px 4px rgba(59, 130, 246, 0.3)',
                }}
              >
                {submitting ? 'Submitting...' : 'Submit Answers'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
