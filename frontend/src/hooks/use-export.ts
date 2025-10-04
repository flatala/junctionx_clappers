import type { TranscriptSegment } from '../components/transcript-view';

function generateSummaryData(segments: TranscriptSegment[]) {
  const totalSegments = segments.length;
  const flaggedSegments = segments.filter(s => s.flag !== 'neutral');
  const extremistSegments = segments.filter(s => s.flag === 'extremist');
  const mildSegments = segments.filter(s => s.flag === 'mild');
  
  // Estimate durations based on text length (rough approximation)
  const totalEstimatedDuration = totalSegments * 5; // ~5 seconds per segment
  const flaggedEstimatedDuration = flaggedSegments.length * 5;
  const flaggedPercentage = totalSegments > 0 ? Math.round((flaggedSegments.length / totalSegments) * 100) : 0;
  
  // Determine risk level
  let riskLevel: 'low' | 'medium' | 'high' = 'low';
  if (extremistSegments.length > 0) {
    riskLevel = 'high';
  } else if (mildSegments.length > 1 || flaggedPercentage > 20) {
    riskLevel = 'medium';
  }
  
  return {
    totalDuration: `${Math.floor(totalEstimatedDuration / 60)}:${(totalEstimatedDuration % 60).toString().padStart(2, '0')} min`,
    flaggedDuration: `${flaggedEstimatedDuration} sec`,
    flaggedPercentage,
    segmentsFlagged: flaggedSegments.length,
    riskLevel,
    breakdown: {
      total: totalSegments,
      neutral: segments.filter(s => s.flag === 'neutral').length,
      mild: mildSegments.length,
      extremist: extremistSegments.length,
    }
  };
}

export function useExport(selectedFile: File | null, transcriptSegments: TranscriptSegment[]) {
  const summaryData = generateSummaryData(transcriptSegments);
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