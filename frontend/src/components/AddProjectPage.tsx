// frontend/src/components/AddProjectPage.tsx
/**
 * Add Project Page — Faculty only.
 * Allows faculty to submit a new project to the system (data/projects + embeddings index).
 * The added project ID is stored in the faculty user's added_projects list in the DB.
 */

import { useState, useEffect } from "react";
import { Plus, Trash2, CheckCircle2, Loader2, X } from "lucide-react";
import { Button }   from "./ui/button";
import { Input }    from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import api from "../services/api";

// ── Static domain data (mirrors backend data files) ──────────────────────────

const INTEREST_DOMAINS = [
  "Artificial Intelligence / Machine Learning","Web Development","Mobile Development",
  "Cybersecurity","Internet of Things (IoT)","Data Science","Cloud Computing","Blockchain",
  "Computer Vision","Natural Language Processing","Robotics","Game Development","DevOps",
  "Database Systems","Network Systems","Embedded Systems","Software Engineering",
  "Human-Computer Interaction","Distributed Systems","Computer Graphics","Bioinformatics","Drones",
];

const APPLICATION_DOMAINS = [
  "Education","Healthcare / Medical","Business & Productivity","Security & Privacy",
  "Sustainability & Environment","Social Good & Community","Entertainment & Media",
  "Government & Public Sector","Transportation & Mobility","Finance & Economics",
  "Agriculture & Food","Smart Cities","Tourism & Culture","Sports & Fitness",
  "Legal & Compliance","Real Estate","Manufacturing & Industry","Retail & E-Commerce",
  "Human Resources","Communication & Collaboration",
];

const RDIA_OPTIONS = [
  "Health & Wellness",
  "Sustainable Environment & Supply of Essential Needs",
  "Energy & Industrial Leadership",
  "Economies of the Future",
];

const SEMESTERS = ["10", "20"] as const;

// ── Form state type ───────────────────────────────────────────────────────────

interface FormState {
  projectId:       string;
  title:           string;
  supervisorName:  string;
  supervisorId:    string;
  academicYear:    string;
  semester:        string;
  abstract:        string;
  problem:         string;
  aim:             string;
  results:         string;
  futureWork:      string;
  keywords:        string[];
  interests:       string[];   // 1–3
  applications:    string[];   // 1–3
  rdia:            string;     // exactly 1
  acm:             string[];   // any number
}

const EMPTY_FORM: FormState = {
  projectId: "", title: "", supervisorName: "", supervisorId: "", academicYear: "", semester: "20",
  abstract: "", problem: "", aim: "", results: "", futureWork: "",
  keywords: [""], interests: [], applications: [], rdia: "", acm: [],
};

// ── ACM taxonomy (flat list of ids) fetched from backend ─────────────────────

