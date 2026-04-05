import { useState } from 'react';
import { Button } from './ui/button';
import { LogOut, BarChart3, Users, TrendingUp, Target, Download, FileImage, FileText, Info } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Tooltip as UITooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface FacultyDashboardProps {
  facultyName: string;
  onLogout: () => void;
}

// Demo data - will be replaced with real API later
const applicationBySemesterData = [
  { semester: '1st Semester', Healthcare: 22, Education: 18, Business: 16, Security: 14, Environment: 10, Other: 8 },
  { semester: '2nd Semester', Healthcare: 23, Education: 19, Business: 17, Security: 14, Environment: 11, Other: 9 },
  { semester: '3rd Semester', Healthcare: 25, Education: 20, Business: 18, Security: 15, Environment: 12, Other: 10 },
];

const methodologyTrendsData = [
  { semester: '1st Semester', deepLearning: 45, traditional: 30, hybrid: 15 },
  { semester: '2nd Semester', deepLearning: 55, traditional: 25, hybrid: 20 },
  { semester: '3rd Semester', deepLearning: 70, traditional: 15, hybrid: 30 },
];

const domainBySemesterData = [
  { semester: '1st Semester', AI: 32, Web: 18, Mobile: 14, Cloud: 10, IoT: 8 },
  { semester: '2nd Semester', AI: 33, Web: 19, Mobile: 15, Cloud: 11, IoT: 9 },
  { semester: '3rd Semester', AI: 35, Web: 20, Mobile: 15, Cloud: 12, IoT: 10 },
];

const rdiaPriorityMatrix = [
  { priority: 'Health & Wellness', Sem1: 82, Sem2: 83, Sem3: 85 },
  { priority: 'Sustainable Environment', Sem1: 65, Sem2: 67, Sem3: 70 },
  { priority: 'Energy Security', Sem1: 55, Sem2: 57, Sem3: 60 },
  { priority: 'Economies of the Future', Sem1: 70, Sem2: 72, Sem3: 75 },
];

const domainOfInterestData = [
  { name: 'AI/ML', value: 35 },
  { name: 'Web Dev', value: 20 },
  { name: 'Mobile', value: 15 },
  { name: 'Cloud', value: 12 },
  { name: 'IoT', value: 10 },
];

