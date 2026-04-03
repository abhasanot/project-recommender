// frontend/src/components/RecommendationsPage.tsx
import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import {
  Lightbulb, Target, AlertCircle, CheckCircle,
  Mail, BookOpen, Info, Sparkles, Users,
} from 'lucide-react';
import { Button } from './ui/button';
import { Progress } from './ui/progress';
import {
  Dialog, DialogContent, DialogDescription,
  DialogHeader, DialogTitle, DialogTrigger,
} from './ui/dialog';
import api from '../services/api';

// ── Types ────────────────────────────────────────────────────────────────────

interface RecommendationsPageProps {
  groupFinalized: boolean;
  /**
   * FIX (Bug): refreshTrigger was referenced inside the useEffect dependency
   * array but was NOT declared in this interface, causing a TypeScript compile
   * error ("Property 'refreshTrigger' does not exist on type …").
   * Added as an optional prop so callers can pass a counter to force a re-fetch.
   */
  refreshTrigger?: number;
}

interface RecommendationData {
  group_id: string;
  group_profile: {
    selected_interests: string[];
    selected_applications: string[];
    selected_rdia: string[];
  };
  projects: Array<{
    rank: number;
    project_id: string;
    title: string;
    supervisor_name: string;
    academic_year: string;
    keywords: string[];
    application: string[];
    interest: string[];
    rdia: string[];
    scores: {
      final_score: number;
      semantic_sim: number;
      context_score: number;
      rdia_score: number;
    };
    explanation: string;
  }>;
  interests: Array<{
    name: string;
    description: string;
    combined_score: number;
    semantic_score: number;
    already_selected: boolean;
  }>;
  applications: Array<{
    name: string;
    description: string;
    combined_score: number;
    already_selected: boolean;
  }>;
  rdia: Array<{
    label: string;
    description: string;
    combined_score: number;
    already_selected: boolean;
  }>;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function RecommendationsPage({ groupFinalized, refreshTrigger }: RecommendationsPageProps) {
  const [recommendations, setRecommendations] = useState<RecommendationData | null>(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);

  useEffect(() => {
    if (groupFinalized) {
      fetchRecommendations();
    } else {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupFinalized, refreshTrigger]);

  const fetchRecommendations = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get('/recommendations');
      setRecommendations(response.data);
    } catch (err: any) {
      console.error('Error fetching recommendations:', err);
      setError(err.response?.data?.error || 'Failed to load recommendations');
    } finally {
      setLoading(false);
    }
  };

  // ── Not finalized ──────────────────────────────────────────────────────────

