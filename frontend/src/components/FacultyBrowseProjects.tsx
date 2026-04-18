// frontend/src/components/FacultyBrowseProjects.tsx
/**
 * Browse Projects page — Faculty only.
 *
 * Features:
 *  - Live search bar (title, keywords, supervisor, abstract)
 *  - Filter chips: application domain, interest domain, RDIA, year, semester
 *  - Responsive card grid (3 columns on desktop, 1 on mobile)
 *  - Click a card → slide-in detail panel with full project metadata
 */

import { useState, useEffect, useMemo } from "react";
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import {
  Search, X, ChevronRight, ChevronLeft, User, Calendar,
  BookOpen, Tag, Target, Lightbulb, TrendingUp, Loader2,
  FileText, AlertCircle, Filter,
} from "lucide-react";
import api from "../services/api";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Project {
  id:                    string;
  title:                 string;
  abstract:              string;
  future_work?:          string;
  supervisor:            string;
  semester:              string;
  academic_year:         string;
  domain_of_interest:    string[];
  domain_of_application: string[];
  rdia_priority:         string[];
  keywords:              string[];
}

// ── Semester code → readable label ───────────────────────────────────────────

function semesterLabel(code: string): string {
  return code === "10" ? "First" : code === "20" ? "Second" : code === "30" ? "Summer" : code;
}

// ── Small highlight helper ────────────────────────────────────────────────────

