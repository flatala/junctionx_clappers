import { ScrollArea } from './ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { MessageSquare } from 'lucide-react';
import TranscriptSegmentItem from './transcript-segment-item';
import type { FlagType } from './flag-icon';

export interface TranscriptSegment {
  id: string;
  timestamp: string;
  text: string;
  confidence: number;
  flag: FlagType;
  explanation?: string;
}

interface TranscriptViewProps {
  segments: TranscriptSegment[];
  isVisible: boolean;
}

export default function TranscriptView({ segments, isVisible }: TranscriptViewProps) {
  if (!isVisible) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Transcript Analysis
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-96 w-full">
          <div className="space-y-3">
            {segments.map((segment) => (
              <TranscriptSegmentItem
                key={segment.id}
                {...segment}
              />
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}