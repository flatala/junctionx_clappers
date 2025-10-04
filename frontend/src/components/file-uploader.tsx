import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Upload, RefreshCw, X, FileAudio, Video, Clock } from 'lucide-react';
import { useState, useEffect } from 'react';

interface FileUploaderProps {
  onFileSelect: (file: File) => void;
  onStartAnalysis: () => void;
  onRemoveFile?: () => void;
  selectedFile: File | null;
  isAnalyzing: boolean;
}

// Helper functions for file handling
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const getFileIcon = (type: string) => {
  if (type.startsWith('video/')) return <Video className="h-8 w-8" />;
  return <FileAudio className="h-8 w-8" />;
};

const getFileTypeDescription = (type: string): string => {
  if (type.includes('mp3')) return 'MP3 Audio';
  if (type.includes('wav')) return 'WAV Audio';
  if (type.includes('m4a')) return 'M4A Audio';
  if (type.includes('mp4')) return 'MP4 Video';
  if (type.startsWith('video/')) return 'Video File';
  if (type.startsWith('audio/')) return 'Audio File';
  return 'Media File';
};

const estimateDuration = (file: File): string => {
  const sizeInMB = file.size / (1024 * 1024);
  let estimatedMinutes: number;
  
  if (file.type.startsWith('video/')) {
    estimatedMinutes = sizeInMB / 1.5;
  } else if (file.type.includes('wav')) {
    estimatedMinutes = sizeInMB / 10;
  } else {
    estimatedMinutes = sizeInMB / 1;
  }
  
  const minutes = Math.floor(estimatedMinutes);
  const seconds = Math.round((estimatedMinutes - minutes) * 60);
  
  if (minutes === 0) return `~${seconds}s`;
  if (seconds === 0) return `~${minutes}m`;
  return `~${minutes}m ${seconds}s`;
};

const getActualDuration = (file: File): Promise<string | null> => {
  return new Promise((resolve) => {
    if (!file.type.startsWith('audio/') && !file.type.startsWith('video/')) {
      resolve(null);
      return;
    }

    const url = URL.createObjectURL(file);
    const element = file.type.startsWith('video/') 
      ? document.createElement('video')
      : document.createElement('audio');

    element.src = url;
    
    element.addEventListener('loadedmetadata', () => {
      const duration = element.duration;
      URL.revokeObjectURL(url);
      
      if (isFinite(duration) && duration > 0) {
        const minutes = Math.floor(duration / 60);
        const seconds = Math.floor(duration % 60);
        resolve(minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`);
      } else {
        resolve(null);
      }
    });

    element.addEventListener('error', () => {
      URL.revokeObjectURL(url);
      resolve(null);
    });

    setTimeout(() => {
      URL.revokeObjectURL(url);
      resolve(null);
    }, 3000);
  });
};

export default function FileUploader({ 
  onFileSelect, 
  onStartAnalysis,
  onRemoveFile,
  selectedFile, 
  isAnalyzing 
}: FileUploaderProps) {
  const [dragOver, setDragOver] = useState(false);
  const [actualDuration, setActualDuration] = useState<string | null>(null);
  const [isLoadingDuration, setIsLoadingDuration] = useState(false);

  useEffect(() => {
    if (selectedFile) {
      setIsLoadingDuration(true);
      getActualDuration(selectedFile)
        .then((duration) => {
          setActualDuration(duration);
          setIsLoadingDuration(false);
        })
        .catch(() => {
          setIsLoadingDuration(false);
        });
    } else {
      setActualDuration(null);
      setIsLoadingDuration(false);
    }
  }, [selectedFile]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onFileSelect(file);
    }
    event.target.value = '';
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    setDragOver(false);
    const file = event.dataTransfer.files[0];
    if (file && (file.type.startsWith('audio/') || file.type.startsWith('video/'))) {
      onFileSelect(file);
    }
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Upload Audio/Video File
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Unified Upload Area */}
        <div
          className={`border-2 border-dashed rounded-lg transition-all duration-200 p-4 ${
            dragOver 
              ? 'border-primary bg-primary/5' 
              : selectedFile 
                ? 'border-border bg-muted/20' 
                : 'border-muted-foreground/25 hover:border-muted-foreground/50 cursor-pointer'
          }`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={!selectedFile ? () => document.getElementById('file-input')?.click() : undefined}
        >
          {!selectedFile ? (
            // Drop Zone State - Clean and clickable
            <div className="flex items-start gap-3">
              <div className="text-muted-foreground mt-1">
                {/* <Upload className="h-8 w-8" /> */}
              </div>
              <div className="flex-1 min-w-0 space-y-2">
                <p className="font-medium">
                  Drop your file here or click to browse
                </p>
                <p className="text-sm text-muted-foreground">
                  Supports MP3, WAV, MP4 files up to 100MB
                </p>
              </div>
            </div>
          ) : (
            // File Selected State
            <div className="flex items-start gap-3">
              <div className="text-muted-foreground mt-1">
                {getFileIcon(selectedFile.type)}
              </div>
              <div className="flex-1 min-w-0 space-y-2">
                <p className="font-medium truncate" title={selectedFile.name}>
                  {selectedFile.name}
                </p>
                
                <div className="grid grid-cols-1 gap-1 text-sm text-muted-foreground">
                  <div className="flex items-center justify-between">
                    <span>{getFileTypeDescription(selectedFile.type)}</span>
                    <span>{formatFileSize(selectedFile.size)}</span>
                  </div>
                  
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3 flex-shrink-0" />
                    <span>
                      {actualDuration ? 'Duration:' : 'Est. duration:'} {actualDuration || estimateDuration(selectedFile)}
                      {isLoadingDuration && !actualDuration && (
                        <span className="ml-1 animate-pulse">analyzing...</span>
                      )}
                    </span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 pt-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => document.getElementById('file-replace-input')?.click()}
                    className="flex items-center gap-2"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Replace
                  </Button>
                  {onRemoveFile && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={onRemoveFile}
                      className="flex items-center gap-2"
                    >
                      <X className="h-4 w-4" />
                      Remove
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Hidden file inputs */}
        <Input
          id="file-input"
          type="file"
          accept=".mp3,.wav,.mp4,audio/*,video/*"
          onChange={handleFileChange}
          className="hidden"
        />
        <Input
          id="file-replace-input"
          type="file"
          accept=".mp3,.wav,.mp4,audio/*,video/*"
          onChange={handleFileChange}
          className="hidden"
        />

        {/* Analysis Button */}
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