interface AcmNode {
  id:   string;
  path: string[];   // e.g. ["Computing Methodologies", "ARTIFICIAL INTELLIGENCE", "Learning"]
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function AddProjectPage() {
  const [form,      setForm]      = useState<FormState>(EMPTY_FORM);
  const [acmList,    setAcmList]    = useState<AcmNode[]>([]);
  const [submitting,  setSubmitting]  = useState(false);
  const [success,    setSuccess]    = useState(false);
  const [addedId,    setAddedId]    = useState("");
  const [error,      setError]      = useState("");
  const [idError,    setIdError]    = useState("");
  const [idChecking, setIdChecking] = useState(false);
  const [idAvailable, setIdAvailable] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [acknowledgedNoDelete, setAcknowledgedNoDelete] = useState(false);
  const [ackError, setAckError] = useState(false);

  // Fetch ACM flat list once
  useEffect(() => {
    api.get("/domains/acm")
      .then(r => setAcmList(r.data))
      .catch(() => setAcmList([]));
  }, []);

  // Check project ID availability on blur
  const checkIdExists = async (id: string) => {
    if (!id.trim()) { setIdError(""); setIdAvailable(false); return; }
    setIdChecking(true);
    setIdError("");
    setIdAvailable(false);
    try {
      const res = await api.get(`/projects/check-id/${encodeURIComponent(id.trim())}`);
      if (res.data.exists) {
        setIdError(`Project ID "${id.trim()}" already exists. Please choose a different one.`);
        setIdAvailable(false);
      } else {
        setIdError("");
        setIdAvailable(true);
      }
    } catch {
      setIdAvailable(false);
    } finally {
      setIdChecking(false);
    }
  };

  const set = (k: keyof FormState, v: any) => setForm(f => ({ ...f, [k]: v }));

  const toggleArr = (k: "interests" | "applications" | "acm", val: string, max?: number) => {
    setForm(f => {
      const arr = f[k] as string[];
      if (arr.includes(val)) return { ...f, [k]: arr.filter(x => x !== val) };
      if (max && arr.length >= max) return f;       // enforce max
      return { ...f, [k]: [...arr, val] };
    });
  };

  const setKeyword = (i: number, v: string) =>
    setForm(f => { const kw = [...f.keywords]; kw[i] = v; return { ...f, keywords: kw }; });

  const addKeyword    = () => setForm(f => ({ ...f, keywords: [...f.keywords, ""] }));
  const removeKeyword = (i: number) =>
    setForm(f => ({ ...f, keywords: f.keywords.filter((_, j) => j !== i) }));

  // ── Validation ───────────────────────────────────────────────────────────────

  const validate = (): string | null => {
    if (!form.projectId.trim())      return "Project ID is required.";
    if (idError)                     return idError;
    if (!form.title.trim())          return "Title is required.";
    if (!form.supervisorName.trim()) return "Supervisor name is required.";
    if (!form.supervisorId.trim())   return "Supervisor ID is required.";
    if (!form.academicYear.trim())   return "Academic year is required.";
    if (!form.abstract.trim())       return "Abstract is required.";
    if (!form.problem.trim())        return "Problem statement is required.";
    if (!form.aim.trim())            return "Project aim is required.";
    if (!form.results.trim())        return "Results / conclusion is required.";
    if (form.keywords.every(k => !k.trim())) return "At least one keyword is required.";
    if (form.interests.length < 1)   return "Select at least 1 interest domain.";
    if (form.interests.length > 3)   return "Select at most 3 interest domains.";
    if (form.applications.length < 1) return "Select at least 1 application domain.";
    if (form.applications.length > 3) return "Select at most 3 application domains.";
    if (!form.rdia)                  return "Select an RDIA priority.";
    if (form.acm.length < 1)         return "Select at least one ACM classification.";
    return null;
  };

  // ── Submit ───────────────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    setShowConfirm(false);
    setSubmitting(true);
    setError("");
    try {
      const payload = {
        project_id:      form.projectId.trim(),
        title:           form.title.trim(),
        supervisor_name: form.supervisorName.trim(),
        supervisor_id:   form.supervisorId.trim(),
        academic_year:   form.academicYear.trim(),
        semester:        form.semester,
        abstract:        form.abstract.trim(),
        keywords:        form.keywords.map(k => k.trim()).filter(Boolean),
        introduction: {
          problem: form.problem.trim(),
          aim:     form.aim.trim(),
          objectives: [],
        },
        conclusion: {
          results:     form.results.trim(),
          future_work: form.futureWork.trim(),
        },
        classification: {
          application: form.applications,
          interest:    form.interests,
          acm:         form.acm,
          rdia:        [form.rdia],
        },
      };

      const res = await api.post("/projects/add", payload);
      setAddedId(res.data.project_id);
      setSuccess(true);
      setForm(EMPTY_FORM);
    } catch (e: any) {
      setError(e?.response?.data?.error || "Failed to add project. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddClick = async () => {
    // ── 1. Basic field validation (sync) ─────────────────────────────────
    const err = validate();
    if (err) { setError(err); return; }

    // ── 2. Live check: does this project ID already exist? ────────────────
    const pid = form.projectId.trim();
    setIdChecking(true);
    try {
      const res = await api.get(`/projects/check-id/${encodeURIComponent(pid)}`);
      if (res.data.exists) {
        const msg = `Project ID "${pid}" already exists in the system. Please use a different ID.`;
        setIdError(msg);
        setIdAvailable(false);
        setError(msg);
        setIdChecking(false);
        return;
      }
      setIdError("");
      setIdAvailable(true);
    } catch {
      // Network error — let the backend reject on actual submit if needed
    } finally {
      setIdChecking(false);
    }

    setError("");
    setAcknowledgedNoDelete(false);
    setAckError(false);
    setShowConfirm(true);
  };

  // ── Render ───────────────────────────────────────────────────────────────────

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-6 text-center px-6">
        <CheckCircle2 className="w-16 h-16 text-green-500" />
        <h2 className="text-2xl font-bold text-gray-800">Project Added Successfully!</h2>
        <p className="text-gray-500">
          Project <span className="font-mono font-semibold text-indigo-600">{addedId}</span> has been
          added to the system and is now part of the recommendation and trend engines.
        </p>
        <Button
          className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white"
          onClick={() => { setSuccess(false); setAddedId(""); }}
        >
          Add Another Project
        </Button>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
          Add New Project
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          Fill in all fields to add a project to the recommendation and trend system.
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm flex items-start gap-2">
          <X className="w-4 h-4 mt-0.5 shrink-0" />
          {error}
        </div>
      )}

