import { useState } from 'react';
import type { TranscriptSegment } from '../components/transcript-view';
import { ApiError } from '../lib/api';

const progressStages = [
  'Initializing analysis...',
  'Processing audio content...',
  'Generating transcript...',
  'Analyzing content for harmful speech...',
  'Identifying problematic segments...',
  'Compiling final report...',
  'Analysis complete!'
];

// Test data for demonstration
const testAnalysisData = {
  "audio_file_id": "example_audio_001.wav",
  "transcript_text": "Good evening everyone, thanks for tuning in. Today we're discussing community safety and civic engagement. Some people claim that economic pressures are high, but that doesn't justify hatred. However, the speaker then said: we should eliminate all immigrants. After a pause, they talked about unrelated local issues like road maintenance and school budgets. Near the end, they added a call to action: please join our militia to fight the government. To conclude, the host reminded listeners to vote and to stay informed through peaceful, legal means.",
  "spans": [
    {
      "start": "00:00:12.000",
      "end": "00:00:14.500",
      "text": "we should eliminate all immigrants",
      "rationale": "Incitement to violence against a protected class (immigrants); hate speech and violent extremist content."
    },
    {
      "start": "00:00:28.700",
      "end": "00:00:32.000",
      "text": "please join our militia to fight the government",
      "rationale": "Recruitment and advocacy for violent action against governmental authorities; extremist mobilization."
    }
  ]
};

// Helper function to format timestamps
function formatTimestamp(start: number, end: number): string {
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };
  
  return `[${formatTime(start)}–${formatTime(end)}]`;
}

// Helper function to create segments from test data
function createSegmentsFromTestData(): TranscriptSegment[] {
  const fullText = testAnalysisData.transcript_text;
  const problematicSpans = testAnalysisData.spans;
  
  // Split text into sentences and create segments
  const sentences = fullText.split(/(?<=[.!?])\s+/);
  const segments: TranscriptSegment[] = [];
  let currentTime = 0;
  
  sentences.forEach((sentence, index) => {
    const startTime = currentTime;
    const endTime = currentTime + (sentence.length * 0.1); // Rough estimate based on text length
    
    // Check if this sentence contains problematic content
    const problematicSpan = problematicSpans.find(span => 
      sentence.toLowerCase().includes(span.text.toLowerCase())
    );
    
    let flag: 'neutral' | 'mild' | 'extremist' = 'neutral';
    let explanation = '';
    
    if (problematicSpan) {
      flag = problematicSpan.text.includes('eliminate') || problematicSpan.text.includes('militia') ? 'extremist' : 'mild';
      explanation = problematicSpan.rationale;
    }
    
    segments.push({
      id: String(index + 1),
      timestamp: formatTimestamp(startTime, endTime),
      text: sentence.trim(),
      flag,
      explanation
    });
    
    currentTime = endTime + 1; // Add pause between sentences
  });
  
  return segments;
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
      await new Promise(resolve => setTimeout(resolve, 800));

      // For demo purposes, use test data instead of API call
      // const whisperResult = await api.uploadAudio(selectedFile);
      
      // Stage 3: Generate transcript
      setCurrentStage(progressStages[2]);
      setProgress(60);
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Stage 4: Analyze content
      setCurrentStage(progressStages[3]);
      setProgress(80);
      
      // Use test data for demonstration
      const segments = createSegmentsFromTestData();

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