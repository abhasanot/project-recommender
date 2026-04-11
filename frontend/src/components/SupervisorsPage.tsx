import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Lightbulb } from 'lucide-react';

interface SupervisorsPageProps {
  groupFinalized: boolean;
}

export default function SupervisorsPage({ groupFinalized }: SupervisorsPageProps) {
  if (!groupFinalized) {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl text-gray-900 mb-2">Supervisor Recommendations</h1>
          <p className="text-gray-600">Find the perfect supervisor based on your interests</p>
        </div>

        <Card className="border-amber-200 bg-gradient-to-r from-amber-50 to-yellow-50">
          <CardContent className="py-12">
            <div className="text-center">
              <Lightbulb className="w-16 h-16 text-amber-600 mx-auto mb-4" />
              <h3 className="text-xl text-gray-900 mb-2">Group Not Finalized</h3>
              <p className="text-gray-600 max-w-md mx-auto">
                Supervisor recommendations will be available once your group is finalized.
                Please complete your group formation in the "My Group" section.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl text-gray-900 mb-2">Supervisor Recommendations</h1>
        <p className="text-gray-600">Find the perfect supervisor based on your interests</p>
      </div>

      <Card>
        <CardContent className="py-12 text-center">
          <Lightbulb className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl text-gray-900 mb-2">Coming Soon</h3>
          <p className="text-gray-600">
            This feature is under development.
          </p>
          <p className="text-sm text-gray-500 mt-4">
           ...
          </p>
        </CardContent>
      </Card>
    </div>
  );
}