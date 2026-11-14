import { useState } from 'react';
import type { Survey, Question, QuestionType } from '../types/survey.js';

interface CreateSurveyViewProps {
  ownerEmail: string;
  onCancel: () => void;
  onCreateSurvey: (newSurvey: Omit<Survey, 'id' | 'createdAt' | 'ownerId'>) => void;
}

export function CreateSurveyView({
  ownerEmail,
  onCancel,
  onCreateSurvey,
}: CreateSurveyViewProps) {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Course Evaluation');
  const [description, setDescription] = useState('');
  const [questions, setQuestions] = useState<Question[]>([
    {
      id: 'q_init_1',
      prompt: 'Rate the overall quality and clarity of course materials (1-5):',
      questionType: 'RATING',
      isRequired: true,
      order: 1,
    },
  ]);
  const [newPrompt, setNewPrompt] = useState('');
  const [newType, setNewType] = useState<QuestionType>('RATING');
  const [newRequired, setNewRequired] = useState(true);
  const [newOptionsText, setNewOptionsText] = useState('Agree, Neutral, Disagree');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleAddQuestion = () => {
    if (!newPrompt.trim()) {
      setErrorMsg('Please enter a question prompt.');
      return;
    }
    setErrorMsg(null);

    const qId = `q_${Date.now()}`;
    const question: Question = {
      id: qId,
      prompt: newPrompt.trim(),
      questionType: newType,
      isRequired: newRequired,
      order: questions.length + 1,
    };

    if (newType === 'SINGLE_CHOICE') {
      const splitOptions = newOptionsText
        .split(',')
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
      if (splitOptions.length < 2) {
        setErrorMsg('Single choice questions must have at least 2 comma-separated options.');
        return;
      }
      question.options = splitOptions.map((label, idx) => ({
        id: `opt_${Date.now()}_${idx}`,
        label,
        order: idx + 1,
      }));
    }

    setQuestions([...questions, question]);
    setNewPrompt('');
  };

  const handleRemoveQuestion = (idx: number) => {
    setQuestions(questions.filter((_, i) => i !== idx));
  };

  const handleSubmit = (status: 'DRAFT' | 'PUBLISHED') => {
    setErrorMsg(null);
    if (!title.trim() || title.trim().length < 3) {
      setErrorMsg('Survey Title must be at least 3 characters.');
      return;
    }

    if (newPrompt.trim().length > 0) {
      setErrorMsg('You typed a question prompt below — please click "Add Question" to add it to the list before saving.');
      return;
    }

    if (status === 'PUBLISHED' && questions.length === 0) {
      setErrorMsg('HTTP 422 Unprocessable Entity (BR-02): Cannot publish a survey with 0 questions. Please add at least 1 question.');
      return;
    }

    onCreateSurvey({
      title: title.trim(),
      category: category.trim(),
      description: description.trim() || undefined,
      status,
      ownerEmail,
      questions,
    });
  };

  return (
    <div style={{ maxWidth: '850px', margin: '0 auto', padding: '0 1rem' }}>
      <button
        type="button"
        onClick={onCancel}
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
        ← Back to Survey Management
      </button>

      <div style={{ backgroundColor: '#ffffff', borderRadius: '10px', padding: '1.75rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', margin: '0 0 0.5rem 0' }}>
          Create New Survey
        </h2>
        <p style={{ color: '#64748b', fontSize: '0.9rem', margin: '0 0 1.5rem 0' }}>
          Author a new course survey or feedback questionnaire for CPE students.
        </p>

        {errorMsg && (
          <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px', padding: '0.75rem 1rem', color: '#b91c1c', marginBottom: '1.25rem', fontWeight: 600 }}>
            ⚠️ {errorMsg}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
              Survey Title *
            </label>
            <input
              type="text"
              placeholder="e.g. CPE 334 Midterm Course & Lab Feedback"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              style={{
                width: '100%',
                boxSizing: 'border-box',
                padding: '0.625rem 0.875rem',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                fontSize: '0.95rem',
              }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                Category *
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  padding: '0.625rem 0.875rem',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.95rem',
                  backgroundColor: '#ffffff',
                }}
              >
                <option value="Course Evaluation">Course Evaluation</option>
                <option value="Department Facilities">Department Facilities</option>
                <option value="Academic Advising">Academic Advising</option>
                <option value="Student Life & Well-being">Student Life & Well-being</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                Owner Identity
              </label>
              <input
                type="text"
                disabled
                value={ownerEmail}
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  padding: '0.625rem 0.875rem',
                  borderRadius: '6px',
                  border: '1px solid #e2e8f0',
                  backgroundColor: '#f1f5f9',
                  color: '#64748b',
                  fontSize: '0.95rem',
                }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
              Description (Optional)
            </label>
            <textarea
              rows={2}
              placeholder="Instructions or background notes for respondents..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              style={{
                width: '100%',
                boxSizing: 'border-box',
                padding: '0.625rem 0.875rem',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                fontSize: '0.95rem',
                fontFamily: 'inherit',
              }}
            />
          </div>
        </div>

        {/* Question Authoring Section */}
        <div style={{ marginTop: '2rem', borderTop: '1px solid #e2e8f0', paddingTop: '1.5rem' }}>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', margin: '0 0 1rem 0' }}>
            Questions ({questions.length})
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
            {questions.map((q, idx) => (
              <div
                key={q.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '0.75rem 1rem',
                  borderRadius: '6px',
                  backgroundColor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                }}
              >
                <div>
                  <span style={{ fontWeight: 700, color: '#1e293b' }}>Q{idx + 1}. {q.prompt}</span>
                  <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.2rem' }}>
                    Type: <strong>{q.questionType}</strong> {q.isRequired ? '• Required' : '• Optional'}
                    {q.options && ` • Options: [${q.options.map((o) => o.label).join(', ')}]`}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveQuestion(idx)}
                  style={{
                    backgroundColor: '#fee2e2',
                    color: '#b91c1c',
                    border: 'none',
                    borderRadius: '4px',
                    padding: '0.3rem 0.6rem',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Delete
                </button>
              </div>
            ))}
          </div>

          {/* Add Question Box */}
          <div style={{ backgroundColor: '#f0f9ff', border: '1px dashed #38bdf8', borderRadius: '8px', padding: '1.25rem' }}>
            <h4 style={{ margin: '0 0 0.75rem 0', color: '#0369a1', fontSize: '0.95rem', fontWeight: 700 }}>
              + Add Question to Survey
            </h4>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div>
                <input
                  type="text"
                  placeholder="Enter question prompt (e.g. How helpful were the lab exercises?)..."
                  value={newPrompt}
                  onChange={(e) => setNewPrompt(e.target.value)}
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    padding: '0.625rem 0.75rem',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.9rem',
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '0.75rem', alignItems: 'center' }}>
                <div>
                  <select
                    value={newType}
                    onChange={(e) => setNewType(e.target.value as QuestionType)}
                    style={{
                      width: '100%',
                      boxSizing: 'border-box',
                      padding: '0.55rem 0.75rem',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.9rem',
                      backgroundColor: '#ffffff',
                    }}
                  >
                    <option value="RATING">RATING (1 to 5 Stars)</option>
                    <option value="SINGLE_CHOICE">SINGLE_CHOICE (Options list)</option>
                    <option value="SHORT_TEXT">SHORT_TEXT (Open text up to 2000 chars)</option>
                  </select>
                </div>

                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: '#334155', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={newRequired}
                    onChange={(e) => setNewRequired(e.target.checked)}
                  />
                  Required question
                </label>

                <button
                  type="button"
                  onClick={handleAddQuestion}
                  style={{
                    backgroundColor: '#0284c7',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '0.55rem 1.25rem',
                    fontSize: '0.9rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Add Question
                </button>
              </div>

              {newType === 'SINGLE_CHOICE' && (
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: '#0369a1', marginBottom: '0.25rem' }}>
                    Enter options separated by comma:
                  </label>
                  <input
                    type="text"
                    value={newOptionsText}
                    onChange={(e) => setNewOptionsText(e.target.value)}
                    placeholder="e.g. Strongly Agree, Neutral, Disagree"
                    style={{
                      width: '100%',
                      boxSizing: 'border-box',
                      padding: '0.5rem 0.75rem',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.875rem',
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Form Submission Buttons */}
        <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
          <button
            type="button"
            onClick={onCancel}
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
            type="button"
            onClick={() => handleSubmit('DRAFT')}
            style={{
              padding: '0.625rem 1.25rem',
              border: '1px solid #cbd5e1',
              borderRadius: '6px',
              backgroundColor: '#f1f5f9',
              color: '#1e293b',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Save as Draft
          </button>
          <button
            type="button"
            onClick={() => handleSubmit('PUBLISHED')}
            style={{
              padding: '0.625rem 1.5rem',
              border: 'none',
              borderRadius: '6px',
              backgroundColor: '#16a34a',
              color: '#ffffff',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 2px 4px rgba(22, 163, 74, 0.3)',
            }}
          >
            Publish Immediately 🚀
          </button>
        </div>
      </div>
    </div>
  );
}
