import { useMemo, useCallback, useState } from 'react';
import type { AnalysisSpan } from '@/lib/api';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { AlertTriangle, CheckCircle } from 'lucide-react';

interface InteractiveTranscriptProps {
  transcriptText: string;
  spans: AnalysisSpan[];
  onSpanClick?: (spanStart: string) => void;
  onMarkAsExtremist?: (text: string, originalConfidence?: number) => void;
  onMarkAsNormal?: (text: string, originalConfidence?: number) => void;
  userFeedback?: Array<{ text: string; feedback_type: string }>;
}

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
  userFeedback?: { text: string; feedback_type: string };
}

export default function InteractiveTranscript({ 
  transcriptText, 
  spans, 
  onSpanClick,
  onMarkAsExtremist,
  onMarkAsNormal,
  userFeedback = []
}: InteractiveTranscriptProps) {
  // State for text selection popup
  const [selectedText, setSelectedText] = useState<string>('');
  const [showPopup, setShowPopup] = useState(false);
  const [popupPosition, setPopupPosition] = useState({ x: 0, y: 0 });

  // Check if text has user feedback
  const hasUserFeedback = useCallback((text: string) => {
    return userFeedback.find(f => f.text === text);
  }, [userFeedback]);

  // Handle text selection for marking as extremist
  const handleMouseUp = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    const selection = window.getSelection();
    const text = selection?.toString().trim();
    
    if (text && text.length > 0 && onMarkAsExtremist) {
      // Check if selected text is already highlighted
      const isAlreadyHighlighted = spans.some(span => 
        span.text.includes(text) || text.includes(span.text)
      );
      const hasExistingFeedback = userFeedback.some(f => f.text === text);
      
      if (!isAlreadyHighlighted && !hasExistingFeedback) {
        const range = selection?.getRangeAt(0);
        const rect = range?.getBoundingClientRect();
        const containerRect = event.currentTarget.getBoundingClientRect();
        
        if (rect && containerRect) {
          setSelectedText(text);
          // Position relative to the container
          setPopupPosition({
            x: rect.left - containerRect.left + rect.width / 2,
            y: rect.top - containerRect.top - 10
          });
          setShowPopup(true);
        }
      }
    } else {
      setShowPopup(false);
    }
  }, [spans, userFeedback, onMarkAsExtremist]);

  const handleMarkSelectedAsExtremist = useCallback(() => {
    if (selectedText && onMarkAsExtremist) {
      onMarkAsExtremist(selectedText);
      setShowPopup(false);
      setSelectedText('');
      window.getSelection()?.removeAllRanges();
    }
  }, [selectedText, onMarkAsExtremist]);

  // Close popup when clicking outside
  const handleClick = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    // Don't close if clicking the popup button
    if (!target.closest('[data-popup-button]')) {
      setShowPopup(false);
    }
  }, []);

  // Prevent default context menu
  const handleContextMenu = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    event.preventDefault();
  }, []);

  // Process transcript to create segments with highlighting
  const segments = useMemo(() => {
    // Combine AI-detected spans and user feedback into a unified list of highlights
    const allHighlights: Array<{
      text: string;
      start?: string;
      span?: AnalysisSpan;
      userFeedback?: { text: string; feedback_type: string };
      position: number;
    }> = [];

    // Add AI-detected spans
    if (spans && spans.length > 0) {
      spans.forEach(span => {
        const index = transcriptText.indexOf(span.text);
        if (index !== -1) {
          allHighlights.push({
            text: span.text,
            start: span.start,
            span: span,
            position: index,
          });
        }
      });
    }

    // Add user feedback highlights that aren't already covered by AI spans
    userFeedback.forEach(feedback => {
      const index = transcriptText.indexOf(feedback.text);
      if (index !== -1) {
        // Check if this feedback overlaps with an existing span
        const overlapsWithSpan = allHighlights.some(h => {
          const hStart = h.position;
          const hEnd = h.position + h.text.length;
          const fStart = index;
          const fEnd = index + feedback.text.length;
          
          // Check for overlap
          return (fStart >= hStart && fStart < hEnd) || 
                 (fEnd > hStart && fEnd <= hEnd) ||
                 (fStart <= hStart && fEnd >= hEnd);
        });

        if (!overlapsWithSpan) {
          allHighlights.push({
            text: feedback.text,
            userFeedback: feedback,
            position: index,
          });
        }
      }
    });

    // Sort by position in transcript
    allHighlights.sort((a, b) => a.position - b.position);

    // Build segments
    const result: TextSegment[] = [];
    let lastIndex = 0;

    allHighlights.forEach((highlight) => {
      const highlightIndex = highlight.position;

      if (highlightIndex > lastIndex) {
        // Add non-highlighted text before this highlight
        result.push({
          text: transcriptText.slice(lastIndex, highlightIndex),
          isHighlighted: false,
        });
      }

      // Add highlighted segment
      result.push({
        text: highlight.text,
        span: highlight.span,
        isHighlighted: true,
        userFeedback: highlight.userFeedback,
      });

      lastIndex = highlightIndex + highlight.text.length;
    });

    // Add remaining text
    if (lastIndex < transcriptText.length) {
      result.push({
        text: transcriptText.slice(lastIndex),
        isHighlighted: false,
      });
    }

    return result;
  }, [transcriptText, spans, userFeedback]);

  const handleSpanClick = (span: AnalysisSpan) => {
    if (onSpanClick) {
      onSpanClick(span.start);
    }
  };

  return (
    <TooltipProvider>
      <div 
        className="text-sm leading-relaxed whitespace-pre-wrap select-text cursor-text relative"
        onMouseUp={handleMouseUp}
        onClick={handleClick}
        onContextMenu={handleContextMenu}
      >
        {/* Selection popup for marking text as extremist */}
        {showPopup && (
          <div
            className="absolute z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-2"
            style={{
              left: `${popupPosition.x}px`,
              top: `${popupPosition.y}px`,
              transform: 'translate(-50%, -100%)',
              pointerEvents: 'auto',
            }}
            data-popup-button
          >
            <Button
              size="sm"
              variant="outline"
              onClick={handleMarkSelectedAsExtremist}
              className="flex items-center gap-1 text-xs whitespace-nowrap"
              data-popup-button
            >
              <AlertTriangle className="w-3 h-3" />
              Mark as Extremist
            </Button>
          </div>
        )}
        {segments.map((segment, index) => {
          // Use segment's userFeedback if available, otherwise check by text
          const feedback = segment.userFeedback || hasUserFeedback(segment.text);

          if (segment.isHighlighted) {
            // This is a highlighted segment (either AI-detected or user-marked)
            
            if (segment.span) {
              // AI-detected span
              const baseStyles = getConfidenceStyles(segment.span.confidence);
              
              // Apply different styles based on user feedback
              let customStyles = baseStyles;
              let icon = null;
              
              if (feedback) {
                if (feedback.feedback_type === 'negative') {
                  // User marked AI detection as normal - show green
                  customStyles = {
                    backgroundColor: 'rgba(34, 197, 94, 0.25)',
                    borderBottom: '2px solid rgb(34, 197, 94)',
                    color: 'rgb(21, 128, 61)',
                  };
                  icon = <CheckCircle className="inline w-3 h-3 ml-1" />;
                } else {
                  // User confirmed as extremist
                  icon = <AlertTriangle className="inline w-3 h-3 ml-1" />;
                }
              }
              
              return (
                <Tooltip key={index} delayDuration={200}>
                  <TooltipTrigger asChild>
                    <span
                      className="px-1 py-0.5 rounded cursor-pointer transition-all font-medium relative"
                      style={customStyles}
                      onClick={() => handleSpanClick(segment.span!)}
                    >
                      {segment.text}
                      {icon}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <div className="space-y-2">
                      <p className="font-semibold text-sm">
                        Confidence: {Math.round(segment.span.confidence * 100)}%
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {segment.span.rationale}
                      </p>
                      {feedback && (
                        <p className="text-xs font-semibold text-green-600">
                          {feedback.feedback_type === 'negative' 
                            ? '✓ Marked as normal by user' 
                            : '⚠ User confirmed as extremist'}
                        </p>
                      )}
                      <div className="pt-2 border-t space-y-2">
                        {!feedback && onMarkAsNormal && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              onMarkAsNormal(segment.text, segment.span!.confidence);
                            }}
                            className="w-full flex items-center justify-center gap-1 text-xs"
                          >
                            <CheckCircle className="w-3 h-3" />
                            Mark as Normal
                          </Button>
                        )}
                        <p className="text-xs italic text-muted-foreground/80">
                          Click to play from this point
                        </p>
                      </div>
                    </div>
                  </TooltipContent>
                </Tooltip>
              );
            } else if (feedback && feedback.feedback_type === 'positive') {
              // User-marked as extremist (not AI-detected)
              return (
                <Tooltip key={index} delayDuration={200}>
                  <TooltipTrigger asChild>
                    <span
                      className="px-1 py-0.5 rounded font-medium cursor-default"
                      style={{
                        backgroundColor: 'rgba(251, 146, 60, 0.25)',
                        borderBottom: '2px solid rgb(251, 146, 60)',
                        color: 'rgb(154, 52, 18)',
                      }}
                    >
                      {segment.text}
                      <AlertTriangle className="inline w-3 h-3 ml-1" />
                    </span>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-orange-600">
                        ⚠ Marked as extremist by user
                      </p>
                      <p className="text-xs text-muted-foreground">
                        This content was not detected by AI but flagged by a human reviewer
                      </p>
                    </div>
                  </TooltipContent>
                </Tooltip>
              );
            }
          }
          
          // Plain text segment
          return <span key={index}>{segment.text}</span>;
        })}
      </div>
    </TooltipProvider>
  );
}
