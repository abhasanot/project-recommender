// frontend/src/components/ProfilePage.tsx
import { useState, useEffect } from 'react';
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from './ui/card';
import { Button }   from './ui/button';
import { Label }    from './ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from './ui/select';
import { Badge }    from './ui/badge';
import {
  Tooltip, TooltipContent, TooltipTrigger,
} from './ui/tooltip';
import { Save, Plus, Trash2, CheckCircle, Info } from 'lucide-react';
import { toast } from 'sonner';
import api from '../services/api';

// ── Types ─────────────────────────────────────────────────────────────────────

interface CourseEntry {
  /** Internal UI key only — never sent to the API */
  _uiId: string;
  /** FIX: course_code is what the backend expects, not the display name */
  course_code: string;
  /** Display label shown in the UI */
  course_title: string;
  grade: string;
}

interface DomainOption {
  name: string;
  description?: string;
}

// ── Static fallback data (used only when the API /api/domains call fails) ─────

const GRADES = ['A+', 'A', 'B+', 'B', 'C+', 'C', 'D+', 'D'];

const RDIA_DESCRIPTIONS: Record<string, string> = {
  'Health & Wellness':
    'Projects focusing on improving healthcare delivery, medical technologies, wellness applications, and health monitoring systems.',
  'Sustainable Environment & Supply of Essential Needs':
    'Projects addressing environmental sustainability, renewable energy, water management, food security, and resource conservation.',
  'Energy & Industrial Leadership':
    'Projects related to energy efficiency, industrial automation, smart manufacturing, and technological innovation in industry.',
  'Economies of the Future':
    'Projects involving digital transformation, fintech, e-commerce, blockchain, and emerging technologies that drive economic growth.',
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function ProfilePage() {
  // Domain options loaded from the API
  const [courseOptions, setCourseOptions]   = useState<{ code: string; title: string }[]>([]);
  const [interestOptions, setInterestOptions] = useState<DomainOption[]>([]);
  const [appOptions, setAppOptions]         = useState<DomainOption[]>([]);
  const [rdiaOptions, setRdiaOptions]       = useState<{ Label: string; Description: string }[]>([]);

  // Selected values
  const [selectedCourses, setSelectedCourses]   = useState<CourseEntry[]>([]);
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [selectedApps, setSelectedApps]         = useState<string[]>([]);
  const [selectedRdia, setSelectedRdia]         = useState<string>('');

  const [saving, setSaving]   = useState(false);
  const [loading, setLoading] = useState(true);

  // Load domain options + existing profile on mount
  useEffect(() => {
    loadDomainsAndProfile();
  }, []);

  const loadDomainsAndProfile = async () => {
    try {
      const [domainsRes, profileRes] = await Promise.all([
        api.get('/domains'),
        api.get('/profile'),
      ]);

      // Populate dropdown options
      setCourseOptions(domainsRes.data.courses || []);
      setInterestOptions(domainsRes.data.interests || []);
      setAppOptions(domainsRes.data.applications || []);
      setRdiaOptions(domainsRes.data.rdia || []);

      // Restore saved profile into UI state
      const profile = profileRes.data;
      if (profile.courses?.length) {
        const courseMap: Record<string, string> = {};
        (domainsRes.data.courses || []).forEach(
          (c: { code: string; title: string }) => { courseMap[c.code] = c.title; }
        );
        setSelectedCourses(
          profile.courses.map((c: { course_code: string; grade: string }) => ({
            _uiId:       `${c.course_code}-${Date.now()}-${Math.random()}`,
            course_code: c.course_code,
            course_title: courseMap[c.course_code] || c.course_code,
            grade:       c.grade,
          }))
        );
      }
      if (profile.interests?.length)    setSelectedInterests(profile.interests);
      if (profile.applications?.length) setSelectedApps(profile.applications);
      if (profile.rdia)                 setSelectedRdia(profile.rdia);
    } catch (err) {
      console.error('Error loading domains / profile:', err);
      toast.error('Could not load domain options from server');
    } finally {
      setLoading(false);
    }
  };

  // ── Course helpers ────────────────────────────────────────────────────────

  const addCourse = (code: string) => {
    if (!code) return;
    if (selectedCourses.find((c) => c.course_code === code)) {
      toast.error('This course is already added');
      return;
    }
    const option = courseOptions.find((c) => c.code === code);
    setSelectedCourses((prev) => [
      ...prev,
      {
        _uiId:       `${code}-${Date.now()}`,
        course_code: code,
        course_title: option?.title ?? code,
        grade:       '',
      },
    ]);
  };

  const removeCourse = (uiId: string) => {
    setSelectedCourses((prev) => prev.filter((c) => c._uiId !== uiId));
  };

  const setGrade = (uiId: string, grade: string) => {
    setSelectedCourses((prev) =>
      prev.map((c) => (c._uiId === uiId ? { ...c, grade } : c))
    );
  };

  // ── Interest helpers ──────────────────────────────────────────────────────

  const toggleInterest = (name: string) => {
    setSelectedInterests((prev) =>
      prev.includes(name)
        ? prev.filter((i) => i !== name)
        : prev.length >= 3
        ? (toast.error('Maximum 3 interests allowed'), prev)
        : [...prev, name]
    );
  };

  const toggleApp = (name: string) => {
    setSelectedApps((prev) =>
      prev.includes(name)
        ? prev.filter((a) => a !== name)
        : prev.length >= 3
        ? (toast.error('Maximum 3 application domains allowed'), prev)
        : [...prev, name]
    );
  };

  // ── Save ──────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    // Validate all courses have grades
    const missingGrade = selectedCourses.find((c) => !c.grade);
    if (missingGrade) {
      toast.error(`Please select a grade for "${missingGrade.course_title}"`);
      return;
    }
    if (selectedInterests.length === 0) {
      toast.error('Please select at least one interest domain');
      return;
    }
    if (!selectedRdia) {
      toast.error('Please select an RDIA priority');
      return;
    }

    setSaving(true);
    try {
      /**
       * FIX (Bug): The original code sent `name` (display title) for each
       * course instead of `course_code`.  The backend expects
       *   { course_code: "CS1465", grade: "A+" }
       * and the recommender engine looks up embeddings by `course_code`.
       * Sending the display name silently skipped ALL courses because none
       * matched any known course code.
       */
      await api.post('/profile', {
        courses:      selectedCourses.map((c) => ({
          course_code: c.course_code,
          grade:       c.grade,
        })),
        interests:    selectedInterests,
        applications: selectedApps,
        rdia:         selectedRdia,
      });

      toast.success('Profile saved successfully!');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  // ── Loading state ─────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="p-8 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto" />
        <p className="mt-4 text-gray-600">Loading profile…</p>
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────

  const usedCodes = new Set(selectedCourses.map((c) => c.course_code));

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl text-gray-900 mb-2">My Academic Profile</h1>
          <p className="text-gray-600">Add your courses and interests to get personalised recommendations</p>
        </div>
        <Button
          onClick={handleSave}
          disabled={saving}
          className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
        >
          <Save className="w-4 h-4 mr-2" />
          {saving ? 'Saving…' : 'Save Profile'}
        </Button>
      </div>

      <div className="space-y-6">

        {/* ── Courses ─────────────────────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle>Courses &amp; Grades</CardTitle>
            <CardDescription>
              Add your completed courses and the grade you received in each
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Add course row */}
            <div className="flex gap-2">
              <Select onValueChange={addCourse}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Select a course to add…" />
                </SelectTrigger>
                <SelectContent className="max-h-72 overflow-y-auto">
                  {courseOptions
                    .filter((c) => !usedCodes.has(c.code))
                    .map((c) => (
                      <SelectItem key={c.code} value={c.code}>
                        {c.title}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <Button variant="outline" disabled>
                <Plus className="w-4 h-4" />
              </Button>
            </div>

            {/* Selected courses */}
            {selectedCourses.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">
                No courses added yet
              </p>
            ) : (
              <div className="space-y-2">
                {selectedCourses.map((course) => (
                  <div
                    key={course._uiId}
                    className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
                  >
                    <span className="flex-1 text-sm text-gray-800">
                      {course.course_title}
                    </span>
                    <Select
                      value={course.grade}
                      onValueChange={(g) => setGrade(course._uiId, g)}
                    >
                      <SelectTrigger className="w-24">
                        <SelectValue placeholder="Grade" />
                      </SelectTrigger>
                      <SelectContent>
                        {GRADES.map((g) => (
                          <SelectItem key={g} value={g}>{g}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeCourse(course._uiId)}
                      className="text-red-500 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Interest Domains ─────────────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle>Research Interests <span className="text-sm text-gray-500 font-normal">(max 3)</span></CardTitle>
            <CardDescription>Select domains you are interested in exploring</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {interestOptions.map((opt) => {
                const selected = selectedInterests.includes(opt.name);
                return (
                  <Tooltip key={opt.name}>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => toggleInterest(opt.name)}
                        className={`px-3 py-1.5 rounded-full text-sm border transition-all ${
                          selected
                            ? 'bg-indigo-600 text-white border-indigo-600'
                            : 'bg-white text-gray-700 border-gray-300 hover:border-indigo-400'
                        }`}
                      >
                        {selected && <CheckCircle className="w-3 h-3 inline mr-1" />}
                        {opt.name}
                      </button>
                    </TooltipTrigger>
                    {opt.description && (
                      <TooltipContent className="max-w-xs">{opt.description}</TooltipContent>
                    )}
                  </Tooltip>
                );
              })}
            </div>
            {selectedInterests.length > 0 && (
              <p className="text-xs text-gray-500 mt-3">
                Selected: {selectedInterests.join(', ')}
              </p>
            )}
          </CardContent>
        </Card>

        {/* ── Application Domains ───────────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle>Application Domains <span className="text-sm text-gray-500 font-normal">(max 3)</span></CardTitle>
            <CardDescription>Which real-world sectors would you like your project to impact?</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {appOptions.map((opt: any) => {
                const name     = opt.name ?? opt.Field ?? opt;
                const selected = selectedApps.includes(name);
                return (
                  <button
                    key={name}
                    onClick={() => toggleApp(name)}
                    className={`px-3 py-1.5 rounded-full text-sm border transition-all ${
                      selected
                        ? 'bg-purple-600 text-white border-purple-600'
                        : 'bg-white text-gray-700 border-gray-300 hover:border-purple-400'
                    }`}
                  >
                    {selected && <CheckCircle className="w-3 h-3 inline mr-1" />}
                    {name}
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* ── RDIA Priority ─────────────────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              RDIA National Priority
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="w-4 h-4 text-gray-400 cursor-help" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  RDIA priorities align your project with Saudi Arabia's Vision 2030 research agenda.
                </TooltipContent>
              </Tooltip>
            </CardTitle>
            <CardDescription>Select the national priority area your project will address</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {rdiaOptions.map((opt: any) => {
                const label = opt.Label ?? opt.label ?? opt;
                const desc  = opt.Description ?? opt.description ?? RDIA_DESCRIPTIONS[label] ?? '';
                return (
                  <button
                    key={label}
                    onClick={() => setSelectedRdia(label)}
                    className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                      selectedRdia === label
                        ? 'border-amber-400 bg-amber-50'
                        : 'border-gray-200 hover:border-amber-300 hover:bg-amber-50/50'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-5 h-5 rounded-full border-2 flex-shrink-0 mt-0.5 ${
                        selectedRdia === label
                          ? 'border-amber-500 bg-amber-500'
                          : 'border-gray-400'
                      }`}>
                        {selectedRdia === label && (
                          <CheckCircle className="w-full h-full text-white" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{label}</p>
                        {desc && (
                          <p className="text-xs text-gray-600 mt-0.5">{desc}</p>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
