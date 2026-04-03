// frontend/src/components/GroupPage.tsx
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Users, Plus, Copy, CheckCircle, Lock, LogOut } from 'lucide-react';
import { toast } from 'sonner';
import api from '../services/api';

// ── Types ─────────────────────────────────────────────────────────────────────

interface GroupMember {
  /**
   * FIX (Bug): Backend sends numeric IDs but the original interface typed `id`
   * as `string`.  All comparisons with `currentUserId` (also stored as a
   * number string) were therefore unreliable.  Changed to `number | string`
   * and normalised every comparison with `String()`.
   */
  id: number | string;
  name: string;
  email: string;
  role: 'Leader' | 'Member';
}

interface GroupPageProps {
  onGroupFinalized: (finalized: boolean) => void;
  groupFinalized: boolean;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function GroupPage({ onGroupFinalized, groupFinalized }: GroupPageProps) {
  const [groupName, setGroupName]     = useState('');
  const [groupId, setGroupId]         = useState('');
  const [joinGroupId, setJoinGroupId] = useState('');
  const [hasGroup, setHasGroup]       = useState(false);
  const [isFinalized, setIsFinalized] = useState(false);
  const [members, setMembers]         = useState<GroupMember[]>([]);
  const [loading, setLoading]         = useState(false);
  const [isLeader, setIsLeader]       = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  useEffect(() => {
    if (currentUserId) {
      fetchUserGroup();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUserId]);

  const fetchCurrentUser = async () => {
    try {
      const response = await api.get('/auth/me');
      // Normalise to string for consistent comparisons
      setCurrentUserId(String(response.data.id));
    } catch (error) {
      console.error('Error fetching current user:', error);
    }
  };

  const fetchUserGroup = async () => {
    setLoading(true);
    try {
      const response = await api.get('/group');

      if (response.data.has_group) {
        setHasGroup(true);
        setGroupId(response.data.group.id);
        setGroupName(response.data.group.name);
        const finalized = response.data.group.is_finalized;
        setIsFinalized(finalized);
        onGroupFinalized(finalized);
        setMembers(response.data.group.members);

        // FIX: normalise both sides to string before comparing
        const leaderMember = response.data.group.members.find(
          (m: GroupMember) => m.role === 'Leader'
        );
        setIsLeader(String(leaderMember?.id) === currentUserId);
      } else {
        setHasGroup(false);
      }
    } catch (error) {
      console.error('Error fetching group:', error);
      setHasGroup(false);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      toast.error('Please enter a group name');
      return;
    }
    setLoading(true);
    try {
      const response = await api.post('/group/create', { group_name: groupName });
      const newGroupId = response.data.group.id;
      setGroupId(newGroupId);
      setHasGroup(true);
      setIsFinalized(false);
      setIsLeader(true);
      onGroupFinalized(false);
      setMembers(response.data.group.members || []);
      toast.success('Group created successfully!', {
        description: `Group ID: ${newGroupId}`,
      });
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to create group');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinGroup = async () => {
    if (!joinGroupId.trim()) {
      toast.error('Please enter a Group ID');
      return;
    }
    setLoading(true);
    try {
      const response = await api.post('/group/join', { group_id: joinGroupId });
      setGroupId(response.data.group.id);
      setGroupName(response.data.group.name);
      setHasGroup(true);
      const finalized = response.data.group.is_finalized;
      setIsFinalized(finalized);
      onGroupFinalized(finalized);
      setMembers(response.data.group.members);

      // FIX: same normalisation
      const leaderMember = response.data.group.members.find(
        (m: GroupMember) => m.role === 'Leader'
      );
      setIsLeader(String(leaderMember?.id) === currentUserId);

      toast.success('Successfully joined the group!');
      setJoinGroupId('');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to join group');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyGroupId = () => {
    try {
      navigator.clipboard.writeText(groupId);
      toast.success('Group ID copied to clipboard!');
    } catch {
      toast.info(`Group ID: ${groupId}`);
    }
  };

  const handleFinalizeGroup = async () => {
    if (members.length < 2) {
      toast.error('You need at least 2 members to finalize the group');
      return;
    }
    setLoading(true);
    try {
      await api.post('/group/finalize');
      setIsFinalized(true);
      onGroupFinalized(true);
      toast.success('Group finalized! Generating recommendations…');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to finalize group');
    } finally {
      setLoading(false);
    }
  };

  const handleLeaveGroup = async () => {
    if (!confirm('Are you sure you want to leave the group?')) return;
    setLoading(true);
    try {
      await api.post('/group/leave');
      setHasGroup(false);
      setGroupId('');
      setGroupName('');
      setMembers([]);
      setIsFinalized(false);
      setIsLeader(false);
      onGroupFinalized(false);
      toast.success('You have left the group');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to leave group');
    } finally {
      setLoading(false);
    }
  };

  // ── Loading skeleton ──────────────────────────────────────────────────────

  if (loading && !hasGroup) {
    return (
      <div className="p-8 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto" />
        <p className="mt-4 text-gray-600">Loading group information…</p>
      </div>
    );
  }

  // ── No group yet ─────────────────────────────────────────────────────────

  if (!hasGroup) {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl text-gray-900 mb-2">My Group</h1>
          <p className="text-gray-600">Create or join a project group</p>
        </div>

        <Tabs defaultValue="create" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="create">Create Group</TabsTrigger>
            <TabsTrigger value="join">Join Group</TabsTrigger>
          </TabsList>

          <TabsContent value="create">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plus className="w-5 h-5 text-indigo-600" />
                  Create a New Group
                </CardTitle>
                <CardDescription>
                  Start a new project group and invite your teammates
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="groupName">Group Name</Label>
                  <Input
                    id="groupName"
                    placeholder="e.g., Team Alpha"
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleCreateGroup()}
                  />
                </div>
                <Button
                  onClick={handleCreateGroup}
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
                >
                  {loading ? 'Creating…' : 'Create Group'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="join">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-purple-600" />
                  Join an Existing Group
                </CardTitle>
                <CardDescription>
                  Enter the Group ID shared by your team leader
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="joinGroupId">Group ID</Label>
                  <Input
                    id="joinGroupId"
                    placeholder="e.g., GP-ABC123"
                    value={joinGroupId}
                    onChange={(e) => setJoinGroupId(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleJoinGroup()}
                  />
                </div>
                <Button
                  onClick={handleJoinGroup}
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
                >
                  {loading ? 'Joining…' : 'Join Group'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    );
  }

  // ── Has group ─────────────────────────────────────────────────────────────

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl text-gray-900 mb-2">My Group</h1>
        <p className="text-gray-600">Manage your project group</p>
      </div>

      {/* Group header card */}
      <Card className="mb-6 border-indigo-200 bg-gradient-to-r from-indigo-50 to-purple-50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl">{groupName}</CardTitle>
              <CardDescription className="flex items-center gap-2 mt-1">
                Group ID:
                <code className="bg-white px-2 py-0.5 rounded border text-indigo-700 font-mono">
                  {groupId}
                </code>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={handleCopyGroupId}
                >
                  <Copy className="w-3.5 h-3.5" />
                </Button>
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {isFinalized ? (
                <Badge className="bg-green-100 text-green-700 border-green-200 flex items-center gap-1">
                  <CheckCircle className="w-3.5 h-3.5" />
                  Finalized
                </Badge>
              ) : (
                <Badge variant="outline" className="text-amber-600 border-amber-300">
                  Not Finalized
                </Badge>
              )}
              {isLeader && (
                <Badge className="bg-indigo-100 text-indigo-700">Leader</Badge>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Members table */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Members ({members.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((member) => (
                <TableRow key={String(member.id)}>
                  <TableCell className="font-medium">{member.name}</TableCell>
                  <TableCell>{member.email}</TableCell>
                  <TableCell>
                    <Badge
                      className={
                        member.role === 'Leader'
                          ? 'bg-indigo-100 text-indigo-700'
                          : 'bg-gray-100 text-gray-700'
                      }
                    >
                      {member.role}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Actions */}
      {!isFinalized && (
        <div className="flex gap-4">
          {isLeader && (
            <Button
              onClick={handleFinalizeGroup}
              disabled={loading || members.length < 2}
              className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
            >
              <Lock className="w-4 h-4 mr-2" />
              {loading ? 'Finalizing…' : 'Finalize Group'}
            </Button>
          )}
          <Button
            variant="outline"
            onClick={handleLeaveGroup}
            disabled={loading}
            className="text-red-600 border-red-200 hover:bg-red-50"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Leave Group
          </Button>
        </div>
      )}

      {isFinalized && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="py-4">
            <div className="flex items-center gap-3 text-green-700">
              <CheckCircle className="w-5 h-5 flex-shrink-0" />
              <p className="text-sm">
                Your group is finalized. Recommendations have been generated. Visit the
                Recommendations page to view them.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
