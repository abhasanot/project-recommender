// frontend/src/components/TrendsPage.tsx
/**
 * Unified Trend Analysis Dashboard
 *
 * Available to both students and faculty (role-based data access).
 * Faculty have access to all projects, students only see their own.
 *
 * Features:
 *  1. Filter panel      - year, semester, interest, application, RDIA
 *  2. Summary KPI bar   - total projects, top domains, growth indicators
 *  3. Timeline tab      - line chart (trend over time)
 *  4. Distribution tab  - pie/donut chart
 *  5. Frequency tab     - bar chart per dimension
 */

import {
  useState, useEffect, useCallback, useMemo, useRef,
} from 'react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LabelList,
} from 'recharts';
import {
  TrendingUp, Filter, RefreshCw,
  BarChart2, Activity, PieChart as PieIcon,
  ChevronDown, X, Info,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from './ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import api from '../services/api';

// Colour palette (matches logo's purple brand)
const PALETTE = [
  '#7C3AED','#9333EA','#A855F7','#C084FC','#DDD6FE',
  '#6D28D9','#4C1D95','#5B21B6','#8B5CF6','#E879F9',
  '#D946EF','#C026D3','#A21CAF','#86198F','#701A75',
  '#EC4899','#F43F5E','#EF4444','#F97316','#EAB308',
];

// Types

interface FilterOptions {
  years:        string[];
  semesters:    { code: string; label: string }[];
  interests:    string[];
  applications: string[];
  rdia:         string[];
  total_projects: number;
}

interface FreqItem   { name: string; count: number; percentage: number; }
interface DistItem   { name: string; count: number; percentage: number; color_index: number; }
interface PeriodOpt  { key: string; label: string; }

interface Summary {
  total_projects:     number;
  top_interest:       { name: string; count: number };
  top_application:    { name: string; count: number };
  top_rdia:           { name: string; count: number };
  years_covered:      string[];
  unique_interests:   number;
  unique_applications:number;
}

interface ActiveFilters {
  years:        string[];
  semesters:    string[];
  interests:    string[];
  applications: string[];
  rdia:         string[];
}

// Dimension options (only 3 options for all tabs)
const CHART_DIMENSIONS = [
  { value: 'interest',    label: 'Domain Interest' },
  { value: 'application', label: 'Application Domain' },
  { value: 'rdia',        label: 'RDIA Priority' },
];

// Converts semester code to a human-readable label
function semesterLabel(code: string): string {
  if (code === '10') return 'First';
  if (code === '20') return 'Second';
  if (code === '30') return 'Third';
  return code;
}

// Multi-select chip component with "All" option
function MultiSelect({
  label, options, selected, onToggle, getLabel,
}: {
  label: string;
  options: string[];
  selected: string[];
  onToggle: (v: string) => void;
  getLabel?: (v: string) => string;
}) {
  const [open, setOpen] = useState(false);

  const allSelected = selected.length === options.length && options.length > 0;

  const handleSelectAll = () => {
    if (allSelected) {
      options.forEach(opt => {
        if (selected.includes(opt)) onToggle(opt);
      });
    } else {
      options.forEach(opt => {
        if (!selected.includes(opt)) onToggle(opt);
      });
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm transition-all
          ${selected.length > 0
            ? 'border-violet-400 bg-violet-50 text-violet-800'
            : 'border-gray-200 bg-white text-gray-600 hover:border-violet-300'
          }`}
      >
        {label}
        {selected.length > 0 && (
          <span className="bg-violet-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
            {selected.length}
          </span>
        )}
        <ChevronDown className="w-3 h-3" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute top-full mt-1 left-0 z-20 bg-white rounded-xl border shadow-xl p-2 min-w-48 max-h-64 overflow-y-auto">
            <button
              onClick={handleSelectAll}
              className={`w-full text-left px-3 py-1.5 rounded-lg text-xs mb-1 transition-all flex items-center gap-2 border-b border-gray-100
                ${allSelected ? 'bg-violet-100 text-violet-800' : 'hover:bg-gray-50 text-gray-700'}`}
            >
              <div className={`w-3.5 h-3.5 rounded border flex-shrink-0 flex items-center justify-center
                ${allSelected ? 'bg-violet-500 border-violet-500' : 'border-gray-300'}`}>
                {allSelected && <span className="text-white text-xs leading-none">✓</span>}
              </div>
              <span className="font-medium">All {label}s</span>
            </button>

            {options.map(opt => {
              const isSelected = selected.includes(opt);
              const displayText = getLabel ? getLabel(opt) : opt;
              return (
                <button
                  key={opt}
                  onClick={() => onToggle(opt)}
                  className={`w-full text-left px-3 py-1.5 rounded-lg text-xs mb-0.5 transition-all flex items-center gap-2
                    ${isSelected ? 'bg-violet-100 text-violet-800' : 'hover:bg-gray-50 text-gray-700'}`}
                >
                  <div className={`w-3.5 h-3.5 rounded border flex-shrink-0 flex items-center justify-center
                    ${isSelected ? 'bg-violet-500 border-violet-500' : 'border-gray-300'}`}>
                    {isSelected && <span className="text-white text-xs leading-none">✓</span>}
                  </div>
                  <span className="truncate">{displayText}</span>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

// Custom Tooltip for recharts
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-lg p-3 text-xs">
      <p className="font-semibold text-gray-700 mb-1.5">{label}</p>
      {payload.map((entry: any, i: number) => (
        <div key={i} className="flex items-center gap-2 mb-0.5">
          <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: entry.color }} />
          <span className="text-gray-600">{entry.name}:</span>
          <span className="font-medium text-gray-900">{entry.value}</span>
        </div>
      ))}
    </div>
  );
};

// Growth rate explanation tooltip
// Displays the exact first non-zero and last value used in growth_rate calculation
function GrowthRateTooltip({ series, periods }: { series: any; periods: PeriodOpt[] }) {
  const [visible, setVisible] = useState(false);

  const explanation = useMemo(() => {
    const data: number[] = series.data ?? [];
    if (!periods || periods.length === 0 || data.length === 0) return null;

    // Find first index where data is not zero (matching _growth_rate logic)
    let firstIdx = -1;
    for (let i = 0; i < data.length; i++) {
      if (data[i] > 0) {
        firstIdx = i;
        break;
      }
    }
    
    // Last index is always the last value in the sequence (can be zero)
    const lastIdx = data.length - 1;
    
    // If no non-zero value found, show insufficient data
    if (firstIdx === -1) {
      return { insufficientData: true };
    }

    // Special case: first non-zero appears only at the last position
    const isEmergingAtLastPeriod = (firstIdx === lastIdx);
    const firstCount = data[firstIdx];
    const lastCount = data[lastIdx];

    return {
      insufficientData: false,
      isEmergingAtLastPeriod: isEmergingAtLastPeriod,
      firstPeriod: periods[firstIdx]?.label ?? `Period ${firstIdx + 1}`,
      lastPeriod: periods[lastIdx]?.label ?? `Period ${lastIdx + 1}`,
      firstCount: firstCount,
      lastCount: lastCount,
    };
  }, [series, periods]);

  return (
    <div
      className="relative inline-flex items-center ml-1"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
    >
      <button
        type="button"
        className="flex items-center justify-center w-4 h-4 rounded-full text-gray-400 hover:text-violet-400 hover:bg-violet-900/20 transition-all focus:outline-none"
        aria-label="Growth calculation info"
      >
        <Info className="w-3.5 h-3.5" />
      </button>

      {visible && (
        <div
          className="absolute z-[100] bottom-full mb-3 left-1/2 -translate-x-1/2 w-72 bg-gray-900 text-white rounded-xl shadow-2xl p-4 text-xs animate-in fade-in zoom-in duration-200"
          role="tooltip"
        >
          <div
            className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0"
            style={{ borderLeft: '8px solid transparent', borderRight: '8px solid transparent', borderTop: '8px solid #111827' }}
          />

          <p className="font-bold text-violet-300 mb-2 border-b border-gray-700 pb-1 text-[11px] uppercase tracking-wider">
            How growth rate is calculated
          </p>
          
          {explanation?.insufficientData ? (
            <div className="space-y-2 text-gray-200 leading-relaxed">
              <p className="text-yellow-300">
                No data available to calculate growth rate.
              </p>
              <p className="text-[10px] text-gray-500 italic">
                Need at least one non-zero data point.
              </p>
            </div>
          ) : explanation?.isEmergingAtLastPeriod ? (
            <div className="space-y-2 text-gray-200 leading-relaxed">
              <p>
                This category first appeared in <span className="font-semibold text-white">{explanation?.firstPeriod}</span>.
              </p>
              <p>
                It had <span className="text-emerald-400 font-bold text-sm">{explanation?.firstCount}</span> project(s) in its first appearance.
              </p>
              <p className="pt-1 text-emerald-400 font-medium">
                Growth rate = +100% (emerged from zero)
              </p>
            </div>
          ) : (
            <div className="space-y-2 text-gray-200 leading-relaxed">
              <p>
                First non-zero data: <span className="font-semibold text-white">{explanation?.firstPeriod}</span> with <span className="text-emerald-400 font-bold text-sm">{explanation?.firstCount}</span> project(s)
              </p>
              <p>
                Last period data: <span className="font-semibold text-white">{explanation?.lastPeriod}</span> with <span className="text-emerald-400 font-bold text-sm">{explanation?.lastCount}</span> project(s)
              </p>
              <p className="pt-1 text-[10px] text-gray-500 italic border-t border-gray-800 mt-1">
                Growth rate = (({explanation?.lastCount} - {explanation?.firstCount}) / {explanation?.firstCount}) × 100% = {series.growth_rate > 0 ? '+' : ''}{series.growth_rate}%
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Main component
export default function TrendsPage() {
  // Filter state
  const [filterOpts,  setFilterOpts]  = useState<FilterOptions | null>(null);
  const [activeFilters, setActiveFilters] = useState<ActiveFilters>({
    years: [], semesters: [], interests: [], applications: [], rdia: [],
  });

  // Chart dimension selectors
  const [timelineDim, setTimelineDim] = useState('interest');
  const [distDim,     setDistDim]     = useState('interest');
  const [freqDim,     setFreqDim]     = useState('interest');

  // Data state
  const [summary,     setSummary]     = useState<Summary | null>(null);
  const [timelineData,setTimelineData]= useState<any>(null);
  const [distData,    setDistData]    = useState<DistItem[]>([]);
  const [freqData,    setFreqData]    = useState<FreqItem[]>([]);

  const [loading,     setLoading]     = useState(true);
  const [activeTab,   setActiveTab]   = useState('timeline');

  // Build query string from active filters
  const filterQuery = useMemo(() => {
    const params = new URLSearchParams();
    if (activeFilters.years.length)        params.set('years',        activeFilters.years.join(','));
    if (activeFilters.semesters.length)    params.set('semesters',    activeFilters.semesters.join(','));
    if (activeFilters.interests.length)    params.set('interests',    activeFilters.interests.join(','));
    if (activeFilters.applications.length) params.set('applications', activeFilters.applications.join(','));
    if (activeFilters.rdia.length)         params.set('rdia',         activeFilters.rdia.join(','));
    return params.toString() ? `?${params}` : '';
  }, [activeFilters]);

  // Load static filter options (once)
  useEffect(() => {
    api.get('/trends/filters').then(r => {
      setFilterOpts(r.data);
    }).catch(() => {});
  }, []);

  // Reload all data when filters or dimension selectors change
  const loadAll = useCallback(() => {
    setLoading(true);

    const base = `/trends`;
    const q    = filterQuery;

    Promise.all([
      api.get(`${base}/summary${q}`),
      api.get(`${base}/timeline${q}&dimension=${timelineDim}&top_n=8`),
      api.get(`${base}/distribution${q}&dimension=${distDim}`),
      api.get(`${base}/frequency${q}&dimension=${freqDim}&top_n=12`),
    ]).then(([sumR, timeR, distR, freqR]) => {
      setSummary(sumR.data);
      setTimelineData(timeR.data);
      setDistData(distR.data.data ?? []);
      setFreqData(freqR.data.data ?? []);
    }).catch(e => console.error('Trend load error:', e))
      .finally(() => setLoading(false));
  }, [filterQuery, timelineDim, distDim, freqDim]);

  useEffect(() => { loadAll(); }, [loadAll]);

  // Filter togglers
  const toggle = (dim: keyof ActiveFilters, val: string) =>
    setActiveFilters(prev => ({
      ...prev,
      [dim]: prev[dim].includes(val) ? prev[dim].filter(v => v !== val) : [...prev[dim], val],
    }));

  const clearAll = () => setActiveFilters({ years: [], semesters: [], interests: [], applications: [], rdia: [] });
  const hasFilters = Object.values(activeFilters).some(v => v.length > 0);

  // Line chart series -> Recharts format
  const lineChartData = useMemo(() => {
    if (!timelineData?.periods) return [];
    return timelineData.periods.map((p: PeriodOpt, i: number) => {
      const row: Record<string, any> = { name: p.label };
      (timelineData.series ?? []).forEach((s: any) => { row[s.name] = s.data[i] ?? 0; });
      return row;
    });
  }, [timelineData]);

  // Render
  return (
    <div className="p-6 max-w-screen-xl mx-auto">
      {/* Page header */}
      <div className="mb-6 flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-violet-600" />
            Domain Trends Analysis
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Explore frequency, growth, and distribution of graduation project trends
          </p>
        </div>
      </div>

      {/* Filter panel */}
      {filterOpts && (
        <div className="mb-5 p-4 bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1.5 text-sm font-medium text-gray-600">
              <Filter className="w-4 h-4" />
              Filters:
            </div>

            <MultiSelect label="Year"        options={filterOpts.years}
              selected={activeFilters.years}        onToggle={v => toggle('years', v)} />

            <MultiSelect
              label="Semester"
              options={filterOpts.semesters.map(s => s.code)}
              selected={activeFilters.semesters}
              onToggle={v => toggle('semesters', v)}
              getLabel={semesterLabel}
            />

            <MultiSelect label="Interest"    options={filterOpts.interests}
              selected={activeFilters.interests}    onToggle={v => toggle('interests', v)} />
            <MultiSelect label="Application" options={filterOpts.applications}
              selected={activeFilters.applications} onToggle={v => toggle('applications', v)} />
            <MultiSelect label="RDIA"        options={filterOpts.rdia}
              selected={activeFilters.rdia}         onToggle={v => toggle('rdia', v)} />

            {hasFilters && (
              <button onClick={clearAll}
                className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-red-600 hover:bg-red-50 rounded-lg border border-red-200 transition-all">
                <X className="w-3 h-3" /> Clear all
              </button>
            )}

            <button onClick={loadAll} disabled={loading}
              className="ml-auto flex items-center gap-1.5 px-3 py-1.5 text-xs bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-all disabled:opacity-50">
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>

          {/* Active filter chips */}
          {hasFilters && (
            <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-gray-100">
              {Object.entries(activeFilters).flatMap(([dim, vals]) =>
                (vals as string[]).map((v: string) => (
                  <span key={`${dim}-${v}`}
                    className="flex items-center gap-1 px-2 py-0.5 bg-violet-100 text-violet-800 text-xs rounded-full">
                    {dim === 'semesters' ? semesterLabel(v) : v}
                    <button onClick={() => toggle(dim as keyof ActiveFilters, v)}>
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </span>
                ))
              )}
            </div>
          )}
        </div>
      )}

      {/* Summary KPI bar */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card className="border-violet-100 bg-gradient-to-br from-violet-50 to-purple-50">
            <CardContent className="pt-4 pb-4">
              <p className="text-xs text-violet-600 font-medium uppercase tracking-wide">Projects</p>
              <p className="text-3xl font-bold text-violet-800 mt-1">{summary.total_projects}</p>
              <p className="text-xs text-gray-400 mt-0.5">
                {summary.years_covered.join(', ')}
              </p>
            </CardContent>
          </Card>

          <Card className="border-emerald-100 bg-gradient-to-br from-emerald-50 to-green-50">
            <CardContent className="pt-4 pb-4">
              <p className="text-xs text-emerald-600 font-medium uppercase tracking-wide">Top Interest</p>
              <p className="text-sm font-bold text-emerald-800 mt-1 leading-tight">
                {summary.top_interest.name}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">{summary.top_interest.count} projects</p>
            </CardContent>
          </Card>

          <Card className="border-blue-100 bg-gradient-to-br from-blue-50 to-indigo-50">
            <CardContent className="pt-4 pb-4">
              <p className="text-xs text-blue-600 font-medium uppercase tracking-wide">Top Application</p>
              <p className="text-sm font-bold text-blue-800 mt-1 leading-tight">
                {summary.top_application.name}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">{summary.top_application.count} projects</p>
            </CardContent>
          </Card>

          <Card className="border-amber-100 bg-gradient-to-br from-amber-50 to-yellow-50">
            <CardContent className="pt-4 pb-4">
              <p className="text-xs text-amber-600 font-medium uppercase tracking-wide">Top RDIA</p>
              <p className="text-sm font-bold text-amber-800 mt-1 leading-tight">
                {summary.top_rdia.name}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">{summary.top_rdia.count} projects</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main chart tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-3 mb-6 bg-gray-100">
          <TabsTrigger value="timeline"    className="flex items-center gap-1.5 text-xs">
            <Activity className="w-3.5 h-3.5" /> Timeline
          </TabsTrigger>
          <TabsTrigger value="distribution" className="flex items-center gap-1.5 text-xs">
            <PieIcon className="w-3.5 h-3.5" /> Distribution
          </TabsTrigger>
          <TabsTrigger value="frequency"   className="flex items-center gap-1.5 text-xs">
            <BarChart2 className="w-3.5 h-3.5" /> Frequency
          </TabsTrigger>
        </TabsList>

        {/* TIMELINE TAB */}
        <TabsContent value="timeline">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <CardTitle className="text-base">Trend Over Time</CardTitle>
                  <CardDescription className="text-xs">Project frequency across academic periods</CardDescription>
                </div>
                <Select value={timelineDim} onValueChange={setTimelineDim}>
                  <SelectTrigger className="w-44 h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CHART_DIMENSIONS.map(d => <SelectItem key={d.value} value={d.value} className="text-xs">{d.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? <ChartSkeleton /> : lineChartData.length === 0 ? <Empty /> : (
                <>
                  <ResponsiveContainer width="100%" height={340}>
                    <LineChart data={lineChartData} margin={{ top: 4, right: 16, bottom: 4, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      {(timelineData?.series ?? []).map((s: any, i: number) => (
                        <Line
                          key={s.name}
                          type="monotone"
                          dataKey={s.name}
                          stroke={PALETTE[i % PALETTE.length]}
                          strokeWidth={2}
                          dot={{ r: 4 }}
                          activeDot={{ r: 6 }}
                        />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>

                  {/* Growth rate badges with colored background */}
                  {timelineData?.series?.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-gray-100">
                      {timelineData.series.map((s: any, i: number) => {
                        // Check if there is valid data for growth calculation
                        const nonZeroCount = s.data?.filter((val: number) => val > 0).length ?? 0;
                        const isValidGrowth = nonZeroCount >= 1;
                        const isEmergingCase = (nonZeroCount === 1 && s.data?.[s.data.length - 1] > 0);
                        
                        return (
                          <div key={s.name} className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gray-50 border border-gray-200">
                            <div className="w-2 h-2 rounded-full" style={{ background: PALETTE[i % PALETTE.length] }} />
                            <span className="text-xs text-gray-700 max-w-28 truncate">{s.name}</span>
                            
                            {isValidGrowth ? (
                              <span 
                                className="text-xs font-medium px-1.5 py-0.5 rounded-full"
                                style={{ 
                                  backgroundColor: `${s.growth_rate > 0 ? '#10B981' : (s.growth_rate < 0 ? '#EF4444' : '#6B7280')}20`,
                                  color: s.growth_rate > 0 ? '#10B981' : (s.growth_rate < 0 ? '#EF4444' : '#6B7280')
                                }}
                              >
                                {s.growth_rate !== 0 && !isEmergingCase && (s.growth_rate > 0 ? '+' : '')}{s.growth_rate}%
                              </span>
                            ) : (
                              <span 
                                className="text-xs font-medium px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500"
                              >
                                No Data
                              </span>
                            )}
                            
                            <GrowthRateTooltip series={s} periods={timelineData.periods ?? []} />
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* DISTRIBUTION TAB */}
        <TabsContent value="distribution">
          <div className="grid md:grid-cols-2 gap-5">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <CardTitle className="text-base">Distribution</CardTitle>
                    <CardDescription className="text-xs">Share of each category</CardDescription>
                  </div>
                  <Select value={distDim} onValueChange={setDistDim}>
                    <SelectTrigger className="w-44 h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CHART_DIMENSIONS.map(d => <SelectItem key={d.value} value={d.value} className="text-xs">{d.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                {loading ? <ChartSkeleton h={260} /> : distData.length === 0 ? <Empty /> : (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={distData}
                        cx="50%" cy="50%"
                        innerRadius={68} outerRadius={110}
                        paddingAngle={2}
                        dataKey="count"
                        label={({ name, percentage }) => `${percentage}%`}
                        labelLine={false}
                      >
                        {distData.map((entry, i) => (
                          <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v: any, name: any, props: any) =>
                        [`${v} projects (${props.payload.percentage}%)`, props.payload.name]} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Legend / detail panel */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Category Breakdown</CardTitle>
                <CardDescription className="text-xs">Sorted by frequency</CardDescription>
              </CardHeader>
              <CardContent>
                {distData.length === 0 ? <Empty /> : (
                  <div className="space-y-2">
                    {distData.map((item, i) => (
                      <div key={item.name}>
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: PALETTE[i % PALETTE.length] }} />
                            <span className="text-xs text-gray-700 truncate max-w-48">{item.name}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-gray-900">{item.count}</span>
                            <span className="text-xs text-gray-400">{item.percentage}%</span>
                          </div>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-1.5">
                          <div className="h-1.5 rounded-full" style={{
                            width: `${item.percentage}%`,
                            background: PALETTE[i % PALETTE.length],
                          }} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* FREQUENCY TAB */}
        <TabsContent value="frequency">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <CardTitle className="text-base">Frequency by Dimension</CardTitle>
                  <CardDescription className="text-xs">Count of projects per category</CardDescription>
                </div>
                <Select value={freqDim} onValueChange={setFreqDim}>
                  <SelectTrigger className="w-44 h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CHART_DIMENSIONS.map(d => <SelectItem key={d.value} value={d.value} className="text-xs">{d.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? <ChartSkeleton /> : freqData.length === 0 ? <Empty /> : (
                <ResponsiveContainer width="100%" height={380}>
                  <BarChart data={freqData} layout="vertical" margin={{ left: 8, right: 40, top: 4, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f0" />
                    <XAxis type="number" tick={{ fontSize: 11 }} />
                    <YAxis type="category" dataKey="name" width={180} tick={{ fontSize: 11 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="count" radius={[0, 4, 4, 0]} maxBarSize={28}>
                      {freqData.map((_, i) => (
                        <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                      ))}
                      <LabelList dataKey="count" position="right" style={{ fontSize: 11, fill: '#6B7280' }} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Utility micro-components
function ChartSkeleton({ h = 380 }: { h?: number }) {
  return (
    <div className="animate-pulse" style={{ height: h }}>
      <div className="h-full bg-gradient-to-br from-gray-100 to-gray-50 rounded-lg flex items-center justify-center">
        <div className="flex gap-1 items-end">
          {[60, 90, 45, 75, 55, 80, 40].map((v, i) => (
            <div key={i} className="w-6 bg-gray-200 rounded-t" style={{ height: v }} />
          ))}
        </div>
      </div>
    </div>
  );
}

function Empty({ msg = "No data available for the selected filters" }: { msg?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <BarChart2 className="w-10 h-10 text-gray-200 mb-3" />
      <p className="text-sm text-gray-400">{msg}</p>
    </div>
  );
}