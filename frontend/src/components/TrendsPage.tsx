import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { TrendingUp } from 'lucide-react';

export default function TrendsPage() {
  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl text-gray-900 mb-2">Research Trends Discovery (UR-F6)</h1>
        <p className="text-gray-600">
          Explore rising trends in domains, methodologies, and tools
        </p>
      </div>

      <Card>
        <CardContent className="py-12 text-center">
          <TrendingUp className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl text-gray-900 mb-2">Coming Soon</h3>
          <p className="text-gray-600">
            This feature is under development. It will show emerging trends in research
            domains, popular methodologies, and tools used in past projects.
          </p>
          <p className="text-sm text-gray-500 mt-4">
            The trends will be automatically generated from the project database.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}