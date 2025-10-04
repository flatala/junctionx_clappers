import SummaryTable from './summary-table';

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
  isVisible}: SummaryPanelProps) {
  if (!isVisible) return null;

  return (
    <div className="space-y-6">
      <SummaryTable summaryData={summaryData} />
    </div>
  );
}