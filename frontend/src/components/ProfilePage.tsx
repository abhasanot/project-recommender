// frontend/src/components/ProfilePage.tsx
import { useState, useEffect, useCallback } from 'react';
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from './ui/card';
import { Button }  from './ui/button';
import { Badge }   from './ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from './ui/select';
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from './ui/tooltip';
import { Save, Trash2, CheckCircle, Info, AlertCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import api from '../services/api';

// ── Types ─────────────────────────────────────────────────────────────────────

interface CourseOption { code: string; title: string; }
interface DomainOption  { name: string; description?: string; }
interface RdiaOption    { Label: string; Description: string; }

interface SelectedCourse {
  _key:        string;   // internal UI key only
  course_code: string;
  course_title: string;
  grade:       string;
}

const GRADES = ['A+', 'A', 'B+', 'B', 'C+', 'C', 'D+', 'D'];

// ── Component ─────────────────────────────────────────────────────────────────

export default function ProfilePage() {
  // ── remote data ─────────────────────────────────────────────────────────
  const [courseOptions,   setCourseOptions]   = useState<CourseOption[]>([]);
  const [interestOptions, setInterestOptions] = useState<DomainOption[]>([]);
  const [appOptions,      setAppOptions]      = useState<DomainOption[]>([]);
  const [rdiaOptions,     setRdiaOptions]     = useState<RdiaOption[]>([]);

  // ── form state ───────────────────────────────────────────────────────────
  const [courses,    setCourses]    = useState<SelectedCourse[]>([]);
  const [interests,  setInterests]  = useState<string[]>([]);
  const [apps,       setApps]       = useState<string[]>([]);
  const [rdia,       setRdia]       = useState<string>('');

  // ── UI state ─────────────────────────────────────────────────────────────
  const [pageLoading, setPageLoading] = useState(true);
  const [saving,      setSaving]      = useState(false);
  const [loadError,   setLoadError]   = useState<string | null>(null);

  // ── load domains + saved profile on mount ────────────────────────────────
  const load = useCallback(async () => {
    setPageLoading(true);
    setLoadError(null);
    try {
      const [domRes, profRes] = await Promise.all([
        api.get('/domains'),
        api.get('/profile'),
      ]);

      const cOpts: CourseOption[] = domRes.data.courses     ?? [];
      const iOpts: DomainOption[] = domRes.data.interests   ?? [];
      const aRaw                  = domRes.data.applications ?? [];
      const rOpts: RdiaOption[]   = domRes.data.rdia        ?? [];

      // Application_Domains.json items have shape {Field, Focus} OR {name, description}
      const aOpts: DomainOption[] = aRaw.map((item: any) => ({
        name:        item.name ?? item.Field ?? String(item),
        description: item.description ?? item.Focus ?? '',
      }));

      setCourseOptions(cOpts);
      setInterestOptions(iOpts);
      setAppOptions(aOpts);
      setRdiaOptions(rOpts);

      // ── restore saved profile ──────────────────────────────────────────
      const prof = profRes.data;

      if (prof.courses?.length) {
        const codeToTitle: Record<string, string> = {};
        cOpts.forEach(c => { codeToTitle[c.code] = c.title; });
        setCourses(prof.courses.map((c: { course_code: string; grade: string }) => ({
          _key:        `${c.course_code}_${Math.random()}`,
          course_code: c.course_code,
          course_title: codeToTitle[c.course_code] ?? c.course_code,
          grade:       c.grade ?? '',
        })));
      }

      if (prof.interests?.length)    setInterests(prof.interests);
      if (prof.applications?.length) setApps(prof.applications);
      if (prof.rdia)                  setRdia(prof.rdia);

    } catch (err: any) {
      const msg = err?.response?.data?.error ?? 'Failed to load profile data';
      setLoadError(msg);
      toast.error(msg);
    } finally {
      setPageLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── course handlers ───────────────────────────────────────────────────────

  const addCourse = (code: string) => {
    if (!code) return;
    if (courses.find(c => c.course_code === code)) {
      toast.error('This course is already added'); return;
    }
    const opt = courseOptions.find(c => c.code === code);
    setCourses(prev => [...prev, {
      _key:        `${code}_${Date.now()}`,
      course_code: code,
      course_title: opt?.title ?? code,
      grade:       '',
    }]);
  };

  const removeCourse = (key: string) =>
    setCourses(prev => prev.filter(c => c._key !== key));

  const setGrade = (key: string, grade: string) =>
    setCourses(prev => prev.map(c => c._key === key ? { ...c, grade } : c));

  // ── interest / application toggles ───────────────────────────────────────

  const toggleItem = (
    list: string[], setList: (v: string[]) => void,
    name: string, max: number, label: string,
  ) => {
    if (list.includes(name)) {
      setList(list.filter(i => i !== name));
    } else if (list.length >= max) {
      toast.error(`Maximum ${max} ${label} allowed`);
    } else {
      setList([...list, name]);
    }
  };

  // ── save ─────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    // validation
    if (courses.length === 0) {
      toast.error('Please add at least one course'); return;
    }
    const missing = courses.find(c => !c.grade.trim());
    if (missing) {
      toast.error(`Please select a grade for "${missing.course_title}"`); return;
    }
    if (interests.length === 0) {
      toast.error('Please select at least one domain interest'); return;
    }
    if (apps.length === 0) {
      toast.error('Please select at least one application domain'); return;
    }
    if (!rdia.trim()) {
      toast.error('Please select an RDIA national priority'); return;
    }

    setSaving(true);
    try {
      await api.post('/profile', {
        courses:      courses.map(c => ({ course_code: c.course_code, grade: c.grade })),
        interests,
        applications: apps,
        rdia,
      });
      toast.success('Profile saved successfully!');
    } catch (err: any) {
      toast.error(err?.response?.data?.error ?? 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  // ── completeness indicator ────────────────────────────────────────────────

  const gradesOk  = courses.length > 0 && courses.every(c => c.grade.trim());
  const steps = {
    'Courses & Grades':       gradesOk,
    'Domain Interests':     interests.length >= 1,
    'Application Domains':    apps.length >= 1,
    'RDIA National Priority': rdia.trim() !== '',
  };
  const completePct = Math.round(Object.values(steps).filter(Boolean).length / Object.keys(steps).length * 100);

  const usedCodes = new Set(courses.map(c => c.course_code));

  // ── render states ─────────────────────────────────────────────────────────

  if (pageLoading) {
    return (
      <div className="p-8 flex items-center justify-center h-full">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-indigo-600 mx-auto mb-3" />
          <p className="text-gray-500">Loading your profile…</p>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="p-8 max-w-2xl mx-auto">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="py-10 text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
            <p className="text-gray-800 mb-4">{loadError}</p>
            <Button onClick={load} variant="outline">Retry</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── main render ───────────────────────────────────────────────────────────

  return (
    <TooltipProvider>
      <div className="p-8 max-w-4xl mx-auto">

        {/* Header */}
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl text-gray-900 mb-1">My Academic Profile</h1>
            <p className="text-gray-500 text-sm">
              Complete all four sections — your group cannot be finalized until everyone's profile is done.
            </p>
          </div>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="flex-shrink-0 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
          >
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            {saving ? 'Saving…' : 'Save Profile'}
          </Button>
        </div>

        {/* Completion progress */}
        <Card className="mb-6 border-indigo-100 bg-gradient-to-r from-indigo-50 to-purple-50">
          <CardContent className="py-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-indigo-700">Profile completeness</span>
              <span className="text-lg font-bold text-indigo-700">{completePct}%</span>
            </div>
            <div className="w-full bg-indigo-100 rounded-full h-2 mb-3">
              <div
                className="bg-gradient-to-r from-indigo-500 to-purple-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${completePct}%` }}
              />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {Object.entries(steps).map(([label, done]) => (
                <div key={label} className={`flex items-center gap-1.5 text-xs ${done ? 'text-green-700' : 'text-gray-500'}`}>
                  <CheckCircle className={`w-3.5 h-3.5 flex-shrink-0 ${done ? 'text-green-500' : 'text-gray-300'}`} />
                  {label}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">

          {/* ── Courses & Grades ─────────────────────────────────────────── */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Courses &amp; Grades
                {gradesOk && <CheckCircle className="w-4 h-4 text-green-500" />}
              </CardTitle>
              <CardDescription>
                Select each course you have completed and your grade — at least one required
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Dropdown to pick a course */}
              <Select
                onValueChange={addCourse}
                value=""           // always reset after selection
              >
                <SelectTrigger>
                  <SelectValue placeholder={courseOptions.length ? 'Add a course…' : 'Loading courses…'} />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  {courseOptions
                    .filter(c => !usedCodes.has(c.code))
                    .map(c => (
                      <SelectItem key={c.code} value={c.code}>
                        <span className="font-mono text-xs text-gray-500 mr-2">{c.code}</span>
                        {c.title}
                      </SelectItem>
                    ))}
                  {courseOptions.filter(c => !usedCodes.has(c.code)).length === 0 && (
                    <div className="px-3 py-2 text-sm text-gray-400">All courses added</div>
                  )}
                </SelectContent>
              </Select>

              {/* Selected courses list */}
              {courses.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4 border border-dashed rounded-lg">
                  No courses added yet — use the dropdown above
                </p>
              ) : (
                <div className="space-y-2">
                  {courses.map(c => (
                    <div key={c._key} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{c.course_title}</p>
                        <p className="text-xs text-gray-400">{c.course_code}</p>
                      </div>
                      <Select value={c.grade} onValueChange={g => setGrade(c._key, g)}>
                        <SelectTrigger className={`w-24 ${!c.grade ? 'border-red-300' : ''}`}>
                          <SelectValue placeholder="Grade" />
                        </SelectTrigger>
                        <SelectContent>
                          {GRADES.map(g => (
                            <SelectItem key={g} value={g}>{g}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        variant="ghost" size="sm"
                        onClick={() => removeCourse(c._key)}
                        className="text-red-400 hover:text-red-600 hover:bg-red-50 px-2"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* ── Domain Interests ───────────────────────────────────────── */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Domain Interests
                <Badge variant="outline" className="text-xs font-normal">max 3</Badge>
                {interests.length >= 1 && <CheckCircle className="w-4 h-4 text-green-500" />}
              </CardTitle>
              <CardDescription>
                Select 1–3 areas you are interested in exploring for your project
              </CardDescription>
            </CardHeader>
            <CardContent>
              {interestOptions.length === 0 ? (
                <p className="text-sm text-gray-400">Loading options…</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {interestOptions.map(opt => {
                    const sel = interests.includes(opt.name);
                    return (
                      <Tooltip key={opt.name}>
                        <TooltipTrigger asChild>
                          <button
                            onClick={() => toggleItem(interests, setInterests, opt.name, 3, 'interests')}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm border transition-all ${
                              sel
                                ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                                : 'bg-white text-gray-700 border-gray-300 hover:border-indigo-400 hover:bg-indigo-50'
                            }`}
                          >
                            {sel && <CheckCircle className="w-3 h-3" />}
                            {opt.name}
                          </button>
                        </TooltipTrigger>
                        {opt.description && (
                          <TooltipContent side="top" className="max-w-xs text-xs">
                            {opt.description}
                          </TooltipContent>
                        )}
                      </Tooltip>
                    );
                  })}
                </div>
              )}
              {interests.length > 0 && (
                <p className="text-xs text-gray-500 mt-3">
                  Selected ({interests.length}/3): {interests.join(', ')}
                </p>
              )}
            </CardContent>
          </Card>

          {/* ── Application Domains ──────────────────────────────────────── */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Application Domains
                <Badge variant="outline" className="text-xs font-normal">max 3</Badge>
                {apps.length >= 1 && <CheckCircle className="w-4 h-4 text-green-500" />}
              </CardTitle>
              <CardDescription>
                Which real-world sectors would you like your project to serve?
              </CardDescription>
            </CardHeader>
            <CardContent>
              {appOptions.length === 0 ? (
                <p className="text-sm text-gray-400">Loading options…</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {appOptions.map(opt => {
                    const sel = apps.includes(opt.name);
                    return (
                      <Tooltip key={opt.name}>
                        <TooltipTrigger asChild>
                          <button
                            onClick={() => toggleItem(apps, setApps, opt.name, 3, 'application domains')}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm border transition-all ${
                              sel
                                ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
                                : 'bg-white text-gray-700 border-gray-300 hover:border-purple-400 hover:bg-purple-50'
                            }`}
                          >
                            {sel && <CheckCircle className="w-3 h-3" />}
                            {opt.name}
                          </button>
                        </TooltipTrigger>
                        {opt.description && (
                          <TooltipContent side="top" className="max-w-xs text-xs">
                            {opt.description}
                          </TooltipContent>
                        )}
                      </Tooltip>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* ── RDIA Priority ────────────────────────────────────────────── */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                RDIA National Priority
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="w-4 h-4 text-gray-400 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs text-xs">
                    RDIA priorities align your project with Saudi Arabia's Vision 2030 research agenda.
                  </TooltipContent>
                </Tooltip>
                {rdia && <CheckCircle className="w-4 h-4 text-green-500" />}
              </CardTitle>
              <CardDescription>
                Select exactly one national priority area that your project will address
              </CardDescription>
            </CardHeader>
            <CardContent>
              {rdiaOptions.length === 0 ? (
                <p className="text-sm text-gray-400">Loading options…</p>
              ) : (
                <div className="space-y-3">
                  {rdiaOptions.map(opt => {
                    const label = opt.Label;
                    const desc  = opt.Description;
                    const sel   = rdia === label;
                    return (
                      <button
                        key={label}
                        onClick={() => setRdia(sel ? '' : label)}
                        className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                          sel
                            ? 'border-amber-400 bg-amber-50 shadow-sm'
                            : 'border-gray-200 hover:border-amber-300 hover:bg-amber-50/40'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`w-5 h-5 rounded-full border-2 flex-shrink-0 mt-0.5 flex items-center justify-center ${
                            sel ? 'border-amber-500 bg-amber-500' : 'border-gray-300'
                          }`}>
                            {sel && <div className="w-2 h-2 rounded-full bg-white" />}
                          </div>
                          <div>
                            <p className={`font-semibold text-sm ${sel ? 'text-amber-900' : 'text-gray-800'}`}>
                              {label}
                            </p>
                            {desc && (
                              <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{desc}</p>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

        </div>

        {/* Bottom save button */}
        <div className="mt-8 flex justify-end">
          <Button
            onClick={handleSave}
            disabled={saving}
            size="lg"
            className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 px-8"
          >
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            {saving ? 'Saving…' : 'Save Profile'}
          </Button>
        </div>

      </div>
    </TooltipProvider>
  );
}
