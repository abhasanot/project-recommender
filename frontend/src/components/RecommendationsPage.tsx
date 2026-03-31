import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Lightbulb, Target, AlertCircle, CheckCircle, Mail, BookOpen, Info, Sparkles, Users } from 'lucide-react';
import { Button } from './ui/button';
import { Progress } from './ui/progress';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import api from '../services/api';

interface RecommendationsPageProps {
  groupFinalized: boolean;
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

export default function RecommendationsPage({ groupFinalized }: RecommendationsPageProps) {
  const [recommendations, setRecommendations] = useState<RecommendationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (groupFinalized) {
      fetchRecommendations();
    }
  }, [groupFinalized, refreshTrigger]);

  const fetchRecommendations = async () => {
    try {
      setLoading(true);
      const response = await api.get('/recommendations');
      setRecommendations(response.data);
      setError(null);
    } catch (err: any) {
      console.error('Error fetching recommendations:', err);
      setError(err.response?.data?.error || 'Failed to load recommendations');
    } finally {
      setLoading(false);
    }
  };

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
                Please complete your group formation in the "My Group" section.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-8 max-w-7xl mx-auto">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading recommendations...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 max-w-7xl mx-auto">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="py-12">
            <div className="text-center">
              <AlertCircle className="w-16 h-16 text-red-600 mx-auto mb-4" />
              <h3 className="text-xl text-gray-900 mb-2">Error Loading Recommendations</h3>
              <p className="text-gray-600">{error}</p>
              <Button onClick={fetchRecommendations} className="mt-4">
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

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

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl text-gray-900 mb-2">Recommendations</h1>
        <p className="text-gray-600">
          Personalized recommendations based on your group's profile and interests
        </p>
      </div>

      {/* Success Banner */}
      <Card className="mb-6 border-green-200 bg-gradient-to-r from-green-50 to-emerald-50">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <CheckCircle className="w-6 h-6 text-green-600 mt-1 flex-shrink-0" />
            <div>
              <p className="text-green-900">
                Your group recommendations have been generated based on collective academic performance and interests.
              </p>
              <p className="text-sm text-green-700 mt-1">
                Group Members: {recommendations.group_profile.selected_interests.length} interests,{' '}
                {recommendations.group_profile.selected_applications.length} application domains,{' '}
                {recommendations.group_profile.selected_rdia.length} RDIA priority selected.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-6">
        {/* 1. Recommended Domains of Interest */}
        <Card className="border-l-4 border-l-indigo-500">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="w-6 h-6 text-indigo-600" />
              Recommended Domains of Interest
            </CardTitle>
            <CardDescription>
              Based on collective course outcomes + technical skills of all members
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {recommendations.interests.map((interest, idx) => (
                <div key={idx} className={`p-4 rounded-lg border hover:shadow-md transition-shadow ${
                  interest.already_selected 
                    ? 'bg-green-50 border-green-200' 
                    : 'bg-gradient-to-br from-indigo-50 to-purple-50 border-indigo-100'
                }`}>
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="text-sm text-gray-900">{interest.name}</h4>
                    <Badge variant={interest.already_selected ? "default" : "secondary"} className="text-xs">
                      {Math.round(interest.combined_score * 100)}% Match
                    </Badge>
                  </div>
                  <p className="text-xs text-gray-600 line-clamp-2">{interest.description}</p>
                  {interest.already_selected && (
                    <Badge variant="outline" className="mt-2 text-xs text-green-600 border-green-300">
                      Already Selected
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* 2. Recommended Domains of Application */}
        <Card className="border-l-4 border-l-purple-500">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-6 h-6 text-purple-600" />
              Recommended Domains of Application
            </CardTitle>
            <CardDescription>
              Based on student input + past successful project patterns
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
              {recommendations.applications.map((app, idx) => (
                <div key={idx} className={`p-3 rounded-lg border text-center hover:shadow-md transition-shadow ${
                  app.already_selected 
                    ? 'bg-green-50 border-green-200' 
                    : 'bg-gradient-to-br from-purple-50 to-pink-50 border-purple-100'
                }`}>
                  <p className="text-sm text-gray-900">{app.name}</p>
                  <p className="text-xs text-gray-500 mt-1">{Math.round(app.combined_score * 100)}% match</p>
                  {app.already_selected && (
                    <Badge variant="outline" className="mt-2 text-xs text-green-600 border-green-300">
                      Selected
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* 3. Project Recommendations */}
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="w-6 h-6 text-blue-600" />
              Recommended Projects
            </CardTitle>
            <CardDescription>
              Past projects that match your group's profile
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recommendations.projects.map((project) => (
                <div key={project.project_id} className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-100 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="secondary" className="text-xs">
                          #{project.rank}
                        </Badge>
                        <h4 className="text-lg text-gray-900">{project.title}</h4>
                      </div>
                      <p className="text-sm text-gray-600">Supervisor: {project.supervisor_name} ({project.academic_year})</p>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl text-blue-600 mb-1">{Math.round(project.scores.final_score * 100)}%</div>
                      <p className="text-xs text-gray-500">Match Score</p>
                    </div>
                  </div>

                  <Progress value={project.scores.final_score * 100} className="h-2 mb-3" />

                  <div className="flex flex-wrap gap-1 mb-3">
                    {project.interest.slice(0, 3).map((interest, idx) => (
                      <Badge key={idx} variant="outline" className="text-xs">
                        {interest}
                      </Badge>
                    ))}
                  </div>

                  <p className="text-sm text-gray-700 mb-3 line-clamp-2">{project.explanation}</p>

                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm">
                        <Info className="w-4 h-4 mr-2" />
                        Details
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>{project.title}</DialogTitle>
                        <DialogDescription>
                          Supervisor: {project.supervisor_name} • {project.academic_year}
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <h4 className="text-sm font-medium mb-2">Match Breakdown</h4>
                          <div className="space-y-2">
                            <div>
                              <div className="flex justify-between text-sm">
                                <span>Semantic Similarity</span>
                                <span>{Math.round(project.scores.semantic_sim * 100)}%</span>
                              </div>
                              <Progress value={project.scores.semantic_sim * 100} className="h-1.5" />
                            </div>
                            <div>
                              <div className="flex justify-between text-sm">
                                <span>Application Context</span>
                                <span>{Math.round(project.scores.context_score * 100)}%</span>
                              </div>
                              <Progress value={project.scores.context_score * 100} className="h-1.5" />
                            </div>
                            <div>
                              <div className="flex justify-between text-sm">
                                <span>RDIA Alignment</span>
                                <span>{Math.round(project.scores.rdia_score * 100)}%</span>
                              </div>
                              <Progress value={project.scores.rdia_score * 100} className="h-1.5" />
                            </div>
                          </div>
                        </div>

                        <div>
                          <h4 className="text-sm font-medium mb-2">Keywords</h4>
                          <div className="flex flex-wrap gap-1">
                            {project.keywords.map((keyword, idx) => (
                              <Badge key={idx} variant="secondary" className="text-xs">
                                {keyword}
                              </Badge>
                            ))}
                          </div>
                        </div>

                        <div>
                          <h4 className="text-sm font-medium mb-2">Domains</h4>
                          <div className="flex flex-wrap gap-1">
                            {project.interest.map((interest, idx) => (
                              <Badge key={idx} variant="outline" className="text-xs">
                                {interest}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Summary Card */}
        <Card className="bg-gradient-to-r from-indigo-50 via-purple-50 to-pink-50 border-indigo-200">
          <CardHeader>
            <CardTitle>Next Steps</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-gray-700">
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                <span>Review the recommended domains of interest and discuss with your group</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                <span>Contact supervisors whose research interests align with your group</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                <span>Explore similar past projects for inspiration</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                <span>Schedule meetings with potential supervisors</span>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}