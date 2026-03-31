import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { Slider } from './ui/slider';
import { Save, Scale, TrendingUp, Users, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import api from '../services/api';

interface GroupSettingsPageProps {
  groupFinalized: boolean;
  isLeader: boolean;
  onWeightsUpdated: () => void;
}

export default function GroupSettingsPage({ groupFinalized, isLeader, onWeightsUpdated }: GroupSettingsPageProps) {
  const [weightingMode, setWeightingMode] = useState<string>('balanced');
  const [competencyWeight, setCompetencyWeight] = useState<number>(0.5);
  const [interestsWeight, setInterestsWeight] = useState<number>(0.5);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (groupFinalized && isLeader) {
      fetchWeights();
    }
  }, [groupFinalized, isLeader]);

  const fetchWeights = async () => {
    setLoading(true);
    try {
      const response = await api.get('/group/weights');
      setWeightingMode(response.data.weighting_mode);
      setCompetencyWeight(response.data.competency_weight);
      setInterestsWeight(response.data.interests_weight);
    } catch (err: any) {
      console.error('Error fetching weights:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleModeChange = (mode: string) => {
    setWeightingMode(mode);
    if (mode === 'courses_heavy') {
      setCompetencyWeight(0.75);
      setInterestsWeight(0.25);
    } else if (mode === 'interests_heavy') {
      setCompetencyWeight(0.25);
      setInterestsWeight(0.75);
    } else {
      setCompetencyWeight(0.5);
      setInterestsWeight(0.5);
    }
  };

  const handleCompetencyChange = (value: number[]) => {
    const newCompWeight = value[0];
    setCompetencyWeight(newCompWeight);
    setInterestsWeight(1 - newCompWeight);
    
    if (newCompWeight > 0.6) {
      setWeightingMode('courses_heavy');
    } else if (newCompWeight < 0.4) {
      setWeightingMode('interests_heavy');
    } else {
      setWeightingMode('balanced');
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put('/group/weights', {
        weighting_mode: weightingMode,
        competency_weight: competencyWeight,
        interests_weight: interestsWeight
      });
      toast.success('Settings saved! Recommendations have been updated.');
      onWeightsUpdated();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (!groupFinalized) {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <Card className="border-amber-200 bg-gradient-to-r from-amber-50 to-yellow-50">
          <CardContent className="py-12">
            <div className="text-center">
              <AlertCircle className="w-16 h-16 text-amber-600 mx-auto mb-4" />
              <h3 className="text-xl text-gray-900 mb-2">Group Not Finalized</h3>
              <p className="text-gray-600 max-w-md mx-auto">
                Group settings will be available after your group is finalized.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isLeader) {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <Card className="border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50">
          <CardContent className="py-12">
            <div className="text-center">
              <Users className="w-16 h-16 text-blue-600 mx-auto mb-4" />
              <h3 className="text-xl text-gray-900 mb-2">Group Settings</h3>
              <p className="text-gray-600 max-w-md mx-auto">
                Only the group leader can adjust recommendation weights.
                Please contact your group leader to modify these settings.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-8 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading settings...</p>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl text-gray-900 mb-2">Group Settings</h1>
        <p className="text-gray-600">
          Adjust how recommendations are weighted for your group
        </p>
      </div>

      <div className="space-y-6">
        <Card className="border-indigo-200 bg-gradient-to-r from-indigo-50 to-purple-50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <Scale className="w-6 h-6 text-indigo-600 mt-1 flex-shrink-0" />
              <div>
                <p className="text-indigo-900">
                  <strong>How recommendations work:</strong> The system balances two factors:
                </p>
                <ul className="text-sm text-indigo-800 mt-2 space-y-1">
                  <li>• <strong>Competency:</strong> Based on courses taken and grades achieved</li>
                  <li>• <strong>Interests:</strong> Based on selected domains and priorities</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-purple-600" />
              Recommendation Balance
            </CardTitle>
            <CardDescription>
              Choose a preset or customize using the slider below
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RadioGroup value={weightingMode} onValueChange={handleModeChange} className="space-y-3">
              <div className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-gray-50">
                <RadioGroupItem value="balanced" id="balanced" />
                <div className="flex-1">
                  <Label htmlFor="balanced" className="font-medium cursor-pointer">
                    Balanced (50/50)
                  </Label>
                  <p className="text-sm text-gray-500">Equal weight to academic background and personal interests</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-gray-50">
                <RadioGroupItem value="courses_heavy" id="courses_heavy" />
                <div className="flex-1">
                  <Label htmlFor="courses_heavy" className="font-medium cursor-pointer">
                    Competency Focused (75/25)
                  </Label>
                  <p className="text-sm text-gray-500">Prioritizes projects matching your academic performance</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-gray-50">
                <RadioGroupItem value="interests_heavy" id="interests_heavy" />
                <div className="flex-1">
                  <Label htmlFor="interests_heavy" className="font-medium cursor-pointer">
                    Interest Focused (25/75)
                  </Label>
                  <p className="text-sm text-gray-500">Prioritizes projects matching your selected interests</p>
                </div>
              </div>
            </RadioGroup>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Custom Weight Adjustment</CardTitle>
            <CardDescription>
              Drag the slider to fine-tune the balance
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="flex justify-between">
                <Label className="text-indigo-700">Competency (Courses & Grades)</Label>
                <span className="text-lg font-bold text-indigo-600">{Math.round(competencyWeight * 100)}%</span>
              </div>
              <Slider
                value={[competencyWeight]}
                onValueChange={handleCompetencyChange}
                min={0}
                max={1}
                step={0.05}
                className="w-full"
              />
              <div className="flex justify-between text-sm text-gray-500">
                <span>Interests</span>
                <span>Balanced</span>
                <span>Competency</span>
              </div>
            </div>

            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">
                <strong>Current Settings:</strong> {Math.round(competencyWeight * 100)}% Competency, {Math.round(interestsWeight * 100)}% Interests
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving} className="bg-gradient-to-r from-indigo-600 to-purple-600">
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Saving...' : 'Save Settings & Update Recommendations'}
          </Button>
        </div>
      </div>
    </div>
  );
}