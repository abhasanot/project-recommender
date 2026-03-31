import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Checkbox } from './ui/checkbox';
import { Badge } from './ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';
import { Save, Plus, Trash2, CheckCircle, Info } from 'lucide-react';
import { toast } from 'sonner';


interface Course {
  id: string;
  name: string;
  grade: string;
}

const REQUIRED_COURSES = [
  'Operating Systems',
  'Software Engineering I',
  'Database Principles',
  'Design and Analysis of Algorithms',
  'Human–Computer Interaction',
  'Software Engineering II',
  'Artificial Intelligence',
  'Computer Networks',
  'Compilers',
  'Professional Development Seminar',
  'Information Security',
  'Machine Learning',
];

const ELECTIVE_COURSES = [
  'Introduction to Robotics',
  'Embedded Systems',
  'Advanced Computer Architecture',
  'Distributed Systems',
  'Internet of Things',
  'Selected Topics in Cybersecurity and Networks',
  'Web Application Development',
  'Mobile Application Development',
  'Game Application Development',
  'Selected Topics in Natural Language Processing Applications',
  'Natural Language Processing',
  'Optimization and Metaheuristics',
  'Digital Image Processing',
  'Neural Networks and Deep Learning',
  'Selected Topics in Artificial Intelligence',
  'Advanced Databases',
  'Computer Networks',
  'Software Engineering',
  'Digital Forensics',
];

const GRADES = ['A+', 'A', 'B+', 'B', 'C+', 'C', 'D+', 'D'];

const DOMAINS = [
  'Artificial Intelligence',
  'Machine Learning',
  'Web Development',
  'Mobile Development',
  'Networking',
  'Cybersecurity',
  'Cloud Computing',
  'Data Science',
  'IoT',
  'Game Development',
];

const NATIONAL_PRIORITY_RDIA = [
  'Health & Wellness',
  'Sustainable Environment & Supply of Essential Needs',
  'Energy & Industrial Leadership',
  'Economies of the Future',
];

const DOMAIN_OF_APPLICATION = [
  'Education',
  'Healthcare / Medical',
  'Security & Privacy',
  'Business & Productivity',
  'Sustainability & Environment',
  'Social Good & Community',
  'Entertainment & Media',
  'Government & Public Sector',
  'Transportation & Mobility',
  'Finance & Economics',
];

// RDIA Priority Descriptions
const RDIA_DESCRIPTIONS: Record<string, string> = {
  'Health & Wellness': 'Projects focusing on improving healthcare delivery, medical technologies, wellness applications, and health monitoring systems.',
  'Sustainable Environment & Supply of Essential Needs': 'Projects addressing environmental sustainability, renewable energy, water management, food security, and resource conservation.',
  'Energy & Industrial Leadership': 'Projects related to energy efficiency, industrial automation, smart manufacturing, and technological innovation in industry.',
  'Economies of the Future': 'Projects involving digital transformation, fintech, e-commerce, blockchain, and emerging technologies that drive economic growth.',
};