      {/* ── Basic Info ── */}
      <Section title="Basic Information">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

          {/* Project ID with info tooltip */}
          <div className="sm:col-span-2">
            <div className="flex items-center gap-2 mb-1">
              <label className="text-sm font-medium text-gray-700">Project ID *</label>
              <div className="relative group">
                <div className="w-4 h-4 rounded-full bg-indigo-100 border border-indigo-300 flex items-center justify-center cursor-help text-indigo-600 text-[10px] font-bold select-none">
                  i
                </div>
                <div className="absolute left-6 top-1/2 -translate-y-1/2 z-20 hidden group-hover:block w-72 bg-gray-900 text-white text-xs rounded-lg px-3 py-2.5 shadow-xl">
                  <p className="font-semibold mb-1 text-indigo-300">ID Format:</p>
                  <p className="font-mono text-yellow-300 text-sm mb-1.5">F29-47-20</p>
                  <div className="space-y-0.5 text-gray-300">
                    <p><span className="text-white font-semibold">F</span> — Female group &nbsp;|&nbsp; <span className="text-white font-semibold">M</span> — Male group</p>
                    <p><span className="text-white font-semibold">29</span> — Group number</p>
                    <p><span className="text-white font-semibold">47</span> — Academic year (e.g. 1447)</p>
                    <p><span className="text-white font-semibold">20</span> — Semester &nbsp;(10 = First, 20 = Second)</p>
                  </div>
                  <div className="mt-2 pt-2 border-t border-gray-700 text-gray-400">
                    Example: <span className="text-yellow-300 font-mono">F29-47-20</span> = Female group 29, year 1447, second semester
                  </div>
                </div>
              </div>
            </div>
            <Input
              placeholder="e.g. F29-47-20"
              value={form.projectId}
              onChange={e => { set("projectId", e.target.value); setIdError(""); setIdAvailable(false); }}
              onBlur={e => checkIdExists(e.target.value)}
              className={`text-sm font-mono ${idError ? "border-red-400 focus:ring-red-400" : ""}`}
            />
            {/* Status messages below the field */}
            {idChecking && (
              <p className="mt-1 text-xs text-gray-400 flex items-center gap-1">
                <Loader2 className="w-3 h-3 animate-spin" /> Checking availability...
              </p>
            )}
            {!idChecking && idError && (
              <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                <X className="w-3 h-3 shrink-0" /> {idError}
              </p>
            )}
            {!idChecking && idAvailable && !idError && (
              <p className="mt-1 text-xs text-green-600 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 shrink-0" /> ID is available
              </p>
            )}
          </div>


