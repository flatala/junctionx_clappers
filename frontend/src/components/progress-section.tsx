import { Progress } from './ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Loader2 } from 'lucide-react';

interface ProgressSectionProps {
  progress: number;
  stage: string;
  isVisible: boolean;
}

export default function ProgressSection({ progress, stage, isVisible }: ProgressSectionProps) {
  if (!isVisible) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Loader2 className="h-5 w-5 animate-spin" />
          Analysis in Progress
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="font-medium">{stage}</span>
            <span className="text-muted-foreground">{progress}%</span>
          </div>
          <Progress value={progress} className="w-full" />
        </div>
        <p className="text-sm text-muted-foreground">
          This may take a few minutes depending on file size...
        </p>
      </CardContent>
    </Card>
  );
}