import TimelineVisualization from './timeline-visualization';
import SummaryTable from './summary-table';
import ExportActions from './export-actions';

interface SummaryData {
  totalDuration: string;
  flaggedDuration: string;
  flaggedPercentage: number;
  segmentsFlagged: number;
  riskLevel: 'low' | 'medium' | 'high';
}

interface SummaryPanelProps {
  summaryData: SummaryData;
  isVisible: boolean;
  onDownloadJson: () => void;
  onDownloadCsv: () => void;
}

export default function SummaryPanel({ 
  summaryData, 
  isVisible, 
  onDownloadJson, 
  onDownloadCsv 
}: SummaryPanelProps) {
  if (!isVisible) return null;

  return (
    <div className="space-y-6">
      <TimelineVisualization totalDuration={summaryData.totalDuration} />
      <SummaryTable summaryData={summaryData} />
      <ExportActions 
        onDownloadJson={onDownloadJson} 
        onDownloadCsv={onDownloadCsv} 
      />
    </div>
  );
}