          <LabeledInput label="Project Title *" placeholder="e.g. Mu'een: An AI-beasd Recommender System for Graduation Projects Selection and Exploration"
            value={form.title} onChange={v => set("title", v)} className="sm:col-span-2" />
          <LabeledInput label="Supervisor Name *" placeholder="e.g. Waad Mohammed Alhoshan"
            value={form.supervisorName} onChange={v => set("supervisorName", v)} />
          <LabeledInput label="Supervisor ID *" placeholder="e.g. WMho"
            value={form.supervisorId} onChange={v => set("supervisorId", v)} />
          <LabeledInput label="Academic Year *" placeholder="e.g. 1447"
            value={form.academicYear} onChange={v => set("academicYear", v)} />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Semester *</label>
            <select
              value={form.semester}
              onChange={e => set("semester", e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            >
              <option value="10">First Semester </option>
              <option value="20">Second Semester </option>
            </select>
          </div>
        </div>
      </Section>

      {/* ── Keywords ── */}
      <Section title="Keywords">
        <p className="text-xs text-gray-500 mb-3">Add one keyword per field. Click + to add more.</p>
        <div className="space-y-2">
          {form.keywords.map((kw, i) => (
            <div key={i} className="flex gap-2 items-center">
              <Input
                placeholder={`Keyword ${i + 1}`}
                value={kw}
                onChange={e => setKeyword(i, e.target.value)}
                className="flex-1 text-sm"
              />
              {form.keywords.length > 1 && (
                <button onClick={() => removeKeyword(i)}
                  className="text-red-400 hover:text-red-600 transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>
        <Button variant="outline" size="sm" className="mt-3 text-indigo-600 border-indigo-300 hover:bg-indigo-50"
          onClick={addKeyword}>
          <Plus className="w-4 h-4 mr-1" /> Add Keyword
        </Button>
      </Section>

      {/* ── Abstract ── */}
      <Section title="Abstract *">
        <Textarea
          placeholder="Write a concise summary of the project..."
          value={form.abstract}
          onChange={e => set("abstract", e.target.value)}
          rows={5}
          className="text-sm"
        />
      </Section>

      {/* ── Introduction ── */}
      <Section title="Introduction">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Problem Statement *</label>
            <Textarea placeholder="Describe the problem this project solves..."
              value={form.problem} onChange={e => set("problem", e.target.value)} rows={3} className="text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Project Aim *</label>
            <Textarea placeholder="State the main aim of the project..."
              value={form.aim} onChange={e => set("aim", e.target.value)} rows={2} className="text-sm" />
          </div>
        </div>
      </Section>

      {/* ── Conclusion ── */}
      <Section title="Conclusion">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Results *</label>
            <Textarea placeholder="Summarize the main results and contributions..."
              value={form.results} onChange={e => set("results", e.target.value)} rows={3} className="text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Future Work</label>
            <Textarea placeholder="Describe possible future directions..."
              value={form.futureWork} onChange={e => set("futureWork", e.target.value)} rows={2} className="text-sm" />
          </div>
        </div>
      </Section>

      {/* ── Classification: Interest ── */}
      <Section title="Interest Domains (1–3 required)">
        <p className="text-xs text-gray-500 mb-3">
          Selected: <span className="font-semibold text-indigo-600">{form.interests.length}/3</span>
        </p>
        <div className="flex flex-wrap gap-2">
          {INTEREST_DOMAINS.map(d => {
            const sel = form.interests.includes(d);
            const disabled = !sel && form.interests.length >= 3;
            return (
              <button key={d}
                onClick={() => !disabled && toggleArr("interests", d, 3)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                  sel
                    ? "bg-indigo-600 text-white border-indigo-600"
                    : disabled
                      ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed"
                      : "bg-white text-gray-700 border-gray-300 hover:border-indigo-400 hover:text-indigo-600"
                }`}
              >
                {d}
              </button>
            );
          })}
        </div>
      </Section>

      {/* ── Classification: Application ── */}
      <Section title="Application Domains (1–3 required)">
        <p className="text-xs text-gray-500 mb-3">
          Selected: <span className="font-semibold text-purple-600">{form.applications.length}/3</span>
        </p>
        <div className="flex flex-wrap gap-2">
          {APPLICATION_DOMAINS.map(d => {
            const sel = form.applications.includes(d);
            const disabled = !sel && form.applications.length >= 3;
            return (
              <button key={d}
                onClick={() => !disabled && toggleArr("applications", d, 3)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                  sel
                    ? "bg-purple-600 text-white border-purple-600"
                    : disabled
                      ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed"
                      : "bg-white text-gray-700 border-gray-300 hover:border-purple-400 hover:text-purple-600"
                }`}
              >
                {d}
              </button>
            );
          })}
        </div>
      </Section>

      {/* ── Classification: RDIA ── */}
      <Section title="RDIA Priority (select one)">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {RDIA_OPTIONS.map(r => (
            <label key={r} className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
              form.rdia === r ? "border-emerald-500 bg-emerald-50" : "border-gray-200 hover:border-emerald-300"
            }`}>
              <input type="radio" name="rdia" value={r} checked={form.rdia === r}
                onChange={() => set("rdia", r)} className="mt-0.5 accent-emerald-600" />
              <span className="text-sm font-medium text-gray-800">{r}</span>
            </label>
          ))}
        </div>
      </Section>

      {/* ── Classification: ACM ── */}
      <Section title="ACM Classification (select all that apply)">
        <p className="text-xs text-gray-500 mb-3">
          Selected: <span className="font-semibold text-blue-600">{form.acm.length}</span> code{form.acm.length !== 1 ? "s" : ""}
        </p>
        {acmList.length === 0 ? (
          <p className="text-sm text-gray-400 italic">Loading ACM taxonomy…</p>
        ) : (
          <div className="max-h-72 overflow-y-auto border border-gray-200 rounded-lg bg-gray-50 divide-y divide-gray-100">
            {acmList.map(entry => {
              const sel = form.acm.includes(entry.id);
              // path = ["Grandparent", "Parent", "Leaf"]
              const ancestors = entry.path.slice(0, -1);   // all but last
              const leafName  = entry.path[entry.path.length - 1];
              return (
                <label
                  key={entry.id}
                  className={`flex items-start gap-2.5 px-3 py-2 cursor-pointer transition-colors ${
                    sel ? "bg-blue-50" : "hover:bg-white"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={sel}
                    onChange={() => toggleArr("acm", entry.id)}
                    className="accent-blue-600 shrink-0 mt-0.5"
                  />
                  <span className="text-xs leading-relaxed">
                    {/* Breadcrumb ancestors in muted colour */}
                    {ancestors.length > 0 && (
                      <span className="text-gray-400">
                        {ancestors.join(" › ")}{" › "}
                      </span>
                    )}
                    {/* Leaf name in dark */}
                    <span className={sel ? "text-blue-700 font-semibold" : "text-gray-700 font-medium"}>
                      {leafName}
                    </span>
                    {/* ID badge */}
                    <span className="ml-1.5 font-mono text-[10px] text-blue-500 bg-blue-50 border border-blue-200 rounded px-1 py-0.5">
                      {entry.id}
                    </span>
                  </span>
                </label>
              );
            })}
          </div>
        )}
      </Section>

      {/* ── Submit ── */}
      <div className="pt-2">
        <Button
          onClick={handleAddClick}
          disabled={submitting}
          className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3 text-base font-semibold hover:opacity-90 transition-opacity"
        >
          {submitting ? (
            <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Adding Project…</>
          ) : (
            "Add Project"
          )}
        </Button>
      </div>

      {/* ── Confirm Modal ── */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-800">Confirm Project Submission</h3>
                <p className="text-sm text-gray-500">Please review the details before adding.</p>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 text-sm space-y-2 border border-gray-100">
              <Row label="Project ID"  value={form.projectId} />
              <Row label="Title"       value={form.title} />
              <Row label="Supervisor"  value={`${form.supervisorName} (${form.supervisorId})`} />
              <Row label="Year / Sem"  value={`${form.academicYear} / ${form.semester === "10" ? "First" : "Second"}`} />
              <Row label="Interests"   value={form.interests.join(", ")} />
              <Row label="Applications" value={form.applications.join(", ")} />
              <Row label="RDIA"        value={form.rdia} />
              <Row label="ACM codes"   value={form.acm.join(", ")} />
            </div>

          

            {/* ── Acknowledgement checkbox ── */}
            <div className="space-y-1">
              <label className="flex items-start gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={acknowledgedNoDelete}
                  onChange={e => {
                    setAcknowledgedNoDelete(e.target.checked);
                    if (e.target.checked) setAckError(false);
                  }}
                  className="mt-0.5 h-4 w-4 rounded border-gray-300 accent-indigo-600 cursor-pointer"
                />
                <span className="text-xs text-gray-500">
                  I understand that once this project is added, it will be integrated into the recommender and trend analysis and <span className="font-semibold text-gray-700">cannot be deleted or modified</span>.
                </span>
              </label>
              {ackError && (
                <p className="text-xs text-red-500 pl-6">
                  You must acknowledge this before proceeding.
                </p>
              )}
            </div>

            <div className="flex gap-3 pt-1">
              <Button variant="outline" className="flex-1" onClick={() => setShowConfirm(false)}>
                Cancel
              </Button>
              <Button
                className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 text-white"
                onClick={() => {
                  if (!acknowledgedNoDelete) {
                    setAckError(true);
                    return;
                  }
                  handleSubmit();
                }}
              >
                Confirm &amp; Add
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card style={{ border: "1px solid rgba(139,92,246,0.15)" }}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold text-gray-700">{title}</CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function LabeledInput({
  label, placeholder, value, onChange, className = "",
}: { label: string; placeholder: string; value: string; onChange: (v: string) => void; className?: string }) {
  return (
    <div className={className}>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <Input placeholder={placeholder} value={value}
        onChange={e => onChange(e.target.value)} className="text-sm" />
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col sm:flex-row sm:gap-2">
      <span className="text-gray-500 sm:w-28 sm:shrink-0 font-medium">{label}:</span>
      <span className="text-gray-800 font-medium break-words">{value || "—"}</span>
    </div>
  );
}
