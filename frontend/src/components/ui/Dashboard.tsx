// frontend/src/components/Dashboard.tsx
import { useState, useEffect, useCallback } from 'react';
import { Button } from './ui/button';
import { User, Users, Lightbulb, LogOut, Home, FileText, TrendingUp, Settings, UserCheck } from 'lucide-react';
import ProfilePage         from './ProfilePage';
import GroupPage           from './GroupPage';
import SimilarProjectsPage from './SimilarProjectsPage';
import SupervisorsPage     from './SupervisorsPage';
import TrendsPage          from './TrendsPage';
import DashboardHome       from './DashboardHome';
import RecommendationsPage from './RecommendationsPage';
import GroupSettingsPage   from './GroupSettingsPage';
import api from '../services/api';

type Page = 'home'|'profile'|'group'|'recommendations'|'projects'|'supervisors'|'trends'|'settings';

interface DashboardProps { studentName: string; onLogout: () => void; }

export default function Dashboard({ studentName, onLogout }: DashboardProps) {
  const [currentPage,    setCurrentPage]    = useState<Page>('home');
  const [groupFinalized, setGroupFinalized]  = useState(false);
  const [isLeader,       setIsLeader]        = useState(false);
  const [refreshTrigger, setRefreshTrigger]  = useState(0);

  const syncLeader = useCallback(async () => {
    try {
      const [me, grp] = await Promise.all([api.get('/auth/me'), api.get('/group')]);
      setIsLeader(grp.data.has_group
        ? grp.data.group.members.find((m: any) => m.role === 'Leader')?.id === me.data.id
        : false);
    } catch { setIsLeader(false); }
  }, []);

  useEffect(() => { syncLeader(); }, [syncLeader]);

  const handleGroupFinalized = (v: boolean) => { setGroupFinalized(v); syncLeader(); };

  const menu: { id: Page; label: string; icon: React.ElementType }[] = [
    { id: 'home',            label: 'Home',             icon: Home       },
    { id: 'profile',         label: 'My Profile',       icon: User       },
    { id: 'group',           label: 'My Group',         icon: Users      },
    { id: 'recommendations', label: 'Recommendations',  icon: Lightbulb  },
    { id: 'projects',        label: 'Similar Projects', icon: FileText   },
    { id: 'supervisors',     label: 'Supervisors',      icon: UserCheck  },
    { id: 'trends',          label: 'Trends',           icon: TrendingUp },
    { id: 'settings',        label: 'Group Settings',   icon: Settings   },
  ];

  const renderPage = () => {
    switch (currentPage) {
      case 'home':            return <DashboardHome onNavigate={setCurrentPage} studentName={studentName} groupFinalized={groupFinalized} />;
      case 'profile':         return <ProfilePage />;
      case 'group':           return <GroupPage onGroupFinalized={handleGroupFinalized} groupFinalized={groupFinalized} />;
      case 'recommendations': return <RecommendationsPage groupFinalized={groupFinalized} refreshTrigger={refreshTrigger} />;
      case 'projects':        return <SimilarProjectsPage groupFinalized={groupFinalized} />;
      case 'supervisors':     return <SupervisorsPage groupFinalized={groupFinalized} />;
      case 'trends':          return <TrendsPage />;
      case 'settings':        return <GroupSettingsPage groupFinalized={groupFinalized} isLeader={isLeader} onWeightsUpdated={() => setRefreshTrigger(n=>n+1)} />;
      default:                return <DashboardHome onNavigate={setCurrentPage} studentName={studentName} groupFinalized={groupFinalized} />;
    }
  };

  return (
    <>
      <style>{`
        .dash-sidebar { width:232px;flex-shrink:0;background:#FAFAFA;border-right:1px solid rgba(139,92,246,0.1);display:flex;flex-direction:column;box-shadow:2px 0 16px rgba(91,33,182,0.06); }
        .dash-brand { padding:18px 14px 14px;border-bottom:1px solid rgba(139,92,246,0.08); }
        .dash-logo-wrap { width:44px;height:44px;border-radius:50%;background:#080012;overflow:hidden;border:1.5px solid rgba(139,92,246,0.45);box-shadow:0 0 16px rgba(91,33,182,0.3);display:flex;align-items:center;justify-content:center;flex-shrink:0; }
        .dash-logo-img { width:100%;height:100%;object-fit:contain; }
        .dash-brand-text { font-weight:700;font-size:0.95rem;background:linear-gradient(135deg,#5B21B6,#9333EA);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text; }
        .dash-brand-sub { font-size:0.65rem;color:#9CA3AF;letter-spacing:0.03em;margin-top:1px; }
        .dash-nav { flex:1;padding:10px 8px;overflow-y:auto;display:flex;flex-direction:column;gap:2px; }
        .dash-nav-btn { width:100%;display:flex;align-items:center;gap:9px;padding:8px 12px;border-radius:9px;font-size:0.82rem;transition:all 0.18s ease;border:none;background:transparent;cursor:pointer;text-align:left;color:#6B7280; }
        .dash-nav-btn.active { background:linear-gradient(135deg,rgba(91,33,182,0.18),rgba(124,58,237,0.12));color:#8B5CF6;font-weight:500;border:1px solid rgba(139,92,246,0.22);box-shadow:0 0 12px rgba(91,33,182,0.12); }
        .dash-nav-btn:not(.active):hover { background:rgba(139,92,246,0.06);color:#9CA3AF; }
        .dash-footer { padding:10px 10px 14px;border-top:1px solid rgba(139,92,246,0.08); }
        .dash-user-card { margin-bottom:8px;padding:7px 10px;background:rgba(139,92,246,0.05);border-radius:8px;border:1px solid rgba(139,92,246,0.08); }
        .dash-user-label { font-size:0.65rem;color:#9CA3AF;margin-bottom:1px; }
        .dash-user-name { font-size:0.8rem;color:#374151;font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap; }
        .dash-logout { width:100%;background:transparent!important;border:1px solid rgba(239,68,68,0.12)!important;color:#9CA3AF!important;font-size:0.8rem!important;border-radius:8px!important;transition:all 0.2s!important; }
        .dash-logout:hover { background:rgba(239,68,68,0.07)!important;color:#F87171!important;border-color:rgba(239,68,68,0.25)!important; }
      `}</style>

      <div style={{ display:'flex', height:'100vh', background:'#F9F7FF' }}>
        {/* Sidebar */}
        <aside className="dash-sidebar">
          <div className="dash-brand">
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <div className="dash-logo-wrap">
                <img src="/logo.png" alt="Mu'een" className="dash-logo-img"
                  onError={e => {
                    e.currentTarget.style.display = 'none';
                    const f = e.currentTarget.nextElementSibling as HTMLElement;
                    if(f) { f.style.display='flex'; }
                  }}
                />
                <div style={{ display:'none', width:'100%', height:'100%', alignItems:'center', justifyContent:'center', color:'#C4B5FD', fontSize:'1.2rem' }}>م</div>
              </div>
              <div>
                <div className="dash-brand-text">Mu'een</div>
                <div className="dash-brand-sub">معين · Recommender</div>
              </div>
            </div>
          </div>

          <nav className="dash-nav">
            {menu.map(item => {
              const Icon = item.icon;
              return (
                <button key={item.id} className={`dash-nav-btn ${currentPage===item.id?'active':''}`}
                  onClick={() => setCurrentPage(item.id)}>
                  <Icon style={{ width:15, height:15, flexShrink:0 }} />
                  {item.label}
                </button>
              );
            })}
          </nav>

          <div className="dash-footer">
            <div className="dash-user-card">
              <div className="dash-user-label">Signed in as</div>
              <div className="dash-user-name">{studentName}</div>
            </div>
            <Button variant="outline" className="dash-logout" onClick={onLogout}>
              <LogOut style={{ width:13, height:13, marginRight:6 }} /> Sign Out
            </Button>
          </div>
        </aside>

        <main style={{ flex:1, overflowY:'auto' }}>{renderPage()}</main>
      </div>
    </>
  );
}
