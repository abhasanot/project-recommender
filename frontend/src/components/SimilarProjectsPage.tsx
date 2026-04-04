// frontend/src/components/SimilarProjectsPage.tsx
import { useState, useEffect } from 'react';
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Progress } from './ui/progress';
import {
  FileText, Loader2, User, Calendar, Target,
  BookOpen, Sparkles, AlertCircle, Lightbulb,
  ChevronDown, ChevronUp,
} from 'lucide-react';
import api from '../services/api';

interface Project {
  rank: number;
  project_id: string;
  title: string;
  abstract: string;
  supervisor_name: string;
  academic_year: string;
  semester: string;
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
}

interface RecommendationsData {
  group_id: string;
  group_profile: {
    selected_interests: string[];
    selected_applications: string[];
    selected_rdia: string[];
  };
  projects: Project[];
}

export default function SimilarProjectsPage() {
  const [data, setData] = useState<RecommendationsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedAbstract, setExpandedAbstract] = useState<string | null>(null);
  const [expandedKeywords, setExpandedKeywords] = useState<string | null>(null);

  useEffect(() => {
    fetchRecommendations();
  }, []);

  const fetchRecommendations = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get('/recommendations');
      setData(response.data);
    } catch (err: any) {
      console.error('Error fetching recommendations:', err);
      setError(err.response?.data?.error || 'Failed to load projects');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center h-64">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-indigo-600 mx-auto mb-3" />
          <p className="text-gray-500">Loading similar projects...</p>
        </div>
      </div>
    );
  }

  if (error && (error.includes('group') || error.includes('finalized') || !data)) {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl text-gray-900 mb-2">Similar Past Projects</h1>
          <p className="text-gray-600">Explore past graduation projects that match your interests</p>
        </div>

        <Card className="border-amber-200 bg-gradient-to-r from-amber-50 to-yellow-50">
          <CardContent className="py-12">
            <div className="text-center">
              <FileText className="w-16 h-16 text-amber-600 mx-auto mb-4" />
              <h3 className="text-xl text-gray-900 mb-2">Group Not Finalized</h3>
              <p className="text-gray-600 max-w-md mx-auto">
                Similar projects will be available once your group is finalized.
                Please complete your group formation in the "My Group" section.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="py-12 text-center">
            <AlertCircle className="w-14 h-14 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Error Loading Projects</h3>
            <p className="text-gray-600">{error}</p>
            <Button onClick={fetchRecommendations} className="mt-4" variant="outline">
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!data || !data.projects || data.projects.length === 0) {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl text-gray-900 mb-2">Similar Past Projects</h1>
          <p className="text-gray-600">Explore past graduation projects that match your interests</p>
        </div>
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="py-12 text-center">
            <FileText className="w-16 h-16 text-amber-600 mx-auto mb-4" />
            <h3 className="text-xl text-gray-900 mb-2">No Projects Found</h3>
            <p className="text-gray-600 max-w-md mx-auto">
              No similar projects match your group's profile. Make sure your group is finalized and try again.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl text-gray-900 mb-2">Similar Past Projects</h1>
        <p className="text-gray-600">
          Found {data.projects.length} projects matching your group's academic profile and interests
        </p>
      </div>

      {/* Group Profile Summary */}
      <Card className="mb-8 border-indigo-200 bg-gradient-to-r from-indigo-50 to-purple-50">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-600" />
            Your Group's Profile
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="font-medium text-gray-600 mb-1.5">Research Interests</p>
              <div className="flex flex-wrap gap-1">
                {data.group_profile.selected_interests.map(i => (
                  <Badge key={i} variant="secondary" className="text-xs">{i}</Badge>
                ))}
              </div>
            </div>
            <div>
              <p className="font-medium text-gray-600 mb-1.5">Application Domains</p>
              <div className="flex flex-wrap gap-1">
                {data.group_profile.selected_applications.map(a => (
                  <Badge key={a} variant="outline" className="text-xs">{a}</Badge>
                ))}
              </div>
            </div>
            <div>
              <p className="font-medium text-gray-600 mb-1.5">RDIA Priority</p>
              <div className="flex flex-wrap gap-1">
                {data.group_profile.selected_rdia.map(r => (
                  <Badge key={r} className="text-xs bg-purple-100 text-purple-700">{r}</Badge>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Projects List */}
      <div className="space-y-6">
        {data.projects.map((project) => {
          const isKeywordsExpanded = expandedKeywords === project.project_id;
          const isAbstractExpanded = expandedAbstract === project.project_id;
          const displayKeywords = isKeywordsExpanded ? project.keywords : project.keywords?.slice(0, 5);
          const hasMoreKeywords = project.keywords && project.keywords.length > 5;
          const abstractText = project.abstract || '';
          const shouldTruncateAbstract = abstractText.length > 250;
          const displayAbstract = isAbstractExpanded || !shouldTruncateAbstract 
            ? abstractText 
            : abstractText.substring(0, 250) + '...';

          return (
            <Card key={project.project_id} className="hover:shadow-lg transition-shadow overflow-hidden">
              {/* Header */}
              <CardHeader className="pb-3 border-b bg-gray-50/50">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
                        <span className="text-white font-bold text-sm">#{project.rank}</span>
                      </div>
                      <CardTitle className="text-xl">{project.title}</CardTitle>
                    </div>
                    <div className="flex flex-wrap gap-4 text-sm text-gray-500 ml-11">
                      <span className="flex items-center gap-1">
                        <User className="w-4 h-4" />
                        {project.supervisor_name || 'Not specified'}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {project.academic_year} {project.semester && `· ${project.semester}`}
                      </span>
                    </div>
                  </div>
                  <div className="text-center min-w-[100px]">
                    <div className="text-3xl font-bold text-indigo-600">
                      {Math.round(project.scores.final_score * 100)}%
                    </div>
                    <p className="text-xs text-gray-500">Match Score</p>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="pt-4 space-y-4">
                {/* Abstract with "more..." */}
                {abstractText && (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 mb-1 flex items-center gap-1">
                      <BookOpen className="w-4 h-4" /> Abstract
                    </h4>
                    <p className="text-sm text-gray-600 leading-relaxed">{displayAbstract}</p>
                    {shouldTruncateAbstract && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setExpandedAbstract(isAbstractExpanded ? null : project.project_id)}
                        className="text-xs text-indigo-600 hover:text-indigo-700 p-0 h-auto mt-1"
                      >
                        {isAbstractExpanded ? 'show less' : 'more...'}
                      </Button>
                    )}
                  </div>
                )}

                {/* Domains */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {project.interest && project.interest.length > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold text-gray-500 mb-1">Domain of Interest</h4>
                      <div className="flex flex-wrap gap-1">
                        {project.interest.map(i => (
                          <Badge key={i} variant="secondary" className="text-xs">{i}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {project.application && project.application.length > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold text-gray-500 mb-1">Domain of Application</h4>
                      <div className="flex flex-wrap gap-1">
                        {project.application.map(a => (
                          <Badge key={a} variant="outline" className="text-xs">{a}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {project.rdia && project.rdia.length > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold text-gray-500 mb-1">National Priority (RDIA)</h4>
                      <div className="flex flex-wrap gap-1">
                        {project.rdia.map(r => (
                          <Badge key={r} className="text-xs bg-amber-100 text-amber-700">{r}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Keywords with "more..." */}
                {project.keywords && project.keywords.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-gray-500 mb-1">Keywords</h4>
                    <div className="flex flex-wrap gap-1 items-center">
                      {displayKeywords.map(k => (
                        <Badge key={k} variant="outline" className="text-xs bg-gray-50">{k}</Badge>
                      ))}
                      {hasMoreKeywords && !isKeywordsExpanded && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setExpandedKeywords(project.project_id)}
                          className="text-xs text-indigo-600 hover:text-indigo-700 p-1 h-auto"
                        >
                          +{project.keywords.length - 5} more...
                        </Button>
                      )}
                      {isKeywordsExpanded && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setExpandedKeywords(null)}
                          className="text-xs text-indigo-600 hover:text-indigo-700 p-1 h-auto flex items-center gap-1"
                        >
                          <ChevronUp className="w-3 h-3" /> show less
                        </Button>
                      )}
                    </div>
                  </div>
                )}

                {/* Match Scores */}
                <div className="bg-gray-50 rounded-lg p-3">
                  <h4 className="text-xs font-semibold text-gray-500 mb-2">Match Breakdown</h4>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <p className="text-xs text-gray-400">Semantic Similarity</p>
                      <Progress value={project.scores.semantic_sim * 100} className="h-1.5 mt-1" />
                      <p className="text-xs text-gray-600 mt-0.5">{Math.round(project.scores.semantic_sim * 100)}%</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">Domain Match</p>
                      <Progress value={project.scores.context_score * 100} className="h-1.5 mt-1" />
                      <p className="text-xs text-gray-600 mt-0.5">{Math.round(project.scores.context_score * 100)}%</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">RDIA Alignment</p>
                      <Progress value={project.scores.rdia_score * 100} className="h-1.5 mt-1" />
                      <p className="text-xs text-gray-600 mt-0.5">{Math.round(project.scores.rdia_score * 100)}%</p>
                    </div>
                  </div>
                  <p className="text-xs text-indigo-600 mt-2 italic">{project.explanation}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