  if (!groupFinalized) {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl text-gray-900 mb-2">Recommendations</h1>
          <p className="text-gray-600">Personalized recommendations for your group</p>
        </div>
        <Card className="border-amber-200 bg-gradient-to-r from-amber-50 to-yellow-50">
          <CardContent className="py-12">
            <div className="text-center">
              <AlertCircle className="w-16 h-16 text-amber-600 mx-auto mb-4" />
              <h3 className="text-xl text-gray-900 mb-2">Group Not Finalized</h3>
              <p className="text-gray-600 max-w-md mx-auto">
                Recommendations will be available once your group is fully finalized.
                Please complete your group formation in the &quot;My Group&quot; section.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Loading ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="p-8 max-w-7xl mx-auto">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto" />
          <p className="mt-4 text-gray-600">Loading recommendations…</p>
        </div>
      </div>
    );
  }

  // ── Error ──────────────────────────────────────────────────────────────────

  if (error) {
    return (
      <div className="p-8 max-w-7xl mx-auto">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="py-12">
            <div className="text-center">
              <AlertCircle className="w-16 h-16 text-red-600 mx-auto mb-4" />
              <h3 className="text-xl text-gray-900 mb-2">Error Loading Recommendations</h3>
              <p className="text-gray-600">{error}</p>
              <Button onClick={fetchRecommendations} className="mt-4">Try Again</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Empty ──────────────────────────────────────────────────────────────────

  if (!recommendations) {
    return (
      <div className="p-8 max-w-7xl mx-auto">
        <Card>
          <CardContent className="py-12 text-center">
            <AlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl text-gray-900 mb-2">No Recommendations Yet</h3>
            <p className="text-gray-600">
              Recommendations will appear here once your group is finalized.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Results ────────────────────────────────────────────────────────────────

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl text-gray-900 mb-2">Group Recommendations</h1>
        <p className="text-gray-600">
          Personalized recommendations based on your group's academic profile
        </p>
      </div>

      {/* Group Profile Summary */}
      <Card className="mb-8 border-indigo-200 bg-gradient-to-r from-indigo-50 to-purple-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-600" />
            Group Profile
          </CardTitle>
          <CardDescription>Combined interests and priorities of your group</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">Interests</p>
              <div className="flex flex-wrap gap-1">
                {recommendations.group_profile.selected_interests.map((i) => (
                  <Badge key={i} variant="secondary" className="text-xs">{i}</Badge>
                ))}
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">Applications</p>
              <div className="flex flex-wrap gap-1">
                {recommendations.group_profile.selected_applications.map((a) => (
                  <Badge key={a} variant="outline" className="text-xs">{a}</Badge>
                ))}
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">RDIA Priority</p>
              <div className="flex flex-wrap gap-1">
                {recommendations.group_profile.selected_rdia.map((r) => (
                  <Badge key={r} className="text-xs bg-purple-100 text-purple-700">{r}</Badge>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recommended Projects */}
      <div className="mb-8">
        <h2 className="text-2xl text-gray-900 mb-4 flex items-center gap-2">
          <BookOpen className="w-6 h-6 text-indigo-600" />
          Recommended Past Projects
        </h2>
        <div className="space-y-4">
          {recommendations.projects.map((project) => (
            <Card key={project.project_id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-700 font-bold text-sm">
                      #{project.rank}
                    </div>
                    <div>
                      <CardTitle className="text-lg">{project.title}</CardTitle>
                      <CardDescription>
                        {project.supervisor_name} · {project.academic_year}
                      </CardDescription>
                    </div>
                  </div>
                  <Badge className="bg-green-100 text-green-700 border-green-200">
                    Score: {(project.scores.final_score * 100).toFixed(0)}%
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Semantic Match</p>
                    <Progress value={project.scores.semantic_sim * 100} className="h-2" />
                    <p className="text-xs text-gray-600 mt-1">
                      {(project.scores.semantic_sim * 100).toFixed(0)}%
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Domain Alignment</p>
                    <Progress value={project.scores.context_score * 100} className="h-2" />
                    <p className="text-xs text-gray-600 mt-1">
                      {(project.scores.context_score * 100).toFixed(0)}%
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">RDIA Alignment</p>
                    <Progress value={project.scores.rdia_score * 100} className="h-2" />
                    <p className="text-xs text-gray-600 mt-1">
                      {(project.scores.rdia_score * 100).toFixed(0)}%
                    </p>
                  </div>
                </div>

                <p className="text-sm text-gray-600 mb-3 italic">{project.explanation}</p>

                <div className="flex flex-wrap gap-1">
                  {project.keywords.slice(0, 5).map((kw) => (
                    <Badge key={kw} variant="outline" className="text-xs">{kw}</Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Recommended Interests */}
      <div className="mb-8">
        <h2 className="text-2xl text-gray-900 mb-4 flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-purple-600" />
          Recommended Research Interests
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {recommendations.interests.map((interest) => (
            <Card
              key={interest.name}
              className={`${interest.already_selected ? 'border-green-300 bg-green-50' : ''}`}
            >
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{interest.name}</CardTitle>
                  {interest.already_selected && (
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Progress value={interest.combined_score * 100} className="h-1.5 flex-1" />
                  <span className="text-xs text-gray-500">
                    {(interest.combined_score * 100).toFixed(0)}%
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-gray-600">{interest.description}</p>
                {interest.already_selected && (
                  <Badge className="mt-2 text-xs bg-green-100 text-green-700">
                    Already selected
                  </Badge>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Recommended Applications */}
      <div className="mb-8">
        <h2 className="text-2xl text-gray-900 mb-4 flex items-center gap-2">
          <Target className="w-6 h-6 text-blue-600" />
          Recommended Application Domains
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {recommendations.applications.map((app) => (
            <Card
              key={app.name}
              className={`${app.already_selected ? 'border-blue-300 bg-blue-50' : ''}`}
            >
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{app.name}</CardTitle>
                  {app.already_selected && (
                    <CheckCircle className="w-4 h-4 text-blue-600" />
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Progress value={app.combined_score * 100} className="h-1.5 flex-1" />
                  <span className="text-xs text-gray-500">
                    {(app.combined_score * 100).toFixed(0)}%
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-gray-600">{app.description}</p>
                {app.already_selected && (
                  <Badge className="mt-2 text-xs bg-blue-100 text-blue-700">
                    Already selected
                  </Badge>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* RDIA Priorities */}
      <div className="mb-8">
        <h2 className="text-2xl text-gray-900 mb-4 flex items-center gap-2">
          <Lightbulb className="w-6 h-6 text-amber-600" />
          RDIA Priority Alignment
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {recommendations.rdia.map((r, idx) => (
            <Card
              key={r.label}
              className={`${r.already_selected ? 'border-amber-300 bg-amber-50' : ''}`}
            >
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-400 font-bold">#{idx + 1}</span>
                    <CardTitle className="text-base">{r.label}</CardTitle>
                  </div>
                  {r.already_selected && (
                    <CheckCircle className="w-4 h-4 text-amber-600" />
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Progress value={r.combined_score * 100} className="h-1.5 flex-1" />
                  <span className="text-xs text-gray-500">
                    {(r.combined_score * 100).toFixed(0)}%
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-gray-600">{r.description}</p>
                {r.already_selected && (
                  <Badge className="mt-2 text-xs bg-amber-100 text-amber-700">
                    Your selection
                  </Badge>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
