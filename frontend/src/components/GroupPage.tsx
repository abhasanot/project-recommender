// frontend/src/components/GroupPage.tsx
import { useState, useEffect, useCallback } from 'react';
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from './ui/card';
import { Button } from './ui/button';
import { Input }  from './ui/input';
import { Label }  from './ui/label';
import { Badge }  from './ui/badge';
import {
  Tabs, TabsContent, TabsList, TabsTrigger,
} from './ui/tabs';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import {
  Users, Plus, Copy, CheckCircle, Lock, LogOut,
  AlertCircle, Scale, TrendingUp, User, Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import api from '../services/api';

// ── Types ─────────────────────────────────────────────────────────────────────

interface MemberStatus {
  id:               number;
  name:             string;
  email:            string;
  role:             'Leader' | 'Member';
  profile_complete: boolean;
}

interface ReadinessState {
  all_profiles_complete: boolean;
  weights_selected:      boolean;
  weighting_mode:        string;
  member_statuses:       MemberStatus[];
  ready:                 boolean;
}

interface GroupPageProps {
  onGroupFinalized: (finalized: boolean) => void;
  groupFinalized:   boolean;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function GroupPage({ onGroupFinalized, groupFinalized }: GroupPageProps) {
  const [groupName,    setGroupName]    = useState('');
  const [groupId,      setGroupId]      = useState('');
  const [joinGroupId,  setJoinGroupId]  = useState('');
  const [hasGroup,     setHasGroup]     = useState(false);
  const [isFinalized,  setIsFinalized]  = useState(false);
  const [isLeader,     setIsLeader]     = useState(false);
  const [currentUserId,setCurrentUserId]= useState<string | null>(null);
  const [loading,      setLoading]      = useState(true);
  const [finalizing,   setFinalizing]   = useState(false);

  // Readiness (profile completion + weights)
  const [readiness,    setReadiness]    = useState<ReadinessState | null>(null);
  const [readinessLoading, setReadinessLoading] = useState(false);

  // Weight selection (pre-finalization)
  const [weightMode,   setWeightMode]   = useState<string>('');
  const [savingWeight, setSavingWeight] = useState(false);

  // ── fetch current user once ────────────────────────────────────────────────

  useEffect(() => {
    api.get('/auth/me').then(r => setCurrentUserId(String(r.data.id))).catch(() => {});
  }, []);

  // ── fetch group when user id is known ─────────────────────────────────────

  const fetchGroup = useCallback(async () => {
    if (!currentUserId) return;
    setLoading(true);
    try {
      const res = await api.get('/group');
      if (res.data.has_group) {
        const g = res.data.group;
        setHasGroup(true);
        setGroupId(g.id);
        setGroupName(g.name);
        setIsFinalized(!!g.is_finalized);
        onGroupFinalized(!!g.is_finalized);
        const leader = g.members.find((m: any) => m.role === 'Leader');
        setIsLeader(String(leader?.id) === currentUserId);
      } else {
        setHasGroup(false);
        setIsFinalized(false);
        onGroupFinalized(false);
      }
    } catch {
      setHasGroup(false);
    } finally {
      setLoading(false);
    }
  }, [currentUserId, onGroupFinalized]);

  useEffect(() => { fetchGroup(); }, [fetchGroup]);

  // ── fetch readiness whenever group exists ──────────────────────────────────

  const fetchReadiness = useCallback(async () => {
    if (!hasGroup) return;
    setReadinessLoading(true);
    try {
      const res = await api.get('/group/readiness');
      setReadiness(res.data);
      // Pre-fill weight mode from saved value
      if (res.data.weighting_mode && res.data.weights_selected) {
        setWeightMode(res.data.weighting_mode);
      }
    } catch {
      setReadiness(null);
    } finally {
      setReadinessLoading(false);
    }
  }, [hasGroup]);

  useEffect(() => { fetchReadiness(); }, [fetchReadiness]);

  // ── actions ───────────────────────────────────────────────────────────────

  const handleCreateGroup = async () => {
    if (!groupName.trim()) { toast.error('Please enter a group name'); return; }
    setLoading(true);
    try {
      const res = await api.post('/group/create', { group_name: groupName });
      setGroupId(res.data.group.id);
      setHasGroup(true);
      setIsFinalized(false);
      setIsLeader(true);
      onGroupFinalized(false);
      toast.success('Group created!', { description: `Share ID: ${res.data.group.id}` });
      fetchReadiness();
    } catch (err: any) {
      toast.error(err.response?.data?.error ?? 'Failed to create group');
    } finally { setLoading(false); }
  };

  const handleJoinGroup = async () => {
    if (!joinGroupId.trim()) { toast.error('Please enter a Group ID'); return; }
    setLoading(true);
    try {
      const res = await api.post('/group/join', { group_id: joinGroupId });
      const g   = res.data.group;
      setGroupId(g.id);
      setGroupName(g.name);
      setHasGroup(true);
      setIsFinalized(!!g.is_finalized);
      onGroupFinalized(!!g.is_finalized);
      const leader = g.members.find((m: any) => m.role === 'Leader');
      setIsLeader(String(leader?.id) === currentUserId);
      setJoinGroupId('');
      toast.success('Joined group successfully!');
      fetchReadiness();
    } catch (err: any) {
      toast.error(err.response?.data?.error ?? 'Failed to join group');
    } finally { setLoading(false); }
  };

  const handleSaveWeights = async () => {
    if (!weightMode) { toast.error('Please select a weighting mode'); return; }
    setSavingWeight(true);
    try {
      await api.put('/group/weights', { weighting_mode: weightMode });
      toast.success('Weighting preference saved!');
      await fetchReadiness();
    } catch (err: any) {
      toast.error(err.response?.data?.error ?? 'Failed to save weights');
    } finally { setSavingWeight(false); }
  };

  const handleFinalize = async () => {
    setFinalizing(true);
    try {
      const res = await api.post('/group/finalize');
      setIsFinalized(true);
      onGroupFinalized(true);
      toast.success(res.data.message);
    } catch (err: any) {
      const detail = err.response?.data;
      if (detail?.incomplete_members?.length) {
        toast.error(`Incomplete profiles: ${detail.incomplete_members.join(', ')}`);
      } else {
        toast.error(detail?.error ?? 'Failed to finalize group');
      }
    } finally { setFinalizing(false); }
  };

  const handleLeaveGroup = async () => {
    if (!confirm('Are you sure you want to leave the group?')) return;
    try {
      await api.post('/group/leave');
      setHasGroup(false); setGroupId(''); setGroupName('');
      setIsFinalized(false); setIsLeader(false); setReadiness(null);
      onGroupFinalized(false);
      toast.success('Left group successfully');
    } catch (err: any) {
      toast.error(err.response?.data?.error ?? 'Failed to leave group');
    }
  };

  const copyGroupId = () => {
    navigator.clipboard.writeText(groupId).catch(() => {});
    toast.success('Group ID copied!');
  };

  // ── derived state ──────────────────────────────────────────────────────────

  const membersCount    = readiness?.member_statuses?.length ?? 0;
  const allProfilesDone = readiness?.all_profiles_complete ?? false;
  const weightsSet      = readiness?.weights_selected ?? false;
  const canFinalize     = membersCount >= 2 && allProfilesDone && weightsSet;

  // ── loading ────────────────────────────────────────────────────────────────

  if (loading && !hasGroup) {
    return (
      <div className="p-8 flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  // ── no group yet ───────────────────────────────────────────────────────────

  if (!hasGroup) {
    return (
      <div className="p-8 max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl text-gray-900 mb-2">My Group</h1>
          <p className="text-gray-600">Create a new group or join an existing one</p>
        </div>
        <Tabs defaultValue="create">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="create">Create Group</TabsTrigger>
            <TabsTrigger value="join">Join Group</TabsTrigger>
          </TabsList>
          <TabsContent value="create">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plus className="w-5 h-5 text-indigo-600" /> Create a New Group
                </CardTitle>
                <CardDescription>Start a group and share the ID with your teammates</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="gname">Group Name</Label>
                  <Input id="gname" className="mt-1" placeholder="e.g., Team Alpha"
                    value={groupName} onChange={e => setGroupName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleCreateGroup()} />
                </div>
                <Button onClick={handleCreateGroup} disabled={loading} className="w-full bg-gradient-to-r from-indigo-600 to-purple-600">
                  {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  Create Group
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="join">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-purple-600" /> Join an Existing Group
                </CardTitle>
                <CardDescription>Enter the Group ID given by your team leader</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="jid">Group ID</Label>
                  <Input id="jid" className="mt-1" placeholder="e.g., GP-ABC123"
                    value={joinGroupId} onChange={e => setJoinGroupId(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleJoinGroup()} />
                </div>
                <Button onClick={handleJoinGroup} disabled={loading} className="w-full bg-gradient-to-r from-purple-600 to-indigo-600">
                  {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  Join Group
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    );
  }

  // ── has group ──────────────────────────────────────────────────────────────

  return (
    <div className="p-8 max-w-3xl mx-auto space-y-6">
      <div className="mb-2">
        <h1 className="text-3xl text-gray-900 mb-1">My Group</h1>
        <p className="text-gray-500 text-sm">Manage your group and track readiness for finalization</p>
      </div>

      {/* ── Group header ─────────────────────────────────────────────────── */}
      <Card className="border-indigo-200 bg-gradient-to-r from-indigo-50 to-purple-50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <CardTitle className="text-xl">{groupName}</CardTitle>
              <CardDescription className="flex items-center gap-1.5 mt-1 flex-wrap">
                Group ID:
                <code className="bg-white px-2 py-0.5 rounded border text-indigo-700 font-mono text-xs">
                  {groupId}
                </code>
                <button type="button" onClick={copyGroupId} className="text-indigo-400 hover:text-indigo-600" title="Copy group ID"
                aria-label="Copy group ID">
                  <Copy className="w-3.5 h-3.5" />
                </button>
              </CardDescription>
            </div>
            <div className="flex gap-2 flex-wrap">
              {isFinalized ? (
                <Badge className="bg-green-100 text-green-700 border-green-200 flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" /> Finalized
                </Badge>
              ) : (
                <Badge variant="outline" className="text-amber-600 border-amber-300">Not Finalized</Badge>
              )}
              {isLeader && <Badge className="bg-indigo-100 text-indigo-700">You are Leader</Badge>}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* ── Members + profile status ──────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-600" />
            Members &amp; Profile Status
          </CardTitle>
          <CardDescription>
            All members must complete their profiles before the group can be finalized
          </CardDescription>
        </CardHeader>
        <CardContent>
          {readinessLoading ? (
            <div className="flex items-center gap-2 text-gray-400 py-4">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading status…
            </div>
          ) : readiness?.member_statuses?.length ? (
            <div className="space-y-2">
              {readiness.member_statuses.map(m => (
                <div key={m.id} className={`flex items-center justify-between p-3 rounded-lg border ${
                  m.profile_complete ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'
                }`}>
                  <div className="flex items-center gap-2">
                    <User className={`w-4 h-4 ${m.profile_complete ? 'text-green-600' : 'text-amber-500'}`} />
                    <div>
                      <span className="text-sm font-medium text-gray-800">{m.name}</span>
                      <span className="text-xs text-gray-500 ml-2">{m.email}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={m.role === 'Leader'
                      ? 'bg-indigo-100 text-indigo-700 text-xs'
                      : 'bg-gray-100 text-gray-600 text-xs'}>{m.role}</Badge>
                    {m.profile_complete ? (
                      <Badge className="bg-green-100 text-green-700 text-xs flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" /> Complete
                      </Badge>
                    ) : (
                      <Badge className="bg-amber-100 text-amber-700 text-xs flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> Incomplete
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400 py-4">No member data available</p>
          )}

          {!allProfilesDone && readiness && (
            <div className="mt-4 flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200">
              <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-amber-800">
                <strong>Action required:</strong> The members shown in amber above have not completed their profiles.
                They must complete the Profile page before the group can be finalized.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Weight selection (leader only, pre-finalization) ──────────────── */}
      {!isFinalized && isLeader && (
        <Card className={weightsSet ? 'border-green-200' : 'border-indigo-200'}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Scale className="w-5 h-5 text-purple-600" />
              Step 2: Select Recommendation Weights
              {weightsSet && <CheckCircle className="w-4 h-4 text-green-500" />}
            </CardTitle>
            <CardDescription>
              Choose how the system balances academic competency vs. personal interests when generating recommendations.
              {!weightsSet && <span className="ml-1 font-medium text-amber-600">Required before finalizing.</span>}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <RadioGroup value={weightMode} onValueChange={setWeightMode} className="space-y-3">
              {[
                { value: 'balanced',        label: 'Balanced (50% / 50%)',        desc: 'Equal emphasis on academic background and personal interests' },
                { value: 'courses_heavy',   label: 'Competency-Focused (75% / 25%)', desc: 'Prioritises projects matching academic performance and course grades' },
                { value: 'interests_heavy', label: 'Interest-Focused (25% / 75%)',   desc: 'Prioritises projects matching selected domains and RDIA priorities' },
              ].map(opt => (
                <div key={opt.value}
                  className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                    weightMode === opt.value ? 'border-indigo-400 bg-indigo-50' : 'border-gray-200 hover:bg-gray-50'
                  }`}
                  onClick={() => setWeightMode(opt.value)}
                >
                  <RadioGroupItem value={opt.value} id={opt.value} className="mt-0.5" />
                  <div>
                    <Label htmlFor={opt.value} className="font-medium cursor-pointer">{opt.label}</Label>
                    <p className="text-xs text-gray-500 mt-0.5">{opt.desc}</p>
                  </div>
                </div>
              ))}
            </RadioGroup>

            <div className="flex items-center gap-3">
              <Button
                onClick={handleSaveWeights}
                disabled={!weightMode || savingWeight}
                className="bg-gradient-to-r from-indigo-600 to-purple-600"
              >
                {savingWeight ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <TrendingUp className="w-4 h-4 mr-2" />}
                {weightsSet ? 'Update Weights' : 'Save Weights'}
              </Button>
              {weightsSet && (
                <span className="text-sm text-green-600 flex items-center gap-1">
                  <CheckCircle className="w-4 h-4" /> Saved
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Finalize + readiness summary ─────────────────────────────────── */}
      {!isFinalized && (
        <Card className={canFinalize ? 'border-green-300 bg-green-50' : 'border-gray-200'}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="w-5 h-5 text-indigo-600" />
              Step 3: Finalize Group
            </CardTitle>
            <CardDescription>
              Finalizing will lock the group and generate personalized recommendations for all members
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Pre-conditions checklist */}
            <div className="space-y-2">
              {[
                { label: 'At least 2 members in the group', met: membersCount >= 2 },
                { label: 'All member profiles completed',   met: allProfilesDone },
                { label: 'Leader has selected weights',     met: weightsSet },
              ].map(({ label, met }) => (
                <div key={label} className={`flex items-center gap-2 text-sm ${met ? 'text-green-700' : 'text-gray-500'}`}>
                  <CheckCircle className={`w-4 h-4 flex-shrink-0 ${met ? 'text-green-500' : 'text-gray-300'}`} />
                  {label}
                </div>
              ))}
            </div>

            <div className="flex gap-3 flex-wrap">
              {isLeader && (
                <Button
                  onClick={handleFinalize}
                  disabled={!canFinalize || finalizing}
                  className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 disabled:opacity-50"
                >
                  {finalizing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Lock className="w-4 h-4 mr-2" />}
                  {finalizing ? 'Finalizing…' : 'Finalize Group & Generate Recommendations'}
                </Button>
              )}
              {!isLeader && (
                <p className="text-sm text-gray-500 py-2">
                  Only the group leader can finalize the group.
                </p>
              )}
              <Button variant="outline" onClick={handleLeaveGroup}
                className="text-red-600 border-red-200 hover:bg-red-50">
                <LogOut className="w-4 h-4 mr-2" /> Leave Group
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Already finalized ─────────────────────────────────────────────── */}
      {isFinalized && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="py-5">
            <div className="flex items-center justify-between">
             <div className="flex items-center gap-3 text-green-700">
              <CheckCircle className="w-6 h-6 flex-shrink-0" />
              <div>
                <p className="font-semibold">Group is Finalized</p>
                <p className="text-sm text-green-600 mt-0.5">
                  Recommendations have been generated. Go to the Recommendations page to view them.
                </p>
              </div>
            </div>
            <Button variant="outline" onClick={handleLeaveGroup} className="text-red-600 border-red-200 hover:bg-red-50">
                <LogOut className="w-4 h-4 mr-2" /> Leave Group
              </Button>
             </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}