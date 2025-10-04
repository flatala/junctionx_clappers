import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';

interface SummaryData {
  totalDuration: string;
  flaggedDuration: string;
  flaggedPercentage: number;
  segmentsFlagged: number;
  avgConfidence: number;
}

interface SummaryTableProps {
  summaryData: SummaryData;
}

export default function SummaryTable({ summaryData }: SummaryTableProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Analysis Summary</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Metric</TableHead>
              <TableHead>Value</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell className="font-medium">Total Duration</TableCell>
              <TableCell>{summaryData.totalDuration}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="font-medium">Flagged Duration</TableCell>
              <TableCell>
                {summaryData.flaggedDuration} ({summaryData.flaggedPercentage}%)
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="font-medium">Segments Flagged</TableCell>
              <TableCell>{summaryData.segmentsFlagged}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="font-medium">Avg. Confidence</TableCell>
              <TableCell>{summaryData.avgConfidence.toFixed(2)}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}