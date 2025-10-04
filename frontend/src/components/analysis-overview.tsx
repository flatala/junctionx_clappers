import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { AlertTriangle, Eye, Clock } from 'lucide-react';
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

export default function AnalysisOverview({ segments, summaryData }: AnalysisOverviewProps) {
  const problematicSegments = segments.filter(s => s.flag !== 'neutral');
  
  const getRiskColor = (level: string) => {
    switch (level) {
      case 'high': return 'text-destructive';
      case 'medium': return 'text-orange-500';
      case 'low': return 'text-green-500';
      default: return 'text-muted-foreground';
    }
  };

  const getRiskBg = (level: string) => {
    switch (level) {
      case 'high': return 'bg-destructive/10 border-destructive/20';
      case 'medium': return 'bg-orange-50 border-orange-200 dark:bg-orange-950 dark:border-orange-800';
      case 'low': return 'bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800';
      default: return 'bg-muted/10 border-muted/20';
    }
  };

  return (
    <div className="space-y-6">
      {/* Risk Level Alert */}
      <Card className={`${getRiskBg(summaryData.riskLevel)} border-2`}>
        <CardContent className="p-6">
          <div className="flex items-center gap-3">
            <AlertTriangle className={`h-8 w-8 ${getRiskColor(summaryData.riskLevel)}`} />
            <div>
              <h3 className="text-lg font-semibold capitalize">
                {summaryData.riskLevel} Risk Content Detected
              </h3>
              <p className="text-sm text-muted-foreground">
                {summaryData.breakdown.extremist > 0 
                  ? `Found ${summaryData.breakdown.extremist} extremist segments requiring immediate attention`
                  : summaryData.breakdown.mild > 0
                    ? `Found ${summaryData.breakdown.mild} segments with minor concerns`
                    : 'Content appears to be safe with no significant issues detected'
                }
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <Clock className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Total Duration</p>
            <p className="text-xl font-semibold">{summaryData.totalDuration}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <AlertTriangle className="h-6 w-6 mx-auto mb-2 text-orange-500" />
            <p className="text-sm text-muted-foreground">Flagged Content</p>
            <p className="text-xl font-semibold">{summaryData.flaggedPercentage}%</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <Eye className="h-6 w-6 mx-auto mb-2 text-blue-500" />
            <p className="text-sm text-muted-foreground">Segments Analyzed</p>
            <p className="text-xl font-semibold">{summaryData.breakdown.total}</p>
          </CardContent>
        </Card>
      </div>

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