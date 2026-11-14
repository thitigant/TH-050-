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
  onLogout,
}: AuthHeaderProps) {
  return (
    <header
      style={{
        backgroundColor: '#ffffff',
        borderBottom: '1px solid #e2e8f0',
        position: 'sticky',
        top: 0,
        zIndex: 30,
      }}
    >
      {/* Top Bar (matches original localhost:4000 header) */}
      <div
        style={{
          maxWidth: '1280px',
          margin: '0 auto',
          padding: '0 1.5rem',
          height: '4rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div
            style={{
              width: '2.5rem',
              height: '2.5rem',
              borderRadius: '0.75rem',
              backgroundColor: '#4f46e5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              fontWeight: 700,
              fontSize: '1.25rem',
              boxShadow: '0 4px 6px -1px rgba(79, 70, 229, 0.2)',
            }}
          >
            <i className="fa-solid fa-square-poll-vertical" />
          </div>
          <div>
            <h1
              style={{
                margin: 0,
                fontSize: '1.25rem',
                fontWeight: 700,
                background: 'linear-gradient(to right, #4f46e5, #7c3aed)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                lineHeight: 1.2,
              }}
            >
              UniPulse
            </h1>
            <p style={{ margin: 0, fontSize: '0.75rem', color: '#94a3b8' }}>
              Campus Feedback &amp; Survey System
            </p>
          </div>
        </div>

        {/* User Session Control */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {currentUser ? (
            <>
              <span
                style={{
                  padding: '0.25rem 0.65rem',
                  borderRadius: '9999px',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  backgroundColor:
                    currentUser.role === 'SURVEY_OWNER' ? '#eef2ff' : '#ecfdf5',
                  color:
                    currentUser.role === 'SURVEY_OWNER' ? '#4338ca' : '#047857',
                }}
              >
                {currentUser.role}
              </span>
              <span
                style={{
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  color: '#334155',
                }}
              >
                {currentUser.email}
              </span>
              <button
                type="button"
                onClick={onLogout}
                style={{
                  padding: '0.375rem 0.75rem',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  color: '#dc2626',
                  backgroundColor: 'transparent',
                  border: '1px solid #fecaca',
                  borderRadius: '0.5rem',
                  cursor: 'pointer',
                  transition: 'background-color 0.15s ease',
                }}
                onMouseOver={(e) =>
                  (e.currentTarget.style.backgroundColor = '#fef2f2')
                }
                onMouseOut={(e) =>
                  (e.currentTarget.style.backgroundColor = 'transparent')
                }
              >
                <i
                  className="fa-solid fa-right-from-bracket"
                  style={{ marginRight: '0.35rem' }}
                />
                Sign Out
              </button>
            </>
          ) : (
            <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
              Not signed in
            </span>
          )}
        </div>
      </div>

      {/* Navigation Tabs Bar (only shown when signed in) */}
      {currentUser && (
        <div
          style={{
            borderTop: '1px solid #f1f5f9',
            backgroundColor: '#f8fafc',
          }}
        >
          <div
            style={{
              maxWidth: '1280px',
              margin: '0 auto',
              padding: '0 1.5rem',
              display: 'flex',
              gap: '0.5rem',
              overflowX: 'auto',
            }}
          >
            {currentUser.role === 'SURVEY_OWNER' ? (
              <>
                <button
                  type="button"
                  onClick={() => onSelectTab('owner_surveys')}
                  style={tabStyle(activeTab === 'owner_surveys')}
                >
                  <i
                    className="fa-solid fa-list-check"
                    style={{ marginRight: '0.4rem' }}
                  />
                  My Surveys &amp; Lifecycle
                </button>
                <button
                  type="button"
                  onClick={() => onSelectTab('create_survey')}
                  style={tabStyle(activeTab === 'create_survey')}
                >
                  <i
                    className="fa-solid fa-plus"
                    style={{ marginRight: '0.4rem' }}
                  />
                  Create Draft Survey
                </button>
                <button
                  type="button"
                  onClick={() => onSelectTab('analytics')}
                  style={tabStyle(activeTab === 'analytics')}
                >
                  <i
                    className="fa-solid fa-chart-pie"
                    style={{ marginRight: '0.4rem' }}
                  />
                  Analytics Dashboard
                </button>
                <button
                  type="button"
                  onClick={() => onSelectTab('rbac_demo')}
                  style={tabStyle(activeTab === 'rbac_demo')}
                >
                  <i
                    className="fa-solid fa-shield-halved"
                    style={{ marginRight: '0.4rem' }}
                  />
                  Role Guards (RBAC Demo)
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => onSelectTab('browse')}
                  style={tabStyle(activeTab === 'browse')}
                >
                  <i
                    className="fa-solid fa-clipboard-list"
                    style={{ marginRight: '0.4rem' }}
                  />
                  Browse &amp; Take Surveys
                </button>
                <button
                  type="button"
                  onClick={() => onSelectTab('receipts')}
                  style={tabStyle(activeTab === 'receipts')}
                >
                  <i
                    className="fa-solid fa-receipt"
                    style={{ marginRight: '0.4rem' }}
                  />
                  My Submission Receipts
                </button>
                <button
                  type="button"
                  onClick={() => onSelectTab('analytics')}
                  style={tabStyle(activeTab === 'analytics')}
                >
                  <i
                    className="fa-solid fa-chart-simple"
                    style={{ marginRight: '0.4rem' }}
                  />
                  Public Results Summary
                </button>
                <button
                  type="button"
                  onClick={() => onSelectTab('rbac_demo')}
                  style={tabStyle(activeTab === 'rbac_demo')}
                >
                  <i
                    className="fa-solid fa-shield-halved"
                    style={{ marginRight: '0.4rem' }}
                  />
                  Role Guards (RBAC Demo)
                </button>
              </>
            )}
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
    borderBottom: isActive ? '2.5px solid #4f46e5' : '2.5px solid transparent',
    backgroundColor: 'transparent',
    color: isActive ? '#4f46e5' : '#64748b',
    fontWeight: isActive ? 700 : 500,
    fontSize: '0.875rem',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    whiteSpace: 'nowrap',
  };
}
