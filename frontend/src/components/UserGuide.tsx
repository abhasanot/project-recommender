// frontend/src/components/UserGuide.tsx
/**
 * User Guide — sidebar panel accessible from any dashboard.
 *
 * Provides concise, role-appropriate guidance for:
 *   - Students
 *   - Project Committee (Faculty)
 *
 * Rendered as a slide-in panel triggered by a "User Guide" button
 * in the sidebar footer, consistent with existing UI/UX patterns.
 */

import { useState } from 'react';
import { X, BookOpen, ChevronDown, ChevronRight } from 'lucide-react';

// ── Section data ─────────────────────────────────────────────────────────────

interface GuideSection {
  title: string;
  items: string[];
}

const STUDENT_SECTIONS: GuideSection[] = [
  {
    title: 'Getting Started',
    items: [
      'Log in with your student account credentials.',
      'Complete your profile by selecting your interest domains and application domains. A complete profile improves recommendation accuracy.',
      'Navigate using the sidebar menu on the left.',
    ],
  },
  {
    title: 'My Profile',
    items: [
      'Add your academic interests and preferred application domains.',
      'Your profile data is used to personalise project recommendations for your group.',
      'Keep your profile updated to reflect your current interests.',
    ],
  },
  {
    title: 'My Group',
    items: [
      'Create or join a project group with your team members.',
      'One member must be assigned as the group leader.',
      'Once all members have joined, the group leader can finalise the group. Finalization is required before recommendations can be generated.',
    ],
  },
  {
    title: 'Recommendations',
    items: [
      'Recommendations are generated after your group is finalised.',
      'The system combines the interests and domains of all group members to suggest the most suitable projects.',
      'Review each recommended project and discuss it with your group.',
    ],
  },
    {
    title: 'Trend Analysis',
    items: [
      'The Trend Analysis page shows how project domains have changed over time.',
      'Use the Timeline tab to see how interest in specific domains has grown or declined across semesters.',
      'Hover over the growth rate percentage next to any domain name to see a plain-language explanation of how it was calculated.',
      'Use filters at the top to narrow the analysis to specific years, semesters, or domains.',
    ],
  },
  {
    title: 'Group Settings',
    items: [
      'The group leader can adjust recommendation weights from the Group Settings page.',
      'Changing the weights affects how strongly each domain dimension influences your recommendations.',
    ],
  },
];

const COMMITTEE_SECTIONS: GuideSection[] = [
  {
    title: 'Getting Started',
    items: [
      'Log in with your faculty account credentials.',
      'The system defaults to the Browse Projects view on login.',
      'Use the sidebar to switch between Browse Projects, Trend Analysis, and Add Project.',
    ],
  },
  {
    title: 'Browse Projects',
    items: [
      'Browse and search the full project catalogue.',
      'Use the search bar to find projects by title, keywords, supervisor, or abstract text.',
      'Apply filter chips to narrow results by interest domain, application domain, RDIA priority, year, and semester.',
      'Click any project card to open a detailed panel showing the full abstract, keywords, supervisor, and classification tags.',
    ],
  },
  {
    title: 'Add Project',
    items: [
      'Use the Add Project page to register new graduation projects in the system.',
      'Fill in all required fields: title, abstract, supervisor, academic year, semester, and classification tags.',
      'Projects added here become immediately available for student recommendations and browse views.',
    ],
  },
  {
    title: 'Trend Analysis',
    items: [
      'The Trend Analysis page provides a full analytical view of project domain patterns over time.',
      'The Timeline tab shows growth and decline of domains across semesters.',
      'Hover over the growth rate indicator next to any domain to see how the percentage was derived from actual project counts.',
      'The Distribution tab shows the proportional share of each category.',
      'The Frequency tab ranks categories by total project count.',
      'Use the filter panel to scope the analysis to specific years, semesters, or domain categories.',
    ],
  },
];

// ── Accordion section ─────────────────────────────────────────────────────────

function AccordionSection({ section }: { section: GuideSection }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-gray-100 rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-3 py-2.5 text-left bg-white hover:bg-gray-50 transition-colors"
      >
        <span className="text-xs font-semibold text-gray-700">{section.title}</span>
        {open
          ? <ChevronDown className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
          : <ChevronRight className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
        }
      </button>
      {open && (
        <ul className="px-3 pb-3 pt-1 space-y-1.5 bg-gray-50 border-t border-gray-100">
          {section.items.map((item, i) => (
            <li key={i} className="flex items-start gap-2 text-xs text-gray-600 leading-relaxed">
              <span className="mt-1.5 w-1 h-1 rounded-full bg-violet-400 flex-shrink-0" />
              {item}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface UserGuideProps {
  role: 'student' | 'faculty';
}

export default function UserGuide({ role }: UserGuideProps) {
  const [open, setOpen] = useState(false);
  const [tab,  setTab]  = useState<'student' | 'committee'>(
    role === 'faculty' ? 'committee' : 'student'
  );

  const sections = tab === 'committee' ? COMMITTEE_SECTIONS : STUDENT_SECTIONS;

  return (
    <>
      {/* Trigger button — sits in sidebar footer, styled like existing controls */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-500 hover:text-violet-600 hover:bg-violet-50 rounded-lg border border-gray-200 transition-all"
      >
        <BookOpen className="w-3.5 h-3.5" />
        User Guide
      </button>

      {/* Slide-in panel overlay */}
      {open && (
        <div className="fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/30"
            onClick={() => setOpen(false)}
          />

          {/* Panel */}
          <div className="relative ml-auto w-80 h-full bg-white shadow-2xl flex flex-col overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gradient-to-r from-indigo-50 to-purple-50">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-violet-600" />
                <span className="text-sm font-semibold text-gray-800">User Guide</span>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-white transition-colors"
                aria-label="Close user guide"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Tab selector — only show both tabs if faculty; students only see student guide */}
            {role === 'faculty' && (
              <div className="flex border-b border-gray-200 bg-white">
                {(['student', 'committee'] as const).map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTab(t)}
                    className={`flex-1 py-2 text-xs font-medium transition-colors ${
                      tab === t
                        ? 'text-violet-700 border-b-2 border-violet-500 bg-violet-50'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {t === 'student' ? 'Students' : 'Committee'}
                  </button>
                ))}
              </div>
            )}

            {/* Role context note */}
            <div className="px-4 py-2.5 bg-violet-50 border-b border-violet-100">
              <p className="text-xs text-violet-700 leading-relaxed">
               
              </p>
            </div>

            {/* Scrollable sections */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
              {sections.map(section => (
                <AccordionSection key={section.title} section={section} />
              ))}
            </div>

            {/* Footer */}
            <div className="px-4 py-3 border-t border-gray-100 bg-gray-50">
              <p className="text-xs text-gray-400 text-center">
                Mu'een Graduation Project Recommendation System
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