export default function ProfilePage() {
  const [selectedRequiredCourses, setSelectedRequiredCourses] = useState<Course[]>([]);
  const [selectedElectiveCourses, setSelectedElectiveCourses] = useState<Course[]>([]);
  const [selectedDomains, setSelectedDomains] = useState<string[]>([]);
  const [selectedNationalPriorities, setSelectedNationalPriorities] = useState<string[]>([]);
  const [selectedApplicationDomains, setSelectedApplicationDomains] = useState<string[]>([]);
  const [availableRequiredCourses, setAvailableRequiredCourses] = useState<string[]>(REQUIRED_COURSES);
  const [availableElectiveCourses, setAvailableElectiveCourses] = useState<string[]>(ELECTIVE_COURSES);

  const handleAddRequiredCourse = (courseName: string) => {
    if (courseName && !selectedRequiredCourses.find(c => c.name === courseName)) {
      setSelectedRequiredCourses([...selectedRequiredCourses, { id: Date.now().toString(), name: courseName, grade: '' }]);
      setAvailableRequiredCourses(availableRequiredCourses.filter(c => c !== courseName));
    }
  };

  const handleRemoveRequiredCourse = (id: string) => {
    const course = selectedRequiredCourses.find(c => c.id === id);
    if (course) {
      setAvailableRequiredCourses([...availableRequiredCourses, course.name].sort());
      setSelectedRequiredCourses(selectedRequiredCourses.filter(c => c.id !== id));
    }
  };

  const handleRequiredGradeChange = (id: string, grade: string) => {
    setSelectedRequiredCourses(selectedRequiredCourses.map(c => c.id === id ? { ...c, grade } : c));
  };

  const handleAddElectiveCourse = (courseName: string) => {
    if (courseName && !selectedElectiveCourses.find(c => c.name === courseName)) {
      setSelectedElectiveCourses([...selectedElectiveCourses, { id: Date.now().toString(), name: courseName, grade: '' }]);
      setAvailableElectiveCourses(availableElectiveCourses.filter(c => c !== courseName));
    }
  };

  const handleRemoveElectiveCourse = (id: string) => {
    const course = selectedElectiveCourses.find(c => c.id === id);
    if (course) {
      setAvailableElectiveCourses([...availableElectiveCourses, course.name].sort());
      setSelectedElectiveCourses(selectedElectiveCourses.filter(c => c.id !== id));
    }
  };

  const handleElectiveGradeChange = (id: string, grade: string) => {
    setSelectedElectiveCourses(selectedElectiveCourses.map(c => c.id === id ? { ...c, grade } : c));
  };
  useEffect(() => {
  loadSavedProfile();
}, []);

const loadSavedProfile = async () => {
  try {
    const response = await api.get('/profile');
    const data = response.data;
    
    setSelectedRequiredCourses(data.required_courses || []);
    setSelectedElectiveCourses(data.elective_courses || []);
    setSelectedDomains(data.interests || []);
    setSelectedApplicationDomains(data.applications || []);
    setSelectedNationalPriorities(data.rdia ? [data.rdia] : []);
    setWeightingMode(data.weighting_mode || 'balanced');
  } catch (error) {
    console.error('Error loading profile:', error);
  }
};

  const handleDomainToggle = (domain: string) => {
    setSelectedDomains(prev =>
      prev.includes(domain)
        ? prev.filter(d => d !== domain)
        : [...prev, domain]
    );
  };

  const handleSaveProfile = async () => {
  if (validateProfile()) {
    try {
      const profileData = {
        required_courses: selectedRequiredCourses,
        elective_courses: selectedElectiveCourses,
        courses: [...selectedRequiredCourses, ...selectedElectiveCourses],
        interests: selectedDomains,
        applications: selectedApplicationDomains,
        rdia: selectedNationalPriorities[0] || '',
        weighting_mode: weightingMode
      };
      
      await api.post('/profile', profileData);
      toast.success('Profile saved successfully!', {
        description: 'Your academic profile has been updated.',
      });
    } catch (error) {
      toast.error('Error saving profile. Please try again.');
    }
  }
};

  const handleNationalPriorityToggle = (priority: string) => {
    setSelectedNationalPriorities(prev =>
      prev.includes(priority)
        ? prev.filter(p => p !== priority)
        : [...prev, priority]
    );
  };

  const handleApplicationDomainToggle = (domain: string) => {
    setSelectedApplicationDomains(prev =>
      prev.includes(domain)
        ? prev.filter(d => d !== domain)
        : [...prev, domain]
    );
  };

  const validateProfile = () => {
    if (selectedRequiredCourses.length === 0 && selectedElectiveCourses.length === 0) {
      toast.error('Please add at least one course (required or elective)');
      return false;
    }
    if (selectedRequiredCourses.some(c => !c.grade) || selectedElectiveCourses.some(c => !c.grade)) {
      toast.error('Please assign grades to all courses');
      return false;
    }
    if (selectedDomains.length === 0) {
      toast.error('Please select at least one domain of interest');
      return false;
    }
    if (selectedNationalPriorities.length === 0) {
      toast.error('Please select at least one national priority');
      return false;
    }
    if (selectedApplicationDomains.length === 0) {
      toast.error('Please select at least one domain of application');
      return false;
    }
    return true;
  };

  const [weightingMode, setWeightingMode] = useState('balanced');

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl text-gray-900 mb-2">My Profile (UR-F1)</h1>
        <p className="text-gray-600">
          Build your academic profile to receive personalized recommendations
        </p>
      </div>

      <div className="space-y-6">
        {/* Required Courses Section */}
        <Card className="border-l-4 border-l-indigo-500">
          <CardHeader>
            <CardTitle>Required Courses</CardTitle>
            <CardDescription>
              Select required courses you've completed and assign your grades
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Select onValueChange={handleAddRequiredCourse}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Select a required course to add" />
                </SelectTrigger>
                <SelectContent>
                  {availableRequiredCourses.map(course => (
                    <SelectItem key={course} value={course}>
                      {course}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" disabled>
                <Plus className="w-4 h-4" />
              </Button>
            </div>

            {selectedRequiredCourses.length > 0 && (
              <div className="space-y-3 mt-4">
                {selectedRequiredCourses.map(course => (
                  <div key={course.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <span className="flex-1">{course.name}</span>
                    <Select value={course.grade} onValueChange={(grade) => handleRequiredGradeChange(course.id, grade)}>
                      <SelectTrigger className="w-24">
                        <SelectValue placeholder="Grade" />
                      </SelectTrigger>
                      <SelectContent>
                        {GRADES.map(grade => (
                          <SelectItem key={grade} value={grade}>
                            {grade}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveRequiredCourse(course.id)}
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Elective Courses Section */}
        <Card className="border-l-4 border-l-purple-500">
          <CardHeader>
            <CardTitle>Elective Courses</CardTitle>
            <CardDescription>
              Select elective courses you've completed and assign your grades
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Select onValueChange={handleAddElectiveCourse}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Select an elective course to add" />
                </SelectTrigger>
                <SelectContent>
                  {availableElectiveCourses.map(course => (
                    <SelectItem key={course} value={course}>
                      {course}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" disabled>
                <Plus className="w-4 h-4" />
              </Button>
            </div>

            {selectedElectiveCourses.length > 0 && (
              <div className="space-y-3 mt-4">
                {selectedElectiveCourses.map(course => (
                  <div key={course.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <span className="flex-1">{course.name}</span>
                    <Select value={course.grade} onValueChange={(grade) => handleElectiveGradeChange(course.id, grade)}>
                      <SelectTrigger className="w-24">
                        <SelectValue placeholder="Grade" />
                      </SelectTrigger>
                      <SelectContent>
                        {GRADES.map(grade => (
                          <SelectItem key={grade} value={grade}>
                            {grade}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveElectiveCourse(course.id)}
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Domains of Interest */}
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader>
            <CardTitle>Domains of Interest</CardTitle>
            <CardDescription>
              Select multiple domains that interest you for your graduation project
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {DOMAINS.map(domain => (
                <div key={domain} className="flex items-center space-x-2">
                  <Checkbox
                    id={domain}
                    checked={selectedDomains.includes(domain)}
                    onCheckedChange={() => handleDomainToggle(domain)}
                  />
                  <Label htmlFor={domain} className="cursor-pointer">
                    {domain}
                  </Label>
                </div>
              ))}
            </div>
            {selectedDomains.length > 0 && (
              <div className="mt-4 pt-4 border-t">
                <p className="text-sm text-gray-600 mb-2">Selected domains:</p>
                <div className="flex flex-wrap gap-2">
                  {selectedDomains.map(domain => (
                    <Badge key={domain} variant="secondary">
                      {domain}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Domain of Application */}
        <Card className="border-l-4 border-l-pink-500">
          <CardHeader>
            <CardTitle>Domain of Application</CardTitle>
            <CardDescription>
              Select the application areas where you'd like to apply your technical skills
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {DOMAIN_OF_APPLICATION.map(domain => (
                <div key={domain} className="flex items-center space-x-2">
                  <Checkbox
                    id={`app-${domain}`}
                    checked={selectedApplicationDomains.includes(domain)}
                    onCheckedChange={() => handleApplicationDomainToggle(domain)}
                  />
                  <Label htmlFor={`app-${domain}`} className="cursor-pointer">
                    {domain}
                  </Label>
                </div>
              ))}
            </div>
            {selectedApplicationDomains.length > 0 && (
              <div className="mt-4 pt-4 border-t">
                <p className="text-sm text-gray-600 mb-2">Selected application domains:</p>
                <div className="flex flex-wrap gap-2">
                  {selectedApplicationDomains.map(domain => (
                    <Badge key={domain} variant="secondary">
                      {domain}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* National Priority RDIA */}
        <Card className="border-l-4 border-l-green-500">
          <CardHeader>
            <div className="flex items-center gap-2">
              <CardTitle>National Priority RDIA</CardTitle>
              <Tooltip>
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
              </Tooltip>
            </div>
            <CardDescription>
              Select the national priorities that align with your project interests
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {NATIONAL_PRIORITY_RDIA.map(priority => (
                <div key={priority} className="flex items-center space-x-2">
                  <Checkbox
                    id={`priority-${priority}`}
                    checked={selectedNationalPriorities.includes(priority)}
                    onCheckedChange={() => handleNationalPriorityToggle(priority)}
                  />
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Label htmlFor={`priority-${priority}`} className="cursor-pointer hover:text-green-700 transition-colors">
                        {priority}
                      </Label>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="max-w-xs">
                      <p>{RDIA_DESCRIPTIONS[priority]}</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
              ))}
            </div>
            {selectedNationalPriorities.length > 0 && (
              <div className="mt-4 pt-4 border-t">
                <p className="text-sm text-gray-600 mb-2">Selected priorities:</p>
                <div className="flex flex-wrap gap-2">
                  {selectedNationalPriorities.map(priority => (
                    <Badge key={priority} variant="secondary" className="bg-green-100 text-green-800">
                      {priority}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={validateProfile} size="lg">
            <CheckCircle className="w-4 h-4 mr-2" />
            Validate Profile
          </Button>
          <Button onClick={handleSaveProfile} size="lg" className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700">
            <Save className="w-4 h-4 mr-2" />
            Save Profile
          </Button>
        </div>
      </div>
    </div>
  );
}