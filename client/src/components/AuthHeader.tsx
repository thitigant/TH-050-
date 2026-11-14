import { useState } from 'react';
import type { AuthUser, UserRole } from '../types/survey.js';

interface AuthHeaderProps {
  currentUser: AuthUser | null;
  activeTab: string;
  onSelectTab: (tab: string) => void;
  onLogin: (email: string, role: UserRole, password?: string) => Promise<void>;
  onLogout: () => void;
}

export function AuthHeader({
  currentUser,
  activeTab,
  onSelectTab,
  onLogin,
  onLogout,
}: AuthHeaderProps) {
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [emailInput, setEmailInput] = useState('owner1@unipulse.edu');
  const [passwordInput, setPasswordInput] = useState('Password123!');
  const [roleInput, setRoleInput] = useState<UserRole>('SURVEY_OWNER');

  const handleCustomLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    await onLogin(emailInput, roleInput, passwordInput);
    setShowLoginModal(false);
  };

  return (
    <header style={{ backgroundColor: '#ffffff', borderBottom: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', position: 'sticky', top: 0, zIndex: 100 }}>
      {/* Top Banner */}
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0.75rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#2563eb', letterSpacing: '-0.02em' }}>
            UniPulse
          </div>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, backgroundColor: '#eff6ff', color: '#1d4ed8', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>
            Theme 10 • Survey System
          </span>
          <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
            CPE 334 Sprint 1
          </span>
        </div>

        {/* User Identity & Quick Switch */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          {currentUser ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a' }}>
                  {currentUser.email}
                </div>
                <span
                  style={{
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    padding: '0.15rem 0.45rem',
                    borderRadius: '9999px',
                    backgroundColor: currentUser.role === 'SURVEY_OWNER' ? '#fef3c7' : '#e0f2fe',
                    color: currentUser.role === 'SURVEY_OWNER' ? '#92400e' : '#0369a1',
                  }}
                >
                  {currentUser.role === 'SURVEY_OWNER' ? '👨‍🏫 SURVEY_OWNER' : '🎓 RESPONDENT'}
                </span>
              </div>
              <button
                type="button"
                onClick={onLogout}
                style={{
                  padding: '0.4rem 0.85rem',
                  backgroundColor: '#fee2e2',
                  color: '#b91c1c',
                  border: '1px solid #fca5a5',
                  borderRadius: '6px',
                  fontWeight: 700,
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                }}
              >
                Logout
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span style={{ fontSize: '0.8rem', color: '#64748b', marginRight: '0.25rem' }}>Quick Login:</span>
              <button
                type="button"
                onClick={() => onLogin('owner1@unipulse.edu', 'SURVEY_OWNER')}
                style={{
                  padding: '0.35rem 0.7rem',
                  backgroundColor: '#3b82f6',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '5px',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                👨‍🏫 Owner 1
              </button>
              <button
                type="button"
                onClick={() => onLogin('student1@unipulse.edu', 'RESPONDENT')}
                style={{
                  padding: '0.35rem 0.7rem',
                  backgroundColor: '#0284c7',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '5px',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                🎓 Student 1
              </button>
              <button
                type="button"
                onClick={() => onLogin('student2@unipulse.edu', 'RESPONDENT')}
                style={{
                  padding: '0.35rem 0.7rem',
                  backgroundColor: '#0f766e',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '5px',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                🎓 Student 2
              </button>
              <button
                type="button"
                onClick={() => setShowLoginModal(true)}
                style={{
                  padding: '0.35rem 0.7rem',
                  backgroundColor: '#f1f5f9',
                  color: '#334155',
                  border: '1px solid #cbd5e1',
                  borderRadius: '5px',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Custom Login...
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Navigation Tabs Bar */}
      <div style={{ borderTop: '1px solid #f1f5f9', backgroundColor: '#f8fafc' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 1.5rem', display: 'flex', gap: '0.5rem', overflowX: 'auto' }}>
          {currentUser?.role === 'SURVEY_OWNER' ? (
            <>
              <button
                type="button"
                onClick={() => onSelectTab('owner_surveys')}
                style={tabStyle(activeTab === 'owner_surveys')}
              >
                📋 My Surveys & Lifecycle
              </button>
              <button
                type="button"
                onClick={() => onSelectTab('create_survey')}
                style={tabStyle(activeTab === 'create_survey')}
              >
                ➕ Create Survey (Draft)
              </button>
              <button
                type="button"
                onClick={() => onSelectTab('analytics')}
                style={tabStyle(activeTab === 'analytics')}
              >
                📊 Analytics Dashboard
              </button>
              <button
                type="button"
                onClick={() => onSelectTab('rbac_demo')}
                style={tabStyle(activeTab === 'rbac_demo')}
              >
                🛡️ Role Guards (RBAC Demo)
              </button>
            </>
          ) : currentUser?.role === 'RESPONDENT' ? (
            <>
              <button
                type="button"
                onClick={() => onSelectTab('browse')}
                style={tabStyle(activeTab === 'browse')}
              >
                📝 Browse & Take Surveys
              </button>
              <button
                type="button"
                onClick={() => onSelectTab('receipts')}
                style={tabStyle(activeTab === 'receipts')}
              >
                🧾 My Submission Receipts
              </button>
              <button
                type="button"
                onClick={() => onSelectTab('analytics')}
                style={tabStyle(activeTab === 'analytics')}
              >
                📊 Public Results Summary
              </button>
              <button
                type="button"
                onClick={() => onSelectTab('rbac_demo')}
                style={tabStyle(activeTab === 'rbac_demo')}
              >
                🛡️ Role Guards (RBAC Demo)
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => onSelectTab('browse')}
                style={tabStyle(activeTab === 'browse')}
              >
                📝 Browse Surveys
              </button>
              <button
                type="button"
                onClick={() => onSelectTab('analytics')}
                style={tabStyle(activeTab === 'analytics')}
              >
                📊 Analytics Dashboard
              </button>
              <button
                type="button"
                onClick={() => onSelectTab('rbac_demo')}
                style={tabStyle(activeTab === 'rbac_demo')}
              >
                🛡️ Role Guards (RBAC Demo)
              </button>
            </>
          )}
        </div>
      </div>

      {/* Custom Login Modal */}
      {showLoginModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999 }}>
          <div style={{ backgroundColor: '#ffffff', borderRadius: '10px', padding: '1.75rem', width: '100%', maxWidth: '400px', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
            <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>
              Sign In to UniPulse
            </h3>

            <form onSubmit={handleCustomLogin} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '0.25rem' }}>
                  Email
                </label>
                <input
                  type="email"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  style={{ width: '100%', boxSizing: 'border-box', padding: '0.55rem 0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '0.25rem' }}>
                  Password
                </label>
                <input
                  type="password"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  style={{ width: '100%', boxSizing: 'border-box', padding: '0.55rem 0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                  required
                />
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Default test password: Password123!</span>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '0.25rem' }}>
                  Role
                </label>
                <select
                  value={roleInput}
                  onChange={(e) => setRoleInput(e.target.value as UserRole)}
                  style={{ width: '100%', boxSizing: 'border-box', padding: '0.55rem 0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff' }}
                >
                  <option value="SURVEY_OWNER">SURVEY_OWNER (Faculty / Creator)</option>
                  <option value="RESPONDENT">RESPONDENT (Student)</option>
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1rem' }}>
                <button
                  type="button"
                  onClick={() => setShowLoginModal(false)}
                  style={{ padding: '0.5rem 1rem', border: '1px solid #cbd5e1', borderRadius: '6px', backgroundColor: '#ffffff', color: '#475569', fontWeight: 600, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ padding: '0.5rem 1.25rem', border: 'none', borderRadius: '6px', backgroundColor: '#2563eb', color: '#ffffff', fontWeight: 700, cursor: 'pointer' }}
                >
                  Sign In
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </header>
  );
}

function tabStyle(isActive: boolean): React.CSSProperties {
  return {
    padding: '0.75rem 1rem',
    border: 'none',
    borderBottom: isActive ? '3px solid #2563eb' : '3px solid transparent',
    backgroundColor: 'transparent',
    color: isActive ? '#1d4ed8' : '#475569',
    fontWeight: isActive ? 800 : 600,
    fontSize: '0.9rem',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  };
}
