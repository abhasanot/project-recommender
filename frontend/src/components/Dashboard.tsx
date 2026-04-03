// frontend/src/components/Dashboard.tsx
import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { User, Users, Lightbulb, LogOut, Home, FileText, TrendingUp, Settings, UserCheck } from 'lucide-react';
import ProfilePage from './ProfilePage';
import GroupPage from './GroupPage';
import SimilarProjectsPage from './SimilarProjectsPage';
import SupervisorsPage from './SupervisorsPage';
import TrendsPage from './TrendsPage';
import DashboardHome from './DashboardHome';
import RecommendationsPage from './RecommendationsPage';
import GroupSettingsPage from './GroupSettingsPage';
import api from '../services/api';

interface DashboardProps {
  studentName: string;
  onLogout: () => void;
}

type Page =
  | 'home'
  | 'profile'
  | 'group'
  | 'recommendations'
  | 'projects'
  | 'supervisors'
  | 'trends'
  | 'settings';

export default function Dashboard({ studentName, onLogout }: DashboardProps) {
  const [currentPage, setCurrentPage]     = useState<Page>('home');
  const [groupFinalized, setGroupFinalized] = useState(false);
  /**
   * FIX (Bug): The original code always passed `isLeader={false}` to
   * GroupSettingsPage, meaning the group leader could never access weight
   * settings — the UI always showed the "only the leader can adjust" message.
   *
   * We now fetch the current user's ID on mount and compare it against the
   * group's leader ID returned by GET /api/group to set isLeader correctly.
   */
  const [isLeader, setIsLeader]           = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Determine leader status whenever the group finalization state changes
  useEffect(() => {
    checkLeaderStatus();
  }, [groupFinalized]);

  const checkLeaderStatus = async () => {
    try {
      const [meRes, groupRes] = await Promise.all([
        api.get('/auth/me'),
        api.get('/group'),
      ]);
      if (groupRes.data.has_group) {
        const currentUserId = meRes.data.id;
        const leader = groupRes.data.group.members.find(
          (m: any) => m.role === 'Leader'
        );
        // Compare as numbers (the API returns numeric IDs)
        setIsLeader(leader?.id === currentUserId);
      } else {
        setIsLeader(false);
      }
    } catch {
      setIsLeader(false);
    }
  };

  const handleWeightsUpdated = () => {
    // Increment trigger so RecommendationsPage re-fetches automatically
    setRefreshTrigger((n) => n + 1);
  };

  const menuItems: { id: Page; label: string; icon: React.ElementType }[] = [
    { id: 'home',            label: 'Home',             icon: Home        },
    { id: 'profile',         label: 'My Profile',       icon: User        },
    { id: 'group',           label: 'My Group',          icon: Users       },
    { id: 'recommendations', label: 'Recommendations',  icon: Lightbulb   },
    { id: 'projects',        label: 'Similar Projects',  icon: FileText    },
    { id: 'supervisors',     label: 'Supervisors',       icon: UserCheck   },
    { id: 'trends',          label: 'Trends',            icon: TrendingUp  },
    { id: 'settings',        label: 'Group Settings',    icon: Settings    },
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
            onGroupFinalized={(finalized) => {
              setGroupFinalized(finalized);
              checkLeaderStatus();
            }}
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
        return <SimilarProjectsPage groupFinalized={groupFinalized} />;
      case 'supervisors':
        return <SupervisorsPage groupFinalized={groupFinalized} />;
      case 'trends':
        return <TrendsPage />;
      case 'settings':
        return (
          <GroupSettingsPage
            groupFinalized={groupFinalized}
            isLeader={isLeader}           // ← FIX: was always false
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
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl flex items-center justify-center">
              <span className="text-2xl text-white font-bold">م</span>
            </div>
            <div>
              <h1 className="text-xl bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                Mu'een
              </h1>
              <p className="text-xs text-gray-500">Recommendation System</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => setCurrentPage(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                  currentPage === item.id
                    ? 'bg-gradient-to-r from-indigo-50 to-purple-50 text-indigo-700 shadow-sm'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <div className="mb-3 px-4 py-2 bg-white rounded-lg border border-gray-200">
            <p className="text-xs text-gray-500">Logged in as</p>
            <p className="text-sm text-gray-900 truncate">{studentName}</p>
          </div>
          <Button
            variant="outline"
            className="w-full hover:bg-red-50 hover:text-red-600 hover:border-red-200"
            onClick={onLogout}
          >
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        {renderPage()}
      </main>
    </div>
  );
}
