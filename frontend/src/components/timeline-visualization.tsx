import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Zap } from 'lucide-react';

interface TimelineVisualizationProps {
  totalDuration: string;
}

export default function TimelineVisualization({ totalDuration }: TimelineVisualizationProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5" />
          Content Timeline
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>0:00</span>
            <span>{totalDuration}</span>
          </div>
          <div className="h-8 bg-muted rounded-full overflow-hidden flex">
            {/* Mock timeline segments - in real app this would be dynamic */}
            <div className="bg-primary h-full" style={{ width: '45%' }}></div>
            <div className="bg-secondary h-full" style={{ width: '8%' }}></div>
            <div className="bg-primary h-full" style={{ width: '35%' }}></div>
            <div className="bg-destructive h-full" style={{ width: '6%' }}></div>
            <div className="bg-primary h-full" style={{ width: '6%' }}></div>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-primary rounded"></div>
              <span>Clean Content</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-secondary rounded"></div>
              <span>Minor Issues</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-destructive rounded"></div>
              <span>Harmful Content</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}