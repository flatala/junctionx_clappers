import { useMemo } from 'react';
import type { AnalysisSpan } from '@/lib/api';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface InteractiveTranscriptProps {
  transcriptText: string;
  spans: AnalysisSpan[];
  onSpanClick?: (spanStart: string) => void;
}

// Parse time string to seconds
const parseTimeToSeconds = (timeStr: string): number => {
  const parts = timeStr.split(':');
  const seconds = parseFloat(parts[parts.length - 1]);
  const minutes = parts.length > 1 ? parseInt(parts[parts.length - 2]) : 0;
  const hours = parts.length > 2 ? parseInt(parts[parts.length - 3]) : 0;
  return hours * 3600 + minutes * 60 + seconds;
};

// Get color based on confidence level - smooth linear gradient from yellow to red
const getConfidenceStyles = (confidence: number) => {
  // confidence is 0-1, convert to percentage for calculation
  const percentage = confidence * 100;
  
  // Calculate RGB values for smooth gradient: yellow (255,255,0) -> orange -> red (255,0,0)
  // As confidence increases, reduce green from 255 to 0
  const red = 255;
  const green = Math.round(255 * (1 - confidence)); // Decreases from 255 to 0
  const blue = 0;
  
  // Create colors with opacity for better readability
  const backgroundColor = `rgba(${red}, ${green}, ${blue}, 0.25)`;
  const borderColor = `rgb(${Math.max(200, red - 55)}, ${Math.max(0, green - 55)}, ${blue})`;
  
  // Calculate text color for contrast
  const textColor = percentage > 70 ? 'rgb(139, 0, 0)' : 'rgb(139, 69, 0)'; // Dark red or dark orange
  
  return {
    backgroundColor,
    borderBottom: `2px solid ${borderColor}`,
    color: textColor,
  };
};

interface TextSegment {
  text: string;
  span?: AnalysisSpan;
  isHighlighted: boolean;
}

export default function InteractiveTranscript({ transcriptText, spans, onSpanClick }: InteractiveTranscriptProps) {
  // Process transcript to create segments with highlighting
  const segments = useMemo(() => {
    if (!spans || spans.length === 0) {
      return [{ text: transcriptText, isHighlighted: false }];
    }

    // Sort spans by start time
    const sortedSpans = [...spans].sort((a, b) => {
      return parseTimeToSeconds(a.start) - parseTimeToSeconds(b.start);
    });

    const result: TextSegment[] = [];
    let lastIndex = 0;

    sortedSpans.forEach((span) => {
      const spanText = span.text;
      const spanIndex = transcriptText.indexOf(spanText, lastIndex);

      if (spanIndex !== -1) {
        // Add non-highlighted text before this span
        if (spanIndex > lastIndex) {
          result.push({
            text: transcriptText.slice(lastIndex, spanIndex),
            isHighlighted: false,
          });
        }

        // Add highlighted span
        result.push({
          text: spanText,
          span: span,
          isHighlighted: true,
        });

        lastIndex = spanIndex + spanText.length;
      }
    });

    // Add remaining text
    if (lastIndex < transcriptText.length) {
      result.push({
        text: transcriptText.slice(lastIndex),
        isHighlighted: false,
      });
    }

    return result;
  }, [transcriptText, spans]);

  const handleSpanClick = (span: AnalysisSpan) => {
    if (onSpanClick) {
      onSpanClick(span.start);
    }
  };

  return (
    <TooltipProvider>
      <div className="text-sm leading-relaxed whitespace-pre-wrap">
        {segments.map((segment, index) => {
          if (segment.isHighlighted && segment.span) {
            return (
              <Tooltip key={index} delayDuration={200}>
                <TooltipTrigger asChild>
                  <span
                    className="px-1 py-0.5 rounded cursor-pointer transition-all font-medium"
                    style={getConfidenceStyles(segment.span.confidence)}
                    onClick={() => handleSpanClick(segment.span!)}
                  >
                    {segment.text}
                  </span>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <div className="space-y-1">
                    <p className="font-semibold text-sm">
                      Confidence: {Math.round(segment.span.confidence * 100)}%
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {segment.span.rationale}
                    </p>
                    <p className="text-xs italic text-muted-foreground/80">
                      Click to play from this point
                    </p>
                  </div>
                </TooltipContent>
              </Tooltip>
            );
          }
          return <span key={index}>{segment.text}</span>;
        })}
      </div>
    </TooltipProvider>
  );
}
