// frontend/src/components/RecommendationsPage.tsx
import { useEffect, useState } from 'react';
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from './ui/card';
import { Badge }    from './ui/badge';
import { Button }   from './ui/button';
import { Progress } from './ui/progress';
import {
  Lightbulb, Target, AlertCircle, CheckCircle,
  BookOpen, Sparkles, Users, Loader2, Lock, Scale,
} from 'lucide-react';
import api from '../services/api';

// ── Types ─────────────────────────────────────────────────────────────────────

interface RecommendationsPageProps {
  groupFinalized:   boolean;
  refreshTrigger?:  number;
}

interface RecommendationData {
  group_id:      string;
  group_profile: {
    selected_interests:    string[];
    selected_applications: string[];
    selected_rdia:         string[];
  };
  projects: Array<{
    rank:            number;
    project_id:      string;
    title:           string;
    supervisor_name: string;
    academic_year:   string;
    keywords:        string[];
    application:     string[];
    interest:        string[];
    rdia:            string[];
    scores: {
      final_score:   number;
      semantic_sim:  number;
      context_score: number;
      rdia_score:    number;
    };
    explanation: string;
  }>;
  interests:    Array<{ name: string; description: string; combined_score: number; semantic_score: number; already_selected: boolean }>;
  applications: Array<{ name: string; description: string; combined_score: number; already_selected: boolean }>;
  rdia:         Array<{ label: string; description: string; combined_score: number; already_selected: boolean }>;
}

interface BlockedState {
  condition:          string;
  message:            string;
  incomplete_members?: string[];
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function RecommendationsPage({ groupFinalized, refreshTrigger }: RecommendationsPageProps) {
  const [data,    setData]    = useState<RecommendationData | null>(null);
  const [blocked, setBlocked] = useState<BlockedState | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (groupFinalized) {
      fetch_();
    } else {
      setLoading(false);
      setBlocked({ condition: 'not_finalized', message: 'Group not finalized yet' });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupFinalized, refreshTrigger]);

  const fetch_ = async () => {
    setLoading(true);
    setBlocked(null);
    try {
      const res = await api.get('/recommendations');
      setData(res.data);
    } catch (err: any) {
      const d = err.response?.data;
      setBlocked({
        condition:          d?.condition ?? 'error',
        message:            d?.error     ?? 'Failed to load recommendations',
        incomplete_members: d?.incomplete_members,
      });
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  // ── Blocked screens ───────────────────────────────────────────────────────

  if (!groupFinalized) {
    return <BlockScreen
      icon={<Lock className="w-14 h-14 text-amber-500" />}
      title="Group Not Finalized"
      color="amber"
      message="Recommendations are generated when the leader finalizes the group. Please complete your profile and wait for the leader to finalize."
    />;
  }

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center h-64">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-indigo-600 mx-auto mb-3" />
          <p className="text-gray-500">Loading recommendations…</p>
        </div>
      </div>
    );
  }

  if (blocked) {
    if (blocked.condition === 'incomplete_profiles') {
      return <BlockScreen
        icon={<AlertCircle className="w-14 h-14 text-amber-500" />}
        title="Incomplete Profiles"
        color="amber"
        message={`Recommendations cannot be shown because some members have not completed their profiles.`}
        detail={blocked.incomplete_members?.length
          ? `Incomplete: ${blocked.incomplete_members.join(', ')}`
          : undefined}
      />;
    }
    if (blocked.condition === 'no_weights') {
      return <BlockScreen
        icon={<Scale className="w-14 h-14 text-indigo-500" />}
        title="Weighting Mode Not Set"
        color="indigo"
        message="The group leader must save a weighting preference before recommendations can be generated. Go to the My Group page to set it."
      />;
    }
    return <BlockScreen
      icon={<AlertCircle className="w-14 h-14 text-red-400" />}
      title="Cannot Load Recommendations"
      color="red"
      message={blocked.message}
      retry={fetch_}
    />;
  }

  if (!data) {
    return <BlockScreen
      icon={<AlertCircle className="w-14 h-14 text-gray-400" />}
      title="No Recommendations Yet"
      color="gray"
      message="Recommendations will appear here after your group is finalized."
    />;
  }

  // ── Results ───────────────────────────────────────────────────────────────

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl text-gray-900 mb-1">Group Recommendations</h1>
        <p className="text-gray-500 text-sm">
          Personalised recommendations generated from your group's academic profile
        </p>
      </div>

