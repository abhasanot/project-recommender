import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { User, Users, FileText, Lightbulb, TrendingUp, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import api from '../services/api';

interface DashboardHomeProps {
  onNavigate: (page: 'home' | 'profile' | 'group' | 'projects' | 'trends' | 'settings') => void;
  studentName: string;
  groupFinalized: boolean;
}

export default function DashboardHome({ onNavigate, studentName, groupFinalized }: DashboardHomeProps) {
  const [profileCompletion, setProfileCompletion] = useState(0);
  const [loading, setLoading] = useState(true);
  const [recommendations, setRecommendations] = useState<any>(null);

  useEffect(() => {
    loadProfileCompletion();
    if (groupFinalized) {
      loadRecommendations();
    }
  }, [groupFinalized]);

  const loadProfileCompletion = async () => {
    try {
      const response = await api.get('/profile/completion');
      setProfileCompletion(response.data.completion);
    } catch (error) {
      console.error('Error loading profile completion:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadRecommendations = async () => {
    try {
      const response = await api.get('/recommendations');
      setRecommendations(response.data);
    } catch (error) {
      console.error('Error loading recommendations:', error);
    }
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl text-gray-900 mb-2">Welcome back, {studentName}!</h1>
        <p className="text-gray-600">
          Here's an overview of your academic journey
        </p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card className="border-l-4 border-l-indigo-500">
          <CardHeader className="pb-3">
            <CardDescription className="flex items-center gap-2">
              <User className="w-4 h-4 text-indigo-600" />
              Profile Completion
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="text-3xl text-indigo-600">{Math.round(profileCompletion)}%</p>
              <Progress value={profileCompletion} className="h-2" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardHeader className="pb-3">
            <CardDescription className="flex items-center gap-2">
              <Users className="w-4 h-4 text-purple-600" />
              Group Status
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl text-purple-600">{groupFinalized ? 'Finalized' : 'Not Formed'}</p>
            <p className="text-sm text-gray-500 mt-1">{groupFinalized ? 'Recommendations available' : 'Create or join a group'}</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="pb-3">
            <CardDescription className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-600" />
              Matched Projects
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl text-blue-600">{recommendations?.projects?.length || 0}</p>
            <p className="text-sm text-gray-500 mt-1">Similar to your profile</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <Card className="cursor-pointer hover:shadow-lg transition-all border-indigo-100 hover:border-indigo-300" onClick={() => onNavigate('profile')}>
          <CardHeader>
            <div className="w-12 h-12 bg-gradient-to-br from-indigo-100 to-indigo-200 rounded-xl flex items-center justify-center mb-3">
              <User className="w-6 h-6 text-indigo-700" />
            </div>
            <CardTitle>Complete Your Profile</CardTitle>
            <CardDescription>
              Add your courses, grades, and interests to get better recommendations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="ghost" className="w-full text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50">
              Go to Profile →
            </Button>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-lg transition-all border-purple-100 hover:border-purple-300" onClick={() => onNavigate('group')}>
          <CardHeader>
            <div className="w-12 h-12 bg-gradient-to-br from-purple-100 to-purple-200 rounded-xl flex items-center justify-center mb-3">
              <Users className="w-6 h-6 text-purple-700" />
            </div>
            <CardTitle>Form Your Group</CardTitle>
            <CardDescription>
              Create or join a project group to collaborate with peers
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="ghost" className="w-full text-purple-600 hover:text-purple-700 hover:bg-purple-50">
              Go to Group →
            </Button>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-lg transition-all border-blue-100 hover:border-blue-300" onClick={() => onNavigate('projects')}>
          <CardHeader>
            <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-blue-200 rounded-xl flex items-center justify-center mb-3">
              <FileText className="w-6 h-6 text-blue-700" />
            </div>
            <CardTitle>View Project Details</CardTitle>
            <CardDescription>
              Explore detailed information about past projects that match your interests
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="ghost" className="w-full text-blue-600 hover:text-blue-700 hover:bg-blue-50">
              View Details →
            </Button>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-lg transition-all border-green-100 hover:border-green-300" onClick={() => onNavigate('trends')}>
          <CardHeader>
            <div className="w-12 h-12 bg-gradient-to-br from-green-100 to-green-200 rounded-xl flex items-center justify-center mb-3">
              <TrendingUp className="w-6 h-6 text-green-700" />
            </div>
            <CardTitle>Discover Trends</CardTitle>
            <CardDescription>
              Explore emerging topics and trends in Computer Science
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="ghost" className="w-full text-green-600 hover:text-green-700 hover:bg-green-50">
              View Trends →
            </Button>
          </CardContent>
        </Card>

        <Card className="border-amber-100">
          <CardHeader>
            <div className="w-12 h-12 bg-gradient-to-br from-amber-100 to-amber-200 rounded-xl flex items-center justify-center mb-3">
              <CheckCircle className="w-6 h-6 text-amber-700" />
            </div>
            <CardTitle>Next Steps</CardTitle>
            <CardDescription>
              Complete these tasks to maximize your experience
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2 text-gray-600">
                {profileCompletion < 100 ? (
                  <Clock className="w-4 h-4 text-amber-600" />
                ) : (
                  <CheckCircle className="w-4 h-4 text-green-600" />
                )}
                Complete your profile {profileCompletion > 0 && `(${Math.round(profileCompletion)}%)`}
              </li>
              <li className="flex items-center gap-2 text-gray-600">
                {groupFinalized ? (
                  <CheckCircle className="w-4 h-4 text-green-600" />
                ) : (
                  <Clock className="w-4 h-4 text-amber-600" />
                )}
                Form your project group
              </li>
              <li className="flex items-center gap-2 text-gray-600">
                {recommendations?.projects?.length > 0 ? (
                  <CheckCircle className="w-4 h-4 text-green-600" />
                ) : (
                  <Clock className="w-4 h-4 text-amber-600" />
                )}
                Browse project details
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Latest Recommendations - Only show if group is finalized */}
      {groupFinalized && recommendations && recommendations.projects && recommendations.projects.length > 0 && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Latest Recommendations</CardTitle>
            <CardDescription>Personalized suggestions based on your profile</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recommendations.projects.slice(0, 3).map((project: any, index: number) => (
                <div key={index} className="flex items-start gap-4 p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg border border-indigo-100">
                  <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center flex-shrink-0">
                    <FileText className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-sm text-gray-900 mb-1">{project.title}</h4>
                    <p className="text-xs text-gray-600 mb-2">
                      {project.interest?.slice(0, 2).join(', ')} • Supervisor: {project.supervisor_name}
                    </p>
                    <Badge variant="secondary" className="text-xs">
                      {Math.round(project.scores.final_score * 100)}% Match
                    </Badge>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => onNavigate('projects')}>
                    View Details
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}