export default function FacultyDashboard({ facultyName, onLogout }: FacultyDashboardProps) {
  const [selectedSemester, setSelectedSemester] = useState('3rd Semester');

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col shadow-sm">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            {/* Logo */}
            <div className="w-12 h-12 rounded-xl flex items-center justify-center overflow-hidden">
              <img 
                src="/logo.png" 
                alt="Mu'een Logo" 
                className="w-10 h-10 object-contain"
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
            <div>
              <h1 className="text-xl bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                Mu'een
              </h1>
              <p className="text-xs text-gray-500">Faculty Dashboard</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          <button className="w-full flex items-center gap-3 px-4 py-3 rounded-lg bg-gradient-to-r from-indigo-50 to-purple-50 text-indigo-700 shadow-sm">
            <BarChart3 className="w-5 h-5" />
            <span>Analytics Dashboard</span>
          </button>
        </nav>

        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <div className="mb-3 px-4 py-2 bg-white rounded-lg border border-gray-200">
            <p className="text-xs text-gray-500">Logged in as</p>
            <p className="text-sm text-gray-900 truncate">{facultyName}</p>
            <p className="text-xs text-indigo-600">Faculty Member</p>
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
        <div className="border-b border-gray-200 bg-white shadow-sm sticky top-0 z-10">
          <div className="px-8 py-4 flex items-center justify-between">
            <div>
              <h2 className="text-xl text-gray-900">Faculty Analytics Dashboard (UR-F7)</h2>
              <p className="text-sm text-gray-600">Aggregated insights across all graduation projects</p>
            </div>
            <div className="flex items-center gap-3">
              <Select value={selectedSemester} onValueChange={setSelectedSemester}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Semester" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="3rd Semester">3rd Semester</SelectItem>
                  <SelectItem value="2nd Semester">2nd Semester</SelectItem>
                  <SelectItem value="1st Semester">1st Semester</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="p-8">
          {/* Privacy Notice */}
          <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-sm text-blue-900">
              <strong>Note:</strong> All statistics are computed from completed projects only.
            </p>
          </div>

          {/* Charts Row 1 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <Card>
              <CardHeader>
                <CardTitle>Application Distribution by Semester</CardTitle>
                <CardDescription>Trends in domain preferences over time</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={applicationBySemesterData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="semester" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="Healthcare" fill="#6366f1" />
                    <Bar dataKey="Education" fill="#8b5cf6" />
                    <Bar dataKey="Business" fill="#ec4899" />
                    <Bar dataKey="Security" fill="#f59e0b" />
                    <Bar dataKey="Environment" fill="#10b981" />
                    <Bar dataKey="Other" fill="#6b7280" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Methodology Adoption Trends</CardTitle>
                <CardDescription>Evolution of methodology preferences over semesters</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={methodologyTrendsData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="semester" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="deepLearning" stroke="#6366f1" strokeWidth={2} name="Deep Learning" />
                    <Line type="monotone" dataKey="traditional" stroke="#8b5cf6" strokeWidth={2} name="Traditional ML" />
                    <Line type="monotone" dataKey="hybrid" stroke="#ec4899" strokeWidth={2} name="Hybrid Approach" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Charts Row 2 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <Card>
              <CardHeader>
                <CardTitle>Domain Distribution by Semester</CardTitle>
                <CardDescription>Trends in domain preferences over time</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={domainBySemesterData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="semester" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="AI" fill="#6366f1" name="AI/ML" />
                    <Bar dataKey="Web" fill="#8b5cf6" name="Web Dev" />
                    <Bar dataKey="Mobile" fill="#ec4899" name="Mobile" />
                    <Bar dataKey="Cloud" fill="#f59e0b" name="Cloud" />
                    <Bar dataKey="IoT" fill="#10b981" name="IoT" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Charts Row 3 */}
          <div className="grid grid-cols-1 gap-6 mb-6">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <CardTitle>RDIA Priority Coverage Matrix</CardTitle>
                  <UITooltip>
                    <TooltipTrigger asChild>
                      <Info className="w-4 h-4 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-md">
                      <div className="space-y-2">
                        <p className="font-medium">National RDIA Priorities:</p>
                        <ul className="text-xs space-y-1">
                          <li><strong>Health & Wellness:</strong> Healthcare delivery, medical technologies, wellness applications</li>
                          <li><strong>Sustainable Environment:</strong> Environmental sustainability, renewable energy, resource conservation</li>
                          <li><strong>Energy & Industrial Leadership:</strong> Energy efficiency, industrial automation, smart manufacturing</li>
                          <li><strong>Economies of the Future:</strong> Digital transformation, fintech, blockchain, emerging technologies</li>
                        </ul>
                      </div>
                    </TooltipContent>
                  </UITooltip>
                </div>
                <CardDescription>National priority alignment over semesters</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={rdiaPriorityMatrix}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="priority" angle={-15} textAnchor="end" height={80} />
                    <YAxis domain={[0, 100]} />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="Sem1" stroke="#6366f1" strokeWidth={2} name="1st Semester" />
                    <Line type="monotone" dataKey="Sem2" stroke="#8b5cf6" strokeWidth={2} name="2nd Semester" />
                    <Line type="monotone" dataKey="Sem3" stroke="#ec4899" strokeWidth={2} name="3rd Semester" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Export Section */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Export Dashboard</CardTitle>
              <CardDescription>Download visualizations for reports and presentations</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3">
                <Button 
                  onClick={() => window.print()}
                  className="flex items-center gap-2"
                >
                  <FileText className="w-4 h-4" />
                  Export as PDF
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => {
                    alert('PNG export functionality will be available soon');
                  }}
                  className="flex items-center gap-2"
                >
                  <FileImage className="w-4 h-4" />
                  Export as PNG
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => {
                    const csvContent = 'data:text/csv;charset=utf-8,Domain,Value\\n' + 
                      domainOfInterestData.map(d => `${d.name},${d.value}`).join('\\n');
                    const link = document.createElement('a');
                    link.setAttribute('href', encodeURI(csvContent));
                    link.setAttribute('download', 'faculty_dashboard_data.csv');
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                  }}
                  className="flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Export Data (CSV)
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Insights Section */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="bg-gradient-to-br from-indigo-50 to-purple-50 border-indigo-200">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-indigo-600" />
                  Top Trending Domain
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl text-indigo-600 mb-2">AI/ML</p>
                <p className="text-sm text-gray-600">35% of all projects focus on artificial intelligence and machine learning</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Target className="w-5 h-5 text-purple-600" />
                  Most Popular Application
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl text-purple-600 mb-2">Healthcare</p>
                <p className="text-sm text-gray-600">25% of projects address healthcare and medical challenges</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-blue-600" />
                  Growing Methodology
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl text-blue-600 mb-2">Deep Learning</p>
                <p className="text-sm text-gray-600">56% increase in adoption over the past year</p>
              </CardContent>
            </Card>
          </div>

          {/* Info Banner */}
          <Card className="mt-6 border-amber-200 bg-gradient-to-r from-amber-50 to-yellow-50">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <Target className="w-6 h-6 text-amber-600 mt-1 flex-shrink-0" />
                <div>
                  <p className="text-amber-900">
                    <strong>Privacy Notice:</strong> This dashboard shows only aggregated and anonymized data. Individual student profiles and project details are not accessible to maintain privacy.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}