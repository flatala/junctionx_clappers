import { Button } from './ui/button';
import { Input } from './ui/input';
import { Upload, X, FileAudio, Video, Archive } from 'lucide-react';
import { useState } from 'react';

interface BatchFileUploaderProps {
  onFileSelect: (files: File[]) => void;
  selectedFiles: File[];
  multiple?: boolean;
}

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const getFileIcon = (type: string, name: string) => {
  if (type.startsWith('video/')) return <Video className="h-5 w-5" />;
  if (type === 'application/zip' || type === 'application/x-zip-compressed' || name.toLowerCase().endsWith('.zip')) {
    return <Archive className="h-5 w-5 text-purple-500" />;
  }
  return <FileAudio className="h-5 w-5" />;
};

export default function BatchFileUploader({ 
  onFileSelect, 
  selectedFiles,
  multiple = true
}: BatchFileUploaderProps) {
  const [dragOver, setDragOver] = useState(false);

  const isValidFile = (file: File): boolean => {
    return file.type.startsWith('audio/') || 
           file.type.startsWith('video/') || 
           file.type === 'application/zip' ||
           file.type === 'application/x-zip-compressed' ||
           file.name.toLowerCase().endsWith('.zip');
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length > 0) {
      if (multiple) {
        onFileSelect([...selectedFiles, ...files]);
      } else {
        onFileSelect([files[0]]);
      }
    }
    event.target.value = '';
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    setDragOver(false);
    const files = Array.from(event.dataTransfer.files).filter(isValidFile);
    if (files.length > 0) {
      if (multiple) {
        onFileSelect([...selectedFiles, ...files]);
      } else {
        onFileSelect([files[0]]);
      }
    }
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const removeFile = (index: number) => {
    const newFiles = selectedFiles.filter((_, i) => i !== index);
    onFileSelect(newFiles);
  };

  return (
    <div className="space-y-4">
      {/* Drop Zone */}
      <div
        className={`border-2 border-dashed rounded-lg transition-all duration-200 p-6 ${
          dragOver 
            ? 'border-primary bg-primary/5' 
            : 'border-muted-foreground/25 hover:border-muted-foreground/50 cursor-pointer'
        }`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => document.getElementById('batch-file-input')?.click()}
      >
        <div className="text-center">
          <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-4" />
          <p className="font-medium mb-2">
            Drop your files here or click to browse
          </p>
          <p className="text-sm text-muted-foreground">
            {multiple ? 'Select multiple audio/video files or ZIP archives' : 'Select an audio/video file or ZIP archive'}
          </p>
        </div>
      </div>

      {/* Hidden file input */}
        <Input
          id="batch-file-input"
          type="file"
          accept=".mp3,.wav,.mp4,.zip,audio/*,video/*,application/zip"
          multiple={multiple}
          onChange={handleFileChange}
          className="hidden"
        />      {/* Selected Files List */}
      {selectedFiles.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-medium text-sm">Selected Files ({selectedFiles.length})</h4>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {selectedFiles.map((file, index) => (
              <div key={`${file.name}-${index}`} className="flex items-center gap-3 p-3 bg-muted/20 rounded-lg">
                {getFileIcon(file.type, file.name)}
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate" title={file.name}>
                    {file.name}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {formatFileSize(file.size)}
                    {(file.type === 'application/zip' || file.type === 'application/x-zip-compressed' || file.name.toLowerCase().endsWith('.zip')) && (
                      <span className="ml-2 text-purple-600 text-xs font-medium">ZIP Archive</span>
                    )}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeFile(index)}
                  className="text-destructive hover:text-destructive"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}