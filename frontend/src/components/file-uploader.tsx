import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Upload } from 'lucide-react';
import FileDropZone from './file-drop-zone';
import FileInfo from './file-info';

interface FileUploaderProps {
  onFileSelect: (file: File) => void;
  onStartAnalysis: () => void;
  selectedFile: File | null;
  isAnalyzing: boolean;
}

export default function FileUploader({ 
  onFileSelect, 
  onStartAnalysis, 
  selectedFile, 
  isAnalyzing 
}: FileUploaderProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Upload Audio/Video File
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <FileDropZone onFileSelect={onFileSelect} />
        
        {selectedFile && <FileInfo file={selectedFile} />}

        <Button
          onClick={onStartAnalysis}
          disabled={!selectedFile || isAnalyzing}
          className="w-full"
          size="lg"
        >
          {isAnalyzing ? 'Analyzing...' : 'Start Analysis'}
        </Button>
      </CardContent>
    </Card>
  );
}