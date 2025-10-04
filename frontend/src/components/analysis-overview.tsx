import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { AlertTriangle } from 'lucide-react';
import type { TranscriptSegment } from './transcript-view';

interface AnalysisOverviewProps {
  segments: TranscriptSegment[];
  summaryData: {
    totalDuration: string;
    flaggedDuration: string;
    flaggedPercentage: number;
    segmentsFlagged: number;
    riskLevel: 'low' | 'medium' | 'high';
    breakdown: {
      total: number;
      neutral: number;
      mild: number;
      extremist: number;
    };
  };
}

export default function AnalysisOverview({ segments }: AnalysisOverviewProps) {
  const problematicSegments = segments.filter(s => s.flag !== 'neutral');
  
  return (
    <div className="space-y-6">
      {/* Problematic Content Quick View */}
      {problematicSegments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              Flagged Content Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {problematicSegments.slice(0, 3).map((segment) => (
                <div 
                  key={segment.id}
                  className={`p-3 rounded-lg border-l-4 ${
                    segment.flag === 'extremist' 
                      ? 'border-l-destructive bg-destructive/5' 
                      : 'border-l-orange-500 bg-orange-50 dark:bg-orange-950/20'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-mono text-muted-foreground">
                      {segment.timestamp}
                    </span>
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                      segment.flag === 'extremist' 
                        ? 'bg-destructive text-destructive-foreground' 
                        : 'bg-orange-500 text-white'
                    }`}>
                      {segment.flag === 'extremist' ? 'HARMFUL' : 'MINOR'}
                    </span>
                  </div>
                  <p className="text-sm font-medium mb-1">"{segment.text}"</p>
                  {segment.explanation && (
                    <p className="text-xs text-muted-foreground italic">
                      {segment.explanation}
                    </p>
                  )}
                </div>
              ))}
              {problematicSegments.length > 3 && (
                <p className="text-sm text-muted-foreground text-center py-2">
                  ... and {problematicSegments.length - 3} more flagged segments
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}