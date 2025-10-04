import type { TranscriptSegment } from '../components/transcript-view';
import { useState, useEffect } from 'react';

async function generateSummaryData(segments: TranscriptSegment[], selectedFile: File | null) {
  if (!selectedFile) {
    // Return default/placeholder values when file isn't loaded yet
    return {
      totalDuration: '--:-- min',
      flaggedDuration: '-- sec',
      flaggedPercentage: 0,
      segmentsFlagged: segments.length,
    };
  }

  const totalSegments = segments.length;
  const flaggedSegments = segments;
  
  let totalDurationSeconds = 0;
  
  try {
    // Use HTML5 Audio API to get duration
    const audio = new Audio();
    const objectUrl = URL.createObjectURL(selectedFile);
    
    await new Promise<void>((resolve, reject) => {
      audio.addEventListener('loadedmetadata', () => {
        totalDurationSeconds = audio.duration;
        URL.revokeObjectURL(objectUrl);
        resolve();
      });
      
      audio.addEventListener('error', () => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error('Failed to load audio metadata'));
      });
      
      audio.src = objectUrl;
    });
  } catch (error) {
    console.error('Failed to get duration:', error);
    totalDurationSeconds = segments.length * 5; // fallback to estimate
  }

  const flaggedEstimatedDuration = flaggedSegments.length;
  const flaggedPercentage = totalSegments > 0 
    ? Math.round((flaggedSegments.length /totalDurationSeconds) * 100) 
    : 0;

  return {
    totalDuration: `${Math.floor(totalDurationSeconds / 60)}:${Math.floor(totalDurationSeconds % 60).toString().padStart(2, '0')} min`,
    flaggedDuration: `${flaggedEstimatedDuration} sec`,
    flaggedPercentage,
    segmentsFlagged: flaggedSegments.length,
  };
}

export function useExport(selectedFile: File | null, transcriptSegments: TranscriptSegment[]) {
  const [summaryData, setSummaryData] = useState({
    totalDuration: '--:-- min',
    flaggedDuration: '-- sec',
    flaggedPercentage: 0,
    segmentsFlagged: 0,
  });

  useEffect(() => {
    generateSummaryData(transcriptSegments, selectedFile).then(setSummaryData);
  }, [selectedFile, transcriptSegments]);

  const handleDownloadJson = () => {
    const data = {
      file: selectedFile?.name,
      analyzedAt: new Date().toISOString(),
      summary: summaryData,
      segments: transcriptSegments,
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `perun-analysis-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadCsv = () => {
    const headers = ['Timestamp', 'Text', 'Flag', 'Explanation'];
    const csvContent = [
      headers.join(','),
      ...transcriptSegments.map(segment => [
        `"${segment.timestamp}"`,
        `"${segment.text.replace(/"/g, '""')}"`,
        segment.flag,
        `"${(segment.explanation || '').replace(/"/g, '""')}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `perun-analysis-${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return {
    summaryData,
    handleDownloadJson,
    handleDownloadCsv,
  };
}