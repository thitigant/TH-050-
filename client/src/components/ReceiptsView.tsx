import type { SubmissionReceipt } from '../types/survey.js';

interface ReceiptsViewProps {
  receipts: SubmissionReceipt[];
  studentEmail: string;
}

export function ReceiptsView({ receipts, studentEmail }: ReceiptsViewProps) {
  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '0 1rem' }}>
      <div style={{ marginBottom: '1.25rem' }}>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
          My Submission History & Receipts
        </h2>
        <p style={{ color: '#64748b', fontSize: '0.9rem', margin: '0.25rem 0 0 0' }}>
          Personal receipt lookup for verified feedback submissions (Logged in as {studentEmail}).
        </p>
      </div>

      {receipts.length === 0 ? (
        <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', padding: '3rem', textAlign: 'center', color: '#64748b' }}>
          <p>No submission receipts found yet. Answer an active survey from the catalog to generate a receipt!</p>
        </div>
      ) : (
        <div style={{ backgroundColor: '#ffffff', borderRadius: '10px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontWeight: 700 }}>
                <th style={{ padding: '0.75rem 1rem' }}>Official Receipt ID</th>
                <th style={{ padding: '0.75rem 1rem' }}>Survey Title</th>
                <th style={{ padding: '0.75rem 1rem' }}>Submitted At</th>
                <th style={{ padding: '0.75rem 1rem' }}>Answers Recorded</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {receipts.map((rcpt) => (
                <tr key={rcpt.receiptId} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '0.85rem 1rem', fontFamily: 'monospace', fontWeight: 700, color: '#2563eb' }}>
                    {rcpt.receiptId}
                  </td>
                  <td style={{ padding: '0.85rem 1rem', fontWeight: 600, color: '#0f172a' }}>
                    {rcpt.surveyTitle}
                  </td>
                  <td style={{ padding: '0.85rem 1rem', color: '#64748b', fontSize: '0.85rem' }}>
                    {new Date(rcpt.submittedAt).toLocaleString()}
                  </td>
                  <td style={{ padding: '0.85rem 1rem', color: '#475569' }}>
                    {rcpt.answersCount} answers
                  </td>
                  <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                    <span style={{ backgroundColor: '#dcfce7', color: '#166534', padding: '0.2rem 0.55rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 700 }}>
                      ✓ Verified Saved
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
