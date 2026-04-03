// frontend/src/components/GroupSettingsPage.tsx
/**
 * Post-finalization weight adjustment page.
 * The leader can change the weighting mode here to regenerate recommendations.
 * Pre-finalization weight selection lives in GroupPage.tsx.
 */
import { useState, useEffect } from 'react';
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from './ui/card';
import { Button } from './ui/button';
import { Label }  from './ui/label';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { Save, Scale, TrendingUp, Users, AlertCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import api from '../services/api';

interface GroupSettingsPageProps {
  groupFinalized: boolean;
  isLeader:       boolean;
  onWeightsUpdated: () => void;
}

export default function GroupSettingsPage({
  groupFinalized, isLeader, onWeightsUpdated,
}: GroupSettingsPageProps) {
  const [mode,    setMode]    = useState('balanced');
  const [loading, setLoading] = useState(false);
  const [saving,  setSaving]  = useState(false);

  useEffect(() => {
    if (groupFinalized && isLeader) {
      setLoading(true);
      api.get('/group/weights')
        .then(r => setMode(r.data.weighting_mode ?? 'balanced'))
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, [groupFinalized, isLeader]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put('/group/weights', { weighting_mode: mode });
      toast.success('Weights updated — recommendations are being regenerated');
      onWeightsUpdated();
    } catch (err: any) {
      toast.error(err.response?.data?.error ?? 'Failed to save settings');
    } finally { setSaving(false); }
  };

  if (!groupFinalized) {
    return (
      <div className="p-8 max-w-3xl mx-auto">
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="py-12 text-center">
            <AlertCircle className="w-14 h-14 text-amber-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Group Not Finalized</h3>
            <p className="text-gray-500 text-sm max-w-sm mx-auto">
              Weight settings can be adjusted here after your group is finalized.
              To set weights before finalization, go to the&nbsp;
              <strong>My Group</strong> page.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isLeader) {
    return (
      <div className="p-8 max-w-3xl mx-auto">
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="py-12 text-center">
            <Users className="w-14 h-14 text-blue-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Leader Only</h3>
            <p className="text-gray-500 text-sm max-w-sm mx-auto">
              Only the group leader can adjust the recommendation weighting.
              Ask your group leader to change these settings if needed.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-8 flex justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  const options = [
    {
      value: 'balanced',
      label: 'Balanced (50% / 50%)',
      desc:  'Equal weight for academic background and personal interests',
    },
    {
      value: 'courses_heavy',
      label: 'Competency-Focused (75% / 25%)',
      desc:  'Prioritises projects that match the group\'s academic performance',
    },
    {
      value: 'interests_heavy',
      label: 'Interest-Focused (25% / 75%)',
      desc:  'Prioritises projects aligned with the group\'s selected domains and RDIA priorities',
    },
  ];

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl text-gray-900 mb-2">Group Settings</h1>
        <p className="text-gray-500 text-sm">
          Adjust how recommendations are weighted. Saving will regenerate recommendations immediately.
        </p>
      </div>

      <div className="space-y-6">

        <Card className="border-indigo-200 bg-gradient-to-r from-indigo-50 to-purple-50">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-start gap-3">
              <Scale className="w-5 h-5 text-indigo-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-indigo-800">
                <strong>How it works:</strong> The recommender combines two signals —
                <em> Competency</em> (courses + grades) and
                <em> Interests</em> (selected domains + RDIA priority).
                Choose the balance that best reflects your group's focus.
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-purple-600" /> Weighting Mode
            </CardTitle>
            <CardDescription>Select a preset weighting</CardDescription>
          </CardHeader>
          <CardContent>
            <RadioGroup value={mode} onValueChange={setMode} className="space-y-3">
              {options.map(opt => (
                <div
                  key={opt.value}
                  className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                    mode === opt.value ? 'border-indigo-400 bg-indigo-50' : 'border-gray-200 hover:bg-gray-50'
                  }`}
                  onClick={() => setMode(opt.value)}
                >
                  <RadioGroupItem value={opt.value} id={`ps-${opt.value}`} className="mt-0.5" />
                  <div>
                    <Label htmlFor={`ps-${opt.value}`} className="font-medium cursor-pointer">
                      {opt.label}
                    </Label>
                    <p className="text-xs text-gray-500 mt-0.5">{opt.desc}</p>
                  </div>
                </div>
              ))}
            </RadioGroup>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6"
          >
            {saving
              ? <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              : <Save className="w-4 h-4 mr-2" />}
            {saving ? 'Saving…' : 'Save & Regenerate Recommendations'}
          </Button>
        </div>

      </div>
    </div>
  );
}
