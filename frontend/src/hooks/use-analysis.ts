import { useState } from 'react';
import type { TranscriptSegment } from '../components/transcript-view';

const progressStages = [
  'Initializing analysis...',
  'Processing audio content...',
  'Generating transcript...',
  'Analyzing content for harmful speech...',
  'Identifying problematic segments...',
  'Compiling final report...',
  'Analysis complete!'
];

export function useAnalysis() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentStage, setCurrentStage] = useState('');
  const [showResults, setShowResults] = useState(false);
  const [transcriptSegments, setTranscriptSegments] = useState<TranscriptSegment[]>([]);

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    setShowResults(false);
    setProgress(0);
  };

  const handleStartAnalysis = async () => {
    if (!selectedFile) return;

    setIsAnalyzing(true);
    setProgress(0);
    setShowResults(false);

    // Simulate analysis progress
    for (let i = 0; i < progressStages.length; i++) {
      setCurrentStage(progressStages[i]);
      
      const stageProgress = Math.floor((i / (progressStages.length - 1)) * 100);
      
      for (let j = 0; j <= 15; j++) {
        const currentProgress = Math.min(stageProgress + j * (15 / 15), 100);
        setProgress(currentProgress);
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    // Mock data for demonstration
    const mockTranscriptSegments: TranscriptSegment[] = [
      {
        id: '1',
        timestamp: '[00:00–00:12]',
        text: 'Hello everyone, welcome to today\'s presentation about our community outreach program.',
        confidence: 0.95,
        flag: 'neutral',
      },
      {
        id: '2',
        timestamp: '[00:14–00:22]',
        text: 'We need to address some damn issues in our neighborhood that have been ongoing.',
        confidence: 0.87,
        flag: 'mild',
        explanation: 'Contains mild profanity but not directed at individuals or groups.',
      },
      {
        id: '3',
        timestamp: '[00:25–00:38]',
        text: 'The community center has been serving families for over 20 years and continues to be a safe space.',
        confidence: 0.92,
        flag: 'neutral',
      },
      {
        id: '4',
        timestamp: '[01:12–01:28]',
        text: 'Those people from that community are always causing problems and shouldn\'t be allowed here.',
        confidence: 0.91,
        flag: 'extremist',
        explanation: 'Contains discriminatory language targeting a specific group. Promotes exclusion based on identity.',
      },
      {
        id: '5',
        timestamp: '[01:45–01:52]',
        text: 'We should work together to find solutions that benefit everyone in our diverse community.',
        confidence: 0.89,
        flag: 'neutral',
      },
      {
        id: '6',
        timestamp: '[02:15–02:23]',
        text: 'This shit needs to stop, but we can handle it professionally.',
        confidence: 0.83,
        flag: 'mild',
        explanation: 'Contains strong language but used for emphasis rather than targeting individuals.',
      },
    ];

    // Show results
    setTimeout(() => {
      setIsAnalyzing(false);
      setShowResults(true);
      setTranscriptSegments(mockTranscriptSegments);
    }, 500);
  };

  return {
    selectedFile,
    isAnalyzing,
    progress,
    currentStage,
    showResults,
    transcriptSegments,
    handleFileSelect,
    handleStartAnalysis,
  };
}