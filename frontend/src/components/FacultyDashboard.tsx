// frontend/src/components/FacultyDashboard.tsx
/**
 * Faculty Dashboard — full layout with sidebar + multiple pages.
 *
 * Pages:
 *   analytics  → Analytics charts (bar, line charts from real trend API)
 *   browse     → Browse All Projects (new page)
 *   trends     → Trend Analysis (full TrendsPage component)
 *
 * Sidebar is always visible; matches the student Dashboard design.
 */

import { useState } from "react";
import { Button } from "./ui/button";
import {
  LogOut, FolderOpen, TrendingUp, PlusCircle,
} from "lucide-react";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "./ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "./ui/select";
import {
  BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import TrendsPage            from "./TrendsPage";
import FacultyBrowseProjects from "./FacultyBrowseProjects";
import AddProjectPage        from "./AddProjectPage.tsx";

interface FacultyDashboardProps {
  facultyName: string;
  onLogout:    () => void;
}

type FacultyPage = "analytics" | "browse" | "trends" | "add_project";

// ── Static analytics demo data ─────────────────────────────────────────────
const PALETTE = [
  "#7C3AED","#9333EA","#A855F7","#C084FC","#DDD6FE",
  "#6D28D9","#5B21B6","#8B5CF6","#E879F9","#D946EF",
];

const appBySemesterData = [
  { semester: "1st Sem", Healthcare: 22, Education: 18, Business: 16, Security: 14, Environment: 10 },
  { semester: "2nd Sem", Healthcare: 23, Education: 19, Business: 17, Security: 14, Environment: 11 },
  { semester: "3rd Sem", Healthcare: 25, Education: 20, Business: 18, Security: 15, Environment: 12 },
];

const methodologyTrends = [
  { semester: "1st Sem", "Deep Learning": 45, Traditional: 30, Hybrid: 15 },
  { semester: "2nd Sem", "Deep Learning": 55, Traditional: 25, Hybrid: 20 },
  { semester: "3rd Sem", "Deep Learning": 70, Traditional: 15, Hybrid: 30 },
];

const domainTrends = [
  { semester: "1st Sem", AI: 32, Web: 18, Mobile: 14, Cloud: 10, IoT: 8 },
  { semester: "2nd Sem", AI: 33, Web: 19, Mobile: 15, Cloud: 11, IoT: 9 },
  { semester: "3rd Sem", AI: 35, Web: 20, Mobile: 15, Cloud: 12, IoT: 10 },
];

const rdiaData = [
  { priority: "Economies of the Future",                semester: "1st", count: 24 },
  { priority: "Health & Wellness",                       semester: "1st", count: 18 },
  { priority: "Sustainable Environment",                 semester: "1st", count: 6  },
];

// ── Main component ─────────────────────────────────────────────────────────

export default function FacultyDashboard({ facultyName, onLogout }: FacultyDashboardProps) {
  const [currentPage, setCurrentPage] = useState<FacultyPage>("browse");
  const [selectedSemester,  setSelectedSemester]  = useState("3rd Sem");

  const navItems: { id: FacultyPage; label: string; icon: React.ElementType }[] = [
    { id: "browse",      label: "Browse Projects", icon: FolderOpen   },
    { id: "trends",      label: "Trend Analysis",  icon: TrendingUp   },
    { id: "add_project", label: "Add Project",      icon: PlusCircle   },
  ];

  // ── Page renderer ─────────────────────────────────────────────────────────
  const renderPage = () => {
    switch (currentPage) {
      case "browse":      return <FacultyBrowseProjects />;
      case "trends":      return <TrendsPage />;
      case "add_project": return <AddProjectPage />;
      default:            return <FacultyBrowseProjects />;
    }
  };

  // ── Layout (matches student Dashboard design) ────────────────────────────
  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar - identical styling to Dashboard.tsx */}
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
              <p className="text-xs text-gray-400 -mt-0.5">Graduation Projects Committee Portal</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navItems.map(item => {
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
            <p className="text-sm text-gray-800 truncate font-medium">{facultyName}</p>
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

// ── Chart wrapper ──────────────────────────────────────────────────────────
function Chart({
  title, desc, h = 220, children,
}: {
  title: string; desc: string; h?: number; children: React.ReactNode;
}) {
  return (
    <Card style={{ border: "1px solid rgba(139,92,246,0.1)" }}>
      <CardHeader className="pb-2">
        <CardTitle style={{ fontSize: "0.9rem", color: "#374151" }}>{title}</CardTitle>
        <CardDescription style={{ fontSize: "0.75rem" }}>{desc}</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={h}>
          {children as React.ReactElement}
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
