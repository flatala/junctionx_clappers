import RiskLevelAlert from './risk-level-alert';
import TimelineVisualization from './timeline-visualization';
import SummaryTable from './summary-table';
import ExportActions from './export-actions';

interface SummaryData {
  totalDuration: string;
  flaggedDuration: string;
  flaggedPercentage: number;
  segmentsFlagged: number;
  avgConfidence: number;
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
      <RiskLevelAlert riskLevel={summaryData.riskLevel} />
      <TimelineVisualization totalDuration={summaryData.totalDuration} />
      <SummaryTable summaryData={summaryData} />
      <ExportActions 
        onDownloadJson={onDownloadJson} 
        onDownloadCsv={onDownloadCsv} 
      />
    </div>
  );
}