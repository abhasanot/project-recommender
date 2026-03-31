import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Users, Plus, Copy, CheckCircle, Lock, UserMinus, LogOut } from 'lucide-react';
import { toast } from 'sonner';
import api from '../services/api';

interface GroupMember {
  id: string;
  name: string;
  email: string;
  role: 'Leader' | 'Member';
}

interface GroupPageProps {
  onGroupFinalized: (finalized: boolean) => void;
  groupFinalized: boolean;
}

export default function GroupPage({ onGroupFinalized, groupFinalized }: GroupPageProps) {
  const [groupName, setGroupName] = useState('');
  const [groupId, setGroupId] = useState('');
  const [joinGroupId, setJoinGroupId] = useState('');
  const [hasGroup, setHasGroup] = useState(false);
  const [isFinalized, setIsFinalized] = useState(false);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [isLeader, setIsLeader] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Load user ID on mount
  useEffect(() => {
    fetchCurrentUser();
  }, []);

  // Load group when user ID is available
  useEffect(() => {
    if (currentUserId) {
      fetchUserGroup();
    }
  }, [currentUserId]);

  const fetchCurrentUser = async () => {
    try {
      const response = await api.get('/auth/me');
      setCurrentUserId(response.data.id.toString());
    } catch (error) {
      console.error('Error fetching current user:', error);
    }
  };

  const fetchUserGroup = async () => {
    setLoading(true);
    try {
      const response = await api.get('/group');
      console.log('Group response:', response.data);  
      
      if (response.data.has_group) {
        setHasGroup(true);
        setGroupId(response.data.group.id);
        setGroupName(response.data.group.name);
        const finalized = response.data.group.is_finalized;
        setIsFinalized(finalized);
        onGroupFinalized(finalized);
        setMembers(response.data.group.members);
        
        // Check if current user is leader
        const leaderMember = response.data.group.members.find((m: any) => m.role === 'Leader');
        console.log('Leader member:', leaderMember);  // ✅ أضف هذا
        console.log('Current user ID:', currentUserId);
        setIsLeader(leaderMember?.id.toString() === currentUserId);
        console.log('Is leader?', leaderMember?.id.toString() === currentUserId);  // ✅ أضف هذا
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
      console.log('Create group response:', response.data);  // ✅ تأكد من الرد
      const newGroupId = response.data.group.id;
      setGroupId(newGroupId);
      setHasGroup(true);
      setIsFinalized(false);
      setMembers(response.data.group.members);
      const leaderMember = response.data.group.members.find((m: any) => m.role === 'Leader');
      setIsLeader(leaderMember?.id.toString() === currentUserId);
      onGroupFinalized(false);
      toast.success('Group created successfully!', {
        description: `Group ID: ${newGroupId}`,
      });
    } catch (err: any) {
      console.error('Create group error:', err);
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
      console.log('Join group response:', response.data);
      
      setGroupId(response.data.group.id);
      setGroupName(response.data.group.name);
      setHasGroup(true);
      const finalized = response.data.group.is_finalized;
      setIsFinalized(finalized);
      onGroupFinalized(finalized);
      setMembers(response.data.group.members);
      
      // Check if current user is leader
      const leaderMember = response.data.group.members.find((m: any) => m.role === 'Leader');
      setIsLeader(leaderMember?.id === currentUserId);
      
      toast.success('Successfully joined the group!');
      setJoinGroupId(''); // Clear input
    } catch (err: any) {
      console.error('Join group error:', err);
      toast.error(err.response?.data?.error || 'Failed to join group');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyGroupId = () => {
    try {
      navigator.clipboard.writeText(groupId);
      toast.success('Group ID copied to clipboard!');
    } catch (error) {
      toast.info(`Group ID: ${groupId}`);
    }
  };

  const handleFinalizeGroup = async () => {
    if (members.length < 2) {
      toast.error('A group must have at least 2 members to finalize');
      return;
    }

    setLoading(true);
    try {
      await api.post('/group/finalize');
      setIsFinalized(true);
      onGroupFinalized(true);
      toast.success('Group finalized successfully!', {
        description: 'Recommendations are now being generated for your group.',
      });
      // Refresh group data
      await fetchUserGroup();
    } catch (err: any) {
      console.error('Finalize group error:', err);
      toast.error(err.response?.data?.error || 'Failed to finalize group');
    } finally {
      setLoading(false);
    }
  };

  const handleWithdrawFromGroup = async () => {
    if (isFinalized) {
      toast.error('Cannot withdraw from a finalized group. Please contact your supervisor.');
      return;
    }

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
      toast.success('You have withdrawn from the group');
    } catch (err: any) {
      console.error('Withdraw error:', err);
      toast.error(err.response?.data?.error || 'Failed to leave group');
    } finally {
      setLoading(false);
    }
  };

  if (loading && !hasGroup) {
    return (
      <div className="p-8 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading...</p>
      </div>
    );
  }

  if (hasGroup) {
    return (
      <div className="p-8 max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl text-gray-900 mb-2">My Group (UR-F2)</h1>
          <p className="text-gray-600">Manage your graduation project group</p>
        </div>

        <div className="space-y-6">
          {/* Group Info */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="w-6 h-6 text-indigo-600" />
                    {groupName}
                  </CardTitle>
                  <CardDescription className="mt-2">
                    Group ID: <span className="font-mono text-lg font-bold">{groupId}</span>
                  </CardDescription>
                  {isLeader && (
                    <Badge className="mt-2 bg-indigo-100 text-indigo-800 border-indigo-200">
                      You are the Group Leader
                    </Badge>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handleCopyGroupId}>
                    <Copy className="w-4 h-4 mr-2" />
                    Copy ID
                  </Button>
                  {isFinalized && (
                    <Badge variant="secondary" className="gap-1">
                      <Lock className="w-3 h-3" />
                      Finalized
                    </Badge>
                  )}
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* Members Table */}
          <Card>
            <CardHeader>
              <CardTitle>Group Members</CardTitle>
              <CardDescription>
                {members.length} member{members.length !== 1 ? 's' : ''} in this group
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {members.map(member => (
                    <TableRow key={member.id}>
                      <TableCell>
                        {member.name}
                        {member.id === currentUserId && (
                          <Badge variant="outline" className="ml-2 text-xs">You</Badge>
                        )}
                      </TableCell>
                      <TableCell>{member.email}</TableCell>
                      <TableCell>
                        <Badge variant={member.role === 'Leader' ? 'default' : 'secondary'}>
                          {member.role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-green-600 flex items-center gap-1 text-sm">
                          <CheckCircle className="w-4 h-4" />
                          Active
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {!isFinalized && (
                <div className="mt-6 space-y-4">
                  <div className="flex items-center justify-between p-4 bg-amber-50 border border-amber-200 rounded-lg">
                    <div>
                      <p className="text-sm text-amber-900">
                        Share the Group ID with other students to let them join your group.
                      </p>
                      <p className="text-xs text-amber-700 mt-1">
                        Once all members have joined, finalize the group to proceed with recommendations.
                      </p>
                    </div>
                    {isLeader && (
                      <Button onClick={handleFinalizeGroup} disabled={loading}>
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Finalize Group
                      </Button>
                    )}
                    {!isLeader && members.length < 2 && (
                      <Badge variant="outline">Waiting for more members...</Badge>
                    )}
                  </div>

                  <div className="flex justify-end">
                    <Button variant="outline" onClick={handleWithdrawFromGroup} className="text-red-600 hover:bg-red-50 hover:border-red-200" disabled={loading}>
                      <LogOut className="w-4 h-4 mr-2" />
                      Withdraw from Group
                    </Button>
                  </div>
                </div>
              )}

              {isFinalized && (
                <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <p className="text-sm text-green-900">
                      Group has been finalized. Recommendations are now available in the Recommendations section.
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Group Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Total Members</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl text-indigo-600">{members.length}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Group Status</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-lg">
                  {isFinalized ? (
                    <Badge variant="secondary" className="gap-1">
                      <Lock className="w-3 h-3" />
                      Finalized
                    </Badge>
                  ) : (
                    <Badge variant="outline">Active - Not Finalized</Badge>
                  )}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Recommendations</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-lg">
                  {isFinalized ? (
                    <Badge className="bg-green-600">Available</Badge>
                  ) : (
                    <Badge variant="outline">Pending Finalization</Badge>
                  )}
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // If user doesn't have a group, show create/join form
  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl text-gray-900 mb-2">Group Formation (UR-F2)</h1>
        <p className="text-gray-600">
          Create a new group or join an existing one
        </p>
      </div>

      <Tabs defaultValue="create" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="create">Create New Group</TabsTrigger>
          <TabsTrigger value="join">Join Existing Group</TabsTrigger>
        </TabsList>

        <TabsContent value="create">
          <Card>
            <CardHeader>
              <CardTitle>Create New Group</CardTitle>
              <CardDescription>
                Start a new graduation project group and invite members
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="groupName">Group Name</Label>
                <Input
                  id="groupName"
                  placeholder="Enter a name for your group"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  disabled={loading}
                />
              </div>

              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-900">
                  <strong>Note:</strong> After creating the group, you will receive a unique Group ID. 
                  Share this ID with other students to let them join your group. You will automatically be the group leader.
                </p>
              </div>

              <Button onClick={handleCreateGroup} className="w-full" disabled={loading}>
                <Plus className="w-4 h-4 mr-2" />
                {loading ? 'Creating...' : 'Create Group'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="join">
          <Card>
            <CardHeader>
              <CardTitle>Join Existing Group</CardTitle>
              <CardDescription>
                Enter the Group ID provided by your group leader
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="joinGroupId">Group ID</Label>
                <Input
                  id="joinGroupId"
                  placeholder="Enter the Group ID (e.g., GP-XXXXX)"
                  value={joinGroupId}
                  onChange={(e) => setJoinGroupId(e.target.value.toUpperCase())}
                  disabled={loading}
                />
              </div>

              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-900">
                  <strong>Note:</strong> Contact your group leader to get the Group ID. 
                  You can only be part of one group at a time.
                </p>
              </div>

              <Button onClick={handleJoinGroup} className="w-full" disabled={loading}>
                <Users className="w-4 h-4 mr-2" />
                {loading ? 'Joining...' : 'Join Group'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}