function Highlight({ text, query }: { text: string; query: string }) {
  if (!query.trim() || !text) return <>{text}</>;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-yellow-100 text-yellow-900 rounded px-0.5">{text.slice(idx, idx + query.length)}</mark>
      {text.slice(idx + query.length)}
    </>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function FacultyBrowseProjects() {
  const [projects,  setProjects]  = useState<Project[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState<string | null>(null);
  const [query,     setQuery]     = useState("");
  const [selected,  setSelected]  = useState<Project | null>(null);

  // Active filter chips (multi-select per category)
  const [activeInterest, setActiveInterest] = useState<string[]>([]);
  const [activeApp,      setActiveApp]      = useState<string[]>([]);
  const [activeRdia,     setActiveRdia]     = useState<string[]>([]);
  const [activeYear,     setActiveYear]     = useState<string[]>([]);
  const [showFilters,    setShowFilters]    = useState(false);

  // ── Load all projects from API ────────────────────────────────────────────

  useEffect(() => {
    setLoading(true);
    api.get("/projects")
      .then(r => {
        const data = Array.isArray(r.data) ? r.data : r.data.projects ?? [];
        setProjects(data);
      })
      .catch(() => setError("Failed to load projects. Make sure the backend is running."))
      .finally(() => setLoading(false));
  }, []);

  // ── Derived filter options (dynamic from data) ───────────────────────────

  const allInterests    = useMemo(() => [...new Set(projects.flatMap(p => p.domain_of_interest    ?? []))].sort(), [projects]);
  const allApps         = useMemo(() => [...new Set(projects.flatMap(p => p.domain_of_application ?? []))].sort(), [projects]);
  const allRdia         = useMemo(() => [...new Set(projects.flatMap(p => p.rdia_priority         ?? []))].sort(), [projects]);
  const allYears        = useMemo(() => [...new Set(projects.map(p => p.academic_year).filter(Boolean))].sort().reverse(), [projects]);

  // ── Filtered & searched list ──────────────────────────────────────────────

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    return projects.filter(p => {
      // Text search
      if (q) {
        const haystack = [
          p.title, p.abstract, p.supervisor,
          ...(p.keywords ?? []),
          ...(p.domain_of_interest ?? []),
          ...(p.domain_of_application ?? []),
        ].join(" ").toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      // Chip filters (OR within a category, AND across categories)
      if (activeInterest.length && !activeInterest.some(v => p.domain_of_interest?.includes(v)))    return false;
      if (activeApp.length      && !activeApp.some(v      => p.domain_of_application?.includes(v))) return false;
      if (activeRdia.length     && !activeRdia.some(v     => p.rdia_priority?.includes(v)))         return false;
      if (activeYear.length     && !activeYear.includes(p.academic_year))                           return false;
      return true;
    });
  }, [projects, query, activeInterest, activeApp, activeRdia, activeYear]);

  // ── Chip toggle ────────────────────────────────────────────────────────────

  function toggleChip(list: string[], setList: (v: string[]) => void, val: string) {
    setList(list.includes(val) ? list.filter(v => v !== val) : [...list, val]);
  }

  const hasActiveFilters =
    activeInterest.length || activeApp.length || activeRdia.length || activeYear.length;

  function clearFilters() {
    setActiveInterest([]); setActiveApp([]); setActiveRdia([]); setActiveYear([]);
  }

  // ── Render: loading / error ────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-indigo-600 mx-auto mb-3" />
          <p className="text-gray-500">Loading projects…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 max-w-2xl mx-auto">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="py-10 text-center">
            <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
            <p className="text-gray-700 font-medium">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-full overflow-hidden">

      {/* ── Project list panel ── */}
      <div
        className={`flex flex-col flex-1 overflow-hidden transition-all duration-300 ${
          selected ? "md:w-1/2 lg:w-3/5" : "w-full"
        }`}
      >
        {/* Header */}
        <div className="p-6 pb-4 border-b bg-white">
          <h1 className="text-2xl font-bold text-gray-900 mb-1 flex items-center gap-2">
            <FileText className="w-6 h-6 text-indigo-600" />
            Browse Projects
          </h1>
          <p className="text-gray-500 text-sm">
            {projects.length} projects available — {filtered.length} shown
          </p>
        </div>

        {/* Search + filter bar */}
        <div className="px-6 py-3 border-b bg-white space-y-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search by title, keyword, supervisor, abstract…"
              value={query}
              onChange={e => setQuery(e.target.value)}
              className="pl-9 pr-9"
            />
            {query && (
              <button className="absolute right-3 top-1/2 -translate-y-1/2" onClick={() => setQuery("")}>
                <X className="w-4 h-4 text-gray-400 hover:text-gray-600" />
              </button>
            )}
          </div>

          {/* Filter toggle */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setShowFilters(s => !s)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                showFilters ? "bg-indigo-50 border-indigo-300 text-indigo-700" : "bg-white border-gray-200 text-gray-600 hover:border-indigo-300"
              }`}
            >
              <Filter className="w-3.5 h-3.5" />
              Filters
              {hasActiveFilters ? (
                <span className="bg-indigo-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-xs">
                  {Number(activeInterest.length > 0) + Number(activeApp.length > 0) + Number(activeRdia.length > 0) + Number(activeYear.length > 0)}
                </span>
              ) : null}
            </button>

            {/* Active filter chips */}
            {[...activeInterest, ...activeApp, ...activeRdia, ...activeYear].map(chip => (
              <span key={chip} className="flex items-center gap-1 px-2 py-1 bg-indigo-100 text-indigo-800 text-xs rounded-full">
                {chip}
                <button onClick={() => {
                  if (activeInterest.includes(chip)) toggleChip(activeInterest, setActiveInterest, chip);
                  else if (activeApp.includes(chip)) toggleChip(activeApp, setActiveApp, chip);
                  else if (activeRdia.includes(chip)) toggleChip(activeRdia, setActiveRdia, chip);
                  else if (activeYear.includes(chip)) toggleChip(activeYear, setActiveYear, chip);
                }}>
                  <X className="w-2.5 h-2.5 ml-0.5" />
                </button>
              </span>
            ))}

            {hasActiveFilters && (
              <button onClick={clearFilters} className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1">
                <X className="w-3 h-3" /> Clear all
              </button>
            )}
          </div>

          {/* Filter panel */}
          {showFilters && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2 border-t border-gray-100">
              {[
                { label: "Year",        opts: allYears,     active: activeYear,     set: setActiveYear     },
                { label: "Interest",    opts: allInterests, active: activeInterest, set: setActiveInterest },
                { label: "Application", opts: allApps,      active: activeApp,      set: setActiveApp      },
                { label: "RDIA",        opts: allRdia,      active: activeRdia,     set: setActiveRdia     },
              ].map(({ label, opts, active, set }) => (
                <div key={label}>
                  <p className="text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">{label}</p>
                  <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
                    {opts.map(opt => (
                      <button
                        key={opt}
                        onClick={() => toggleChip(active, set, opt)}
                        className={`px-2 py-0.5 rounded-full text-xs border transition-all ${
                          active.includes(opt)
                            ? "bg-indigo-600 text-white border-indigo-600"
                            : "bg-white text-gray-600 border-gray-200 hover:border-indigo-400"
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Project grid */}
        <div className="flex-1 overflow-y-auto p-6">
          {filtered.length === 0 ? (
            <div className="text-center py-20">
              <Search className="w-10 h-10 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-400">No projects match your search.</p>
              {(query || hasActiveFilters) && (
                <button onClick={() => { setQuery(""); clearFilters(); }}
                  className="mt-3 text-sm text-indigo-500 hover:text-indigo-700 underline">
                  Clear search & filters
                </button>
              )}
            </div>
          ) : (
            <div className={`grid gap-4 ${selected ? "grid-cols-1 lg:grid-cols-2" : "grid-cols-1 md:grid-cols-2 xl:grid-cols-3"}`}>
              {filtered.map(project => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  query={query}
                  isSelected={selected?.id === project.id}
                  onClick={() => setSelected(p => p?.id === project.id ? null : project)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Detail panel ── */}
      {selected && (
        <ProjectDetailPanel
          project={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}

// ── Project card ──────────────────────────────────────────────────────────────

function ProjectCard({
  project, query, isSelected, onClick,
}: {
  project: Project;
  query: string;
  isSelected: boolean;
  onClick: () => void;
}) {
  const abstract = project.abstract ?? "";
  const preview  = abstract.length > 120 ? abstract.slice(0, 120) + "…" : abstract;

  return (
    <div
      onClick={onClick}
      className={`cursor-pointer rounded-xl border p-4 transition-all hover:shadow-md ${
        isSelected
          ? "border-indigo-400 bg-indigo-50 ring-1 ring-indigo-300"
          : "border-gray-200 bg-white hover:border-indigo-200"
      }`}
    >
      {/* Title */}
      <h3 className="text-sm font-semibold text-gray-900 leading-snug mb-2 line-clamp-2">
        <Highlight text={project.title} query={query} />
      </h3>

      {/* Meta */}
      <div className="flex items-center gap-3 text-xs text-gray-500 mb-3">
        <span className="flex items-center gap-1">
          <User className="w-3 h-3" />
          <span className="truncate max-w-28">{project.supervisor || "—"}</span>
        </span>
        <span className="flex items-center gap-1">
          <Calendar className="w-3 h-3" />
          {project.academic_year}
          {project.semester ? ` · ${semesterLabel(project.semester)}` : ""}
        </span>
      </div>

      {/* Abstract preview */}
      {preview && (
        <p className="text-xs text-gray-500 leading-relaxed mb-3 line-clamp-3">{preview}</p>
      )}

      {/* Domain badges */}
      <div className="flex flex-wrap gap-1 mb-2">
        {(project.domain_of_interest ?? []).slice(0, 2).map(i => (
          <Badge key={i} variant="secondary" className="text-xs py-0">{i}</Badge>
        ))}
        {(project.domain_of_application ?? []).slice(0, 1).map(a => (
          <Badge key={a} variant="outline" className="text-xs py-0">{a}</Badge>
        ))}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between mt-2">
        {(project.rdia_priority ?? []).slice(0, 1).map(r => (
          <Badge key={r} className="text-xs bg-amber-100 text-amber-700 py-0">{r}</Badge>
        ))}
        <span className="ml-auto flex items-center gap-1 text-xs text-indigo-500 font-medium">
          View details <ChevronRight className="w-3 h-3" />
        </span>
      </div>
    </div>
  );
}

// ── Detail panel ──────────────────────────────────────────────────────────────

function ProjectDetailPanel({ project, onClose }: { project: Project; onClose: () => void }) {
  const [showFullAbstract,    setShowFullAbstract]    = useState(false);
  const [showFullFutureWork,  setShowFullFutureWork]  = useState(false);

  const abstract   = project.abstract    ?? "";
  const futureWork = project.future_work ?? "";

  return (
    <div className="w-full md:w-1/2 lg:w-2/5 border-l border-gray-200 bg-white flex flex-col overflow-hidden">
      {/* Detail header */}
      <div className="flex items-center justify-between px-6 py-4 border-b bg-gradient-to-r from-indigo-50 to-purple-50">
        <h2 className="font-semibold text-gray-800 text-sm flex items-center gap-2">
          <FileText className="w-4 h-4 text-indigo-600" />
          Project Details
        </h2>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-white/70 transition-colors"
        >
          <ChevronLeft className="w-5 h-5 text-gray-500" />
        </button>
      </div>

      {/* Detail body */}
      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

        {/* Title */}
        <div>
          <h3 className="text-lg font-bold text-gray-900 leading-snug">
            {project.title}
          </h3>
          <div className="flex flex-wrap gap-3 mt-2 text-sm text-gray-500">
            <span className="flex items-center gap-1.5">
              <User className="w-4 h-4 text-indigo-400" />
              {project.supervisor || "Supervisor not specified"}
            </span>
            <span className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-indigo-400" />
              {project.academic_year}
              {project.semester ? ` · ${semesterLabel(project.semester)} Semester` : ""}
            </span>
          </div>
        </div>

        <Divider />

        {/* Abstract */}
        {abstract && (
          <Section icon={<BookOpen className="w-4 h-4 text-indigo-500" />} title="Abstract">
            <p className="text-sm text-gray-600 leading-relaxed">
              {showFullAbstract || abstract.length <= 300
                ? abstract
                : abstract.slice(0, 300) + "…"}
            </p>
            {abstract.length > 300 && (
              <button
                onClick={() => setShowFullAbstract(v => !v)}
                className="text-xs text-indigo-500 hover:text-indigo-700 mt-1 underline"
              >
                {showFullAbstract ? "Show less" : "Read more"}
              </button>
            )}
          </Section>
        )}

        {/* Future work */}
        {futureWork && (
          <Section icon={<TrendingUp className="w-4 h-4 text-emerald-500" />} title="Future Work">
            <p className="text-sm text-gray-600 leading-relaxed">
              {showFullFutureWork || futureWork.length <= 250
                ? futureWork
                : futureWork.slice(0, 250) + "…"}
            </p>
            {futureWork.length > 250 && (
              <button
                onClick={() => setShowFullFutureWork(v => !v)}
                className="text-xs text-indigo-500 hover:text-indigo-700 mt-1 underline"
              >
                {showFullFutureWork ? "Show less" : "Read more"}
              </button>
            )}
          </Section>
        )}

        <Divider />

        {/* Domain of interest */}
        {(project.domain_of_interest ?? []).length > 0 && (
          <Section icon={<Lightbulb className="w-4 h-4 text-purple-500" />} title="Domain of Interest">
            <div className="flex flex-wrap gap-1.5">
              {project.domain_of_interest.map(i => (
                <Badge key={i} variant="secondary" className="text-xs">{i}</Badge>
              ))}
            </div>
          </Section>
        )}

        {/* Domain of application */}
        {(project.domain_of_application ?? []).length > 0 && (
          <Section icon={<Target className="w-4 h-4 text-blue-500" />} title="Domain of Application">
            <div className="flex flex-wrap gap-1.5">
              {project.domain_of_application.map(a => (
                <Badge key={a} variant="outline" className="text-xs">{a}</Badge>
              ))}
            </div>
          </Section>
        )}

        {/* RDIA priority */}
        {(project.rdia_priority ?? []).length > 0 && (
          <Section icon={<Target className="w-4 h-4 text-amber-500" />} title="National Priority (RDIA)">
            <div className="flex flex-wrap gap-1.5">
              {project.rdia_priority.map(r => (
                <Badge key={r} className="text-xs bg-amber-100 text-amber-700">{r}</Badge>
              ))}
            </div>
          </Section>
        )}

        {/* Keywords */}
        {(project.keywords ?? []).length > 0 && (
          <Section icon={<Tag className="w-4 h-4 text-gray-400" />} title="Keywords">
            <div className="flex flex-wrap gap-1.5">
              {project.keywords.map(k => (
                <Badge key={k} variant="outline" className="text-xs bg-gray-50">{k}</Badge>
              ))}
            </div>
          </Section>
        )}
      </div>
    </div>
  );
}

// ── Tiny helpers ──────────────────────────────────────────────────────────────

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
        {icon}
        {title}
      </h4>
      {children}
    </div>
  );
}

function Divider() {
  return <hr className="border-gray-100" />;
}
