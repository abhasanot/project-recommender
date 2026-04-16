// frontend/src/components/Dashboard.tsx
import { useState, useEffect, useCallback } from 'react';
import { Button } from './ui/button';
import {
  User, Users, Lightbulb, LogOut, Home,
  FileText, TrendingUp, Settings,
} from 'lucide-react';
import ProfilePage          from './ProfilePage';
import GroupPage            from './GroupPage';
import SimilarProjectsPage  from './SimilarProjectsPage';
import TrendsPage           from './TrendsPage';
import DashboardHome        from './DashboardHome';
import RecommendationsPage  from './RecommendationsPage';
import GroupSettingsPage    from './GroupSettingsPage';
import api from '../services/api';

type Page =
  | 'home' | 'profile' | 'group' | 'recommendations'
  | 'projects' | 'trends' | 'settings';

interface DashboardProps {
  studentName: string;
  onLogout:    () => void;
}

export default function Dashboard({ studentName, onLogout }: DashboardProps) {
  const [currentPage,     setCurrentPage]     = useState<Page>('home');
  const [groupFinalized,  setGroupFinalized]   = useState(false);
  const [isLeader,        setIsLeader]         = useState(false);
  const [refreshTrigger,  setRefreshTrigger]   = useState(0);

  // Derive isLeader by comparing /auth/me against the leader in /group
  const syncLeaderStatus = useCallback(async () => {
    try {
      const [meRes, grpRes] = await Promise.all([
        api.get('/auth/me'),
        api.get('/group'),
      ]);
      if (grpRes.data.has_group) {
        const myId  = meRes.data.id;
        const leader = grpRes.data.group.members.find((m: any) => m.role === 'Leader');
        setIsLeader(leader?.id === myId);
      } else {
        setIsLeader(false);
      }
    } catch {
      setIsLeader(false);
    }
  }, []);

  useEffect(() => { syncLeaderStatus(); }, [syncLeaderStatus]);

  const handleGroupFinalized = (finalized: boolean) => {
    setGroupFinalized(finalized);
    syncLeaderStatus();
  };

  const handleWeightsUpdated = () => {
    setRefreshTrigger(n => n + 1);
  };

  const menuItems: { id: Page; label: string; icon: React.ElementType }[] = [
    { id: 'home',            label: 'Home',             icon: Home       },
    { id: 'profile',         label: 'My Profile',       icon: User       },
    { id: 'group',           label: 'My Group',         icon: Users      },
    { id: 'recommendations', label: 'Recommendations',  icon: Lightbulb  },
    { id: 'projects',        label: 'Similar Projects', icon: FileText   },
    { id: 'trends',          label: 'Trends',           icon: TrendingUp },
    { id: 'settings',        label: 'Group Settings',   icon: Settings   },
  ];

  const renderPage = () => {
    switch (currentPage) {
      case 'home':
        return (
          <DashboardHome
            onNavigate={setCurrentPage}
            studentName={studentName}
            groupFinalized={groupFinalized}
          />
        );
      case 'profile':
        return <ProfilePage />;
      case 'group':
        return (
          <GroupPage
            onGroupFinalized={handleGroupFinalized}
            groupFinalized={groupFinalized}
          />
        );
      case 'recommendations':
        return (
          <RecommendationsPage
            groupFinalized={groupFinalized}
            refreshTrigger={refreshTrigger}
          />
        );
      case 'projects':
        return <SimilarProjectsPage />;
      case 'trends':
        return <TrendsPage />;
      case 'settings':
        return (
          <GroupSettingsPage
            groupFinalized={groupFinalized}
            isLeader={isLeader}
            onWeightsUpdated={handleWeightsUpdated}
          />
        );
      default:
        return (
          <DashboardHome
            onNavigate={setCurrentPage}
            studentName={studentName}
            groupFinalized={groupFinalized}
          />
        );
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col shadow-sm">
        <div className="p-6 border-b border-gray-200">
          <div className="flex flex-col items-center text-center">
            {/* Logo */}
            <div className="w-32 h-32 rounded-xl flex items-center justify-center overflow-hidden mb-0">
              <img 
                src="/logo.png" 
                alt="Mu'een Logo" 
                className="w-32 h-32 object-contain"
                onError={(e) => {
                  const target = e.currentTarget;
                  target.style.display = 'none';
                  const parent = target.parentElement;
                  if (parent) {
                    const fallback = document.createElement('span');
                    fallback.className = 'text-2xl text-white font-bold';
                    fallback.textContent = 'م';
                    parent.appendChild(fallback);
                  }
                }}
              />
            </div>
          <div className="-mt-1">
            <h1 className="text-lg font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              Mu'een
            </h1>
            <p className="text-xs text-gray-400 -mt-0.5">Recommendation System</p>
          </div>
        </div>
      </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {menuItems.map(item => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => setCurrentPage(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm transition-all ${
                  currentPage === item.id
                    ? 'bg-gradient-to-r from-indigo-50 to-purple-50 text-indigo-700 font-medium shadow-sm'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <div className="mb-3 px-3 py-2 bg-white rounded-lg border border-gray-200">
            <p className="text-xs text-gray-400">Logged in as</p>
            <p className="text-sm text-gray-800 truncate font-medium">{studentName}</p>
          </div>
          <Button
            variant="outline"
            className="w-full text-sm hover:bg-red-50 hover:text-red-600 hover:border-red-200"
            onClick={onLogout}
          >
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        {renderPage()}
      </main>
    </div>
  );
}