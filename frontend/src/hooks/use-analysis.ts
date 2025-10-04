import { useState } from 'react';
import type { TranscriptSegment } from '../components/transcript-view';
import { api, ApiError } from '../lib/api';
import { analyzeTextContent } from '../lib/content-analysis';

const progressStages = [
  'Initializing analysis...',
  'Processing audio content...',
  'Generating transcript...',
  'Analyzing content for harmful speech...',
  'Identifying problematic segments...',
  'Compiling final report...',
  'Analysis complete!'
];

// Helper function to format timestamps
function formatTimestamp(start: number, end: number): string {
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };
  
  return `[${formatTime(start)}–${formatTime(end)}]`;
}

export function useAnalysis() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentStage, setCurrentStage] = useState('');
  const [showResults, setShowResults] = useState(false);
  const [transcriptSegments, setTranscriptSegments] = useState<TranscriptSegment[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    setShowResults(false);
    setProgress(0);
    setError(null); // Clear any previous errors
  };

  const clearError = () => {
    setError(null);
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setShowResults(false);
    setProgress(0);
    setCurrentStage('');
    setError(null);
    setTranscriptSegments([]);
  };

  const handleStartAnalysis = async () => {
    if (!selectedFile) return;

    setIsAnalyzing(true);
    setProgress(0);
    setShowResults(false);
    setError(null);

    try {
      // Stage 1: Initialize
      setCurrentStage(progressStages[0]);
      setProgress(10);
      await new Promise(resolve => setTimeout(resolve, 500));

      // Stage 2: Upload and process audio
      setCurrentStage(progressStages[1]);
      setProgress(30);
      
      const whisperResult = await api.uploadAudio(selectedFile);
      
      // Stage 3: Generate transcript
      setCurrentStage(progressStages[2]);
      setProgress(60);
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Stage 4: Analyze content
      setCurrentStage(progressStages[3]);
      setProgress(80);
      
      const segments: TranscriptSegment[] = whisperResult.segments.map((segment, index) => {
        const analysis = analyzeTextContent(segment.text);
        return {
          id: String(segment.id || index + 1),
          timestamp: formatTimestamp(segment.start, segment.end),
          text: segment.text.trim(),
          confidence: analysis.confidence,
          flag: analysis.flag,
          explanation: analysis.explanation,
        };
      });

      // Stage 5: Identify problematic segments
      setCurrentStage(progressStages[4]);
      setProgress(90);
      await new Promise(resolve => setTimeout(resolve, 500));

      // Stage 6: Compile report
      setCurrentStage(progressStages[5]);
      setProgress(95);
      await new Promise(resolve => setTimeout(resolve, 500));

      // Stage 7: Complete
      setCurrentStage(progressStages[6]);
      setProgress(100);
      await new Promise(resolve => setTimeout(resolve, 300));

      // Show results
      setIsAnalyzing(false);
      setShowResults(true);
      setTranscriptSegments(segments);

    } catch (err) {
      console.error('Analysis failed:', err);
      setError(err instanceof ApiError ? err.message : 'Analysis failed. Please try again.');
      setIsAnalyzing(false);
      setCurrentStage('Analysis failed');
    }
  };

  return {
    selectedFile,
    isAnalyzing,
    progress,
    currentStage,
    showResults,
    transcriptSegments,
    error,
    handleFileSelect,
    handleStartAnalysis,
    handleRemoveFile,
    clearError,
  };
}