      {/* Group Profile Summary */}
      <Card className="mb-8 border-indigo-200 bg-gradient-to-r from-indigo-50 to-purple-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Users className="w-5 h-5 text-indigo-600" /> Group Profile Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="font-medium text-gray-600 mb-1.5">Research Interests</p>
              <div className="flex flex-wrap gap-1">
                {data.group_profile.selected_interests.map(i =>
                  <Badge key={i} variant="secondary" className="text-xs">{i}</Badge>)}
              </div>
            </div>
            <div>
              <p className="font-medium text-gray-600 mb-1.5">Application Domains</p>
              <div className="flex flex-wrap gap-1">
                {data.group_profile.selected_applications.map(a =>
                  <Badge key={a} variant="outline" className="text-xs">{a}</Badge>)}
              </div>
            </div>
            <div>
              <p className="font-medium text-gray-600 mb-1.5">RDIA Priority</p>
              <div className="flex flex-wrap gap-1">
                {data.group_profile.selected_rdia.map(r =>
                  <Badge key={r} className="text-xs bg-purple-100 text-purple-700">{r}</Badge>)}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recommended Projects */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-indigo-600" /> Recommended Past Projects
        </h2>
        <div className="space-y-4">
          {data.projects.map(p => (
            <Card key={p.project_id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-700 font-bold text-sm flex-shrink-0 mt-0.5">
                      #{p.rank}
                    </div>
                    <div>
                      <CardTitle className="text-base">{p.title}</CardTitle>
                      <CardDescription>{p.supervisor_name} · {p.academic_year}</CardDescription>
                    </div>
                  </div>
                  <Badge className="bg-green-100 text-green-700 border-green-200 flex-shrink-0">
                    {(p.scores.final_score * 100).toFixed(0)}% Match
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-3 mb-3">
                  {([
                    ['Semantic',   p.scores.semantic_sim],
                    ['Domain',     p.scores.context_score],
                    ['RDIA',       p.scores.rdia_score],
                  ] as [string, number][]).map(([lbl, val]) => (
                    <div key={lbl}>
                      <p className="text-xs text-gray-400 mb-1">{lbl} match</p>
                      <Progress value={val * 100} className="h-1.5" />
                      <p className="text-xs text-gray-600 mt-0.5">{(val * 100).toFixed(0)}%</p>
                    </div>
                  ))}
                </div>
                <p className="text-sm text-gray-500 italic mb-2">{p.explanation}</p>
                <div className="flex flex-wrap gap-1">
                  {p.keywords.slice(0, 6).map(k =>
                    <Badge key={k} variant="outline" className="text-xs">{k}</Badge>)}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Interests */}
      <RecommendSection title="Recommended Research Interests" icon={<Sparkles className="w-5 h-5 text-purple-600" />}>
        {data.interests.map(item => (
          <DomainCard key={item.name} name={item.name} desc={item.description}
            score={item.combined_score} selected={item.already_selected}
            colorSel="indigo" selectedLabel="Already selected" />
        ))}
      </RecommendSection>

      {/* Applications */}
      <RecommendSection title="Recommended Application Domains" icon={<Target className="w-5 h-5 text-blue-600" />}>
        {data.applications.map(item => (
          <DomainCard key={item.name} name={item.name} desc={item.description}
            score={item.combined_score} selected={item.already_selected}
            colorSel="blue" selectedLabel="Already selected" />
        ))}
      </RecommendSection>

      {/* RDIA */}
      <RecommendSection title="RDIA Priority Alignment" icon={<Lightbulb className="w-5 h-5 text-amber-600" />} cols={2}>
        {data.rdia.map((item, idx) => (
          <DomainCard key={item.label} name={`#${idx + 1} ${item.label}`} desc={item.description}
            score={item.combined_score} selected={item.already_selected}
            colorSel="amber" selectedLabel="Your selection" />
        ))}
      </RecommendSection>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function BlockScreen({ icon, title, color, message, detail, retry }: {
  icon: React.ReactNode; title: string; color: string;
  message: string; detail?: string; retry?: () => void;
}) {
  const colors: Record<string, string> = {
    amber: 'border-amber-200 bg-amber-50',
    indigo: 'border-indigo-200 bg-indigo-50',
    red:   'border-red-200 bg-red-50',
    gray:  'border-gray-200 bg-gray-50',
  };
  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-3xl text-gray-900 mb-6">Recommendations</h1>
      <Card className={colors[color] ?? colors.gray}>
        <CardContent className="py-12 text-center">
          <div className="flex justify-center mb-4">{icon}</div>
          <h3 className="text-lg font-semibold text-gray-800 mb-2">{title}</h3>
          <p className="text-gray-500 text-sm max-w-md mx-auto">{message}</p>
          {detail && <p className="text-gray-600 text-sm mt-2 font-medium">{detail}</p>}
          {retry && (
            <Button onClick={retry} className="mt-5" variant="outline">Try Again</Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function RecommendSection({ title, icon, cols = 3, children }: {
  title: string; icon: React.ReactNode; cols?: number; children: React.ReactNode;
}) {
  return (
    <section className="mb-10">
      <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
        {icon} {title}
      </h2>
      <div className={`grid grid-cols-1 ${cols === 2 ? 'md:grid-cols-2' : 'md:grid-cols-3'} gap-4`}>
        {children}
      </div>
    </section>
  );
}

function DomainCard({ name, desc, score, selected, colorSel, selectedLabel }: {
  name: string; desc: string; score: number; selected: boolean;
  colorSel: string; selectedLabel: string;
}) {
  const colors: Record<string, string> = {
    indigo: 'border-indigo-300 bg-indigo-50',
    blue:   'border-blue-300 bg-blue-50',
    amber:  'border-amber-300 bg-amber-50',
  };
  const badges: Record<string, string> = {
    indigo: 'bg-indigo-100 text-indigo-700',
    blue:   'bg-blue-100 text-blue-700',
    amber:  'bg-amber-100 text-amber-700',
  };
  return (
    <Card className={selected ? colors[colorSel] : ''}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold">{name}</CardTitle>
          {selected && <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />}
        </div>
        <div className="flex items-center gap-2">
          <Progress value={score * 100} className="h-1.5 flex-1" />
          <span className="text-xs text-gray-400">{(score * 100).toFixed(0)}%</span>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-xs text-gray-500 leading-relaxed">{desc}</p>
        {selected && (
          <Badge className={`mt-2 text-xs ${badges[colorSel]}`}>{selectedLabel}</Badge>
        )}
      </CardContent>
    </Card>
  );
}
