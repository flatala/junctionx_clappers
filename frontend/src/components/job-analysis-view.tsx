import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { api, type JobAnalysisResult } from '@/lib/api';
import TranscriptView, { type TranscriptSegment } from './transcript-view';
import SummaryPanel from './summary-panel';
import ErrorAlert from './error-alert';
import { useExport } from '@/hooks/use-export';
import type { FlagType } from './flag-icon';
import InteractiveTranscript from './interactive-transcript';

// Helper function to parse time string to seconds
const parseTimeToSeconds = (timeStr: string): number => {
  const parts = timeStr.split(':');
  const seconds = parseFloat(parts[parts.length - 1]);
  const minutes = parts.length > 1 ? parseInt(parts[parts.length - 2]) : 0;
  const hours = parts.length > 2 ? parseInt(parts[parts.length - 3]) : 0;
  return hours * 3600 + minutes * 60 + seconds;
};

// Helper function to format seconds to timestamp
const formatTimestamp = (start: number, end: number): string => {
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };
  
  return `[${formatTime(start)}–${formatTime(end)}]`;
};

// Convert API response to format expected by existing components
const convertToTranscriptSegments = (analysisResult: JobAnalysisResult): TranscriptSegment[] => {
  return analysisResult.spans.map((span, index) => {
    const startSeconds = parseTimeToSeconds(span.start);
    const endSeconds = parseTimeToSeconds(span.end);
    
    // Determine flag type based on content or rationale
    let flag: FlagType = 'extremist'; // Default to extremist since these are flagged spans
    if (span.rationale.toLowerCase().includes('mild') || span.rationale.toLowerCase().includes('minor')) {
      flag = 'mild';
    }
    
    return {
      id: String(index + 1),
      timestamp: formatTimestamp(startSeconds, endSeconds),
      text: span.text,
      flag,
      explanation: span.rationale
    };
  });
};

export default function JobAnalysisView() {
  const { batchId, jobId } = useParams<{ batchId: string; jobId: string }>();
  const navigate = useNavigate();
  const [analysisResult, setAnalysisResult] = useState<JobAnalysisResult | null>(null);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);

  // Convert analysis result to transcript segments
  const transcriptSegments = analysisResult ? convertToTranscriptSegments(analysisResult) : [];
  
  const { summaryData, handleDownloadJson, handleDownloadCsv } = useExport(
    audioFile,
    transcriptSegments
  );

  useEffect(() => {
    if (batchId && jobId) {
      loadJobAnalysis();
    }
  }, [batchId, jobId]);

  const loadJobAnalysis = async () => {
    if (!batchId || !jobId) return;
    
    setIsLoading(true);
    try {
      const result = await api.getJob(batchId, jobId);
      setAnalysisResult(result);
      // Automatically load the audio file after getting analysis
      await loadAudioFile();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to load job analysis');
    } finally {
      setIsLoading(false);
    }
  };

  const loadAudioFile = async () => {
    if (!batchId || !jobId) return;
    
    setIsLoadingAudio(true);
    try {
      const audioBlob = await api.getJobAudioFile(batchId, jobId);
      const file = new File([audioBlob], analysisResult?.audio_file_id || 'audio.wav', {
        type: audioBlob.type
      });
      setAudioFile(file);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to load audio file');
    } finally {
      setIsLoadingAudio(false);
    }
  };

  const clearError = () => setError(null);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading analysis results...</p>
        </div>
      </div>
    );
  }

  if (!analysisResult) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate(`/${batchId}`)}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Batch
          </Button>
        </div>
        <Card className="h-96 flex items-center justify-center">
          <CardContent className="text-center">
            <h3 className="text-lg font-medium mb-2">Analysis not found</h3>
            <p className="text-muted-foreground">
              The requested analysis could not be found
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <ErrorAlert error={error} onDismiss={clearError} />
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate(`/${batchId}`)}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Batch
          </Button>
        </div>
        {isLoadingAudio && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
            Loading audio file...
          </div>
        )}
      </div>

      {/* Analysis Header */}
      <Card>
        <CardHeader>
          <CardTitle>{analysisResult.audio_file_id}</CardTitle>
          <CardDescription>
            Analysis completed • {transcriptSegments.length} potential issue{transcriptSegments.length !== 1 ? 's' : ''} found
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-1 space-y-6">
          <SummaryPanel
            summaryData={summaryData}
            isVisible={true}
            onDownloadJson={handleDownloadJson}
            onDownloadCsv={handleDownloadCsv}
          />
        </div>

        <div className="lg:col-span-2 space-y-6">
          
          {/* Full Transcript with Confidence Scores */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Full Transcript</CardTitle>
              <CardDescription>
                Hover over highlighted text to see confidence scores and rationale
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="prose max-w-none">
                <InteractiveTranscript
                  transcriptText={analysisResult.transcript_text}
                  spans={analysisResult.spans}
                />
              </div>
            </CardContent>
          </Card>
          
          <TranscriptView
            segments={transcriptSegments}
            isVisible={true}
            audioFile={audioFile || undefined}
          />
        </div>
      </div>
    </div>
  );
}