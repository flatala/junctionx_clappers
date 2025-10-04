import type { TranscriptSegment } from '../components/transcript-view';

const mockSummaryData = {
  totalDuration: '2:45 min',
  flaggedDuration: '18 sec',
  flaggedPercentage: 14,
  segmentsFlagged: 3,
  avgConfidence: 0.88,
  riskLevel: 'medium' as const,
};

export function useExport(selectedFile: File | null, transcriptSegments: TranscriptSegment[]) {
  const handleDownloadJson = () => {
    const data = {
      file: selectedFile?.name,
      analyzedAt: new Date().toISOString(),
      summary: mockSummaryData,
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
    const headers = ['Timestamp', 'Text', 'Flag', 'Confidence', 'Explanation'];
    const csvContent = [
      headers.join(','),
      ...transcriptSegments.map(segment => [
        `"${segment.timestamp}"`,
        `"${segment.text.replace(/"/g, '""')}"`,
        segment.flag,
        segment.confidence,
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
    mockSummaryData,
    handleDownloadJson,
    handleDownloadCsv,
  };
}