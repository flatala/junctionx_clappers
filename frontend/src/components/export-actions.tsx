import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Download } from 'lucide-react';

interface ExportActionsProps {
  onDownloadJson: () => void;
  onDownloadCsv: () => void;
}

export default function ExportActions({ onDownloadJson, onDownloadCsv }: ExportActionsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Download className="h-5 w-5" />
          Export Results
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex gap-3">
          <Button onClick={onDownloadJson} variant="outline" className="flex-1">
            <Download className="h-4 w-4 mr-2" />
            Download JSON
          </Button>
          <Button onClick={onDownloadCsv} variant="outline" className="flex-1">
            <Download className="h-4 w-4 mr-2" />
            Download CSV
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}