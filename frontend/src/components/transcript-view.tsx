import { ScrollArea } from './ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { useState, forwardRef } from 'react';
import type { FlagType } from './flag-icon';
import ConfidenceMediaPlayer, { type ConfidenceMediaPlayerRef } from './confidence-media-player';
import type { AnalysisSpan } from '@/lib/api';

export interface TranscriptSegment {
  id: string;
  timestamp: string;
  text: string;
  flag: FlagType;
  explanation?: string;
}

interface TranscriptViewProps {
  segments: TranscriptSegment[];
  isVisible: boolean;
  audioFile?: File;
  spans?: AnalysisSpan[];
}



const TranscriptView = forwardRef<ConfidenceMediaPlayerRef, TranscriptViewProps>(
  ({ segments, isVisible, audioFile, spans }, ref) => {
  const [activeSegmentId, setActiveSegmentId] = useState<string | null>(null);

  if (!isVisible) return null;

  const handleSegmentClick = (segmentId: string) => {
    setActiveSegmentId(segmentId);
  };

  return (
    <div className="space-y-6">
      {/* Audio Media Player with Confidence Graph */}
      {audioFile && (
        <ConfidenceMediaPlayer ref={ref} audioFile={audioFile} spans={spans} />
      )}

      {/* Interactive Transcript */}
      {/* <Card>
        <CardHeader>
          <CardTitle>Interactive Transcript</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-96">
            <div className="space-y-4">
              {segments.map((segment) => {
                const isActive = activeSegmentId === segment.id;

                return (
                  <div
                    key={segment.id}
                    className={`p-4 rounded-lg border-l-4 cursor-pointer transition-all ${
                      segment.flag === 'extremist'
                        ? 'border-l-destructive bg-destructive/5 hover:bg-destructive/10'
                        : segment.flag === 'mild'
                          ? 'border-l-orange-500 bg-orange-50 hover:bg-orange-100 dark:bg-orange-950/20'
                          : 'border-l-primary/20 bg-muted/20 hover:bg-muted/30'
                    } ${isActive ? 'ring-2 ring-primary' : ''}`}
                    onClick={() => handleSegmentClick(segment.id)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-mono text-muted-foreground font-medium">
                        {segment.timestamp}
                      </span>
                      {segment.flag !== 'neutral' && (
                        <span
                          className={`text-xs px-2 py-1 rounded-full font-medium ${
                            segment.flag === 'extremist'
                              ? 'bg-destructive text-destructive-foreground'
                              : 'bg-orange-500 text-white'
                          }`}
                        >
                          {segment.flag === 'extremist' ? 'HARMFUL' : 'MINOR'}
                        </span>
                      )}
                    </div>

                    <p
                      className={`text-base leading-relaxed mb-2 ${
                        segment.flag === 'extremist'
                          ? 'text-destructive font-medium'
                          : segment.flag === 'mild'
                            ? 'text-orange-700 dark:text-orange-300'
                            : 'text-foreground'
                      }`}
                    >
                      {segment.text}
                    </p>

                    {segment.explanation && (
                      <div className="bg-muted/50 rounded-md p-3 border-l-2 border-muted-foreground/20">
                        <p className="text-sm text-muted-foreground italic leading-relaxed">
                          <strong className="font-medium not-italic">Analysis:</strong>{' '}
                          {segment.explanation}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </CardContent>
      </Card> */}
    </div>
  );
});

TranscriptView.displayName = 'TranscriptView';

export default TranscriptView;