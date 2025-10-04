import { FileAudio, Video, Clock } from 'lucide-react';
import { useState, useEffect } from 'react';

interface FileInfoProps {
  file: File;
}

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
  if (type.includes('aac')) return 'AAC Audio';
  if (type.includes('ogg')) return 'OGG Audio';
  if (type.includes('flac')) return 'FLAC Audio';
  if (type.includes('mp4')) return 'MP4 Video';
  if (type.includes('avi')) return 'AVI Video';
  if (type.includes('mov')) return 'MOV Video';
  if (type.includes('mkv')) return 'MKV Video';
  if (type.includes('webm')) return 'WebM Video';
  if (type.startsWith('video/')) return 'Video File';
  if (type.startsWith('audio/')) return 'Audio File';
  return 'Media File';
};

const estimateDuration = (file: File): string => {
  // Rough estimation based on file size and type
  // These are approximate values for different formats
  const sizeInMB = file.size / (1024 * 1024);
  
  let estimatedMinutes: number;
  
  if (file.type.startsWith('video/')) {
    // Video files: roughly 1-2 MB per minute for compressed video
    estimatedMinutes = sizeInMB / 1.5;
  } else if (file.type.includes('wav') || file.type.includes('aiff')) {
    // Uncompressed audio: roughly 10 MB per minute
    estimatedMinutes = sizeInMB / 10;
  } else if (file.type.includes('mp3') || file.type.includes('m4a') || file.type.includes('aac')) {
    // Compressed audio: roughly 1 MB per minute
    estimatedMinutes = sizeInMB / 1;
  } else {
    // Default estimation for unknown audio formats
    estimatedMinutes = sizeInMB / 2;
  }
  
  // Convert to minutes and seconds
  const minutes = Math.floor(estimatedMinutes);
  const seconds = Math.round((estimatedMinutes - minutes) * 60);
  
  if (minutes === 0) {
    return `~${seconds}s`;
  } else if (seconds === 0) {
    return `~${minutes}m`;
  } else {
    return `~${minutes}m ${seconds}s`;
  }
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

    // Timeout after 3 seconds
    setTimeout(() => {
      URL.revokeObjectURL(url);
      resolve(null);
    }, 3000);
  });
};

export default function FileInfo({ file }: FileInfoProps) {
  const [actualDuration, setActualDuration] = useState<string | null>(null);
  const [isLoadingDuration, setIsLoadingDuration] = useState(true);

  useEffect(() => {
    getActualDuration(file)
      .then((duration) => {
        setActualDuration(duration);
        setIsLoadingDuration(false);
      })
      .catch(() => {
        setIsLoadingDuration(false);
      });
  }, [file]);

  const displayDuration = actualDuration || estimateDuration(file);
  const durationLabel = actualDuration ? 'Duration:' : 'Est. duration:';
  
  // Format last modified date
  const lastModified = new Date(file.lastModified).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });

  return (
    <div className="border rounded-lg p-4 bg-muted/20">
      <div className="flex items-start gap-3">
        <div className="text-muted-foreground mt-1">
          {getFileIcon(file.type)}
        </div>
        <div className="flex-1 min-w-0 space-y-1">
          <p className="font-medium truncate text-sm" title={file.name}>
            {file.name}
          </p>
          
          <div className="grid grid-cols-1 gap-1 text-xs text-muted-foreground">
            <div className="flex items-center justify-between">
              <span>{getFileTypeDescription(file.type)}</span>
              <span>{formatFileSize(file.size)}</span>
            </div>
            
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3 flex-shrink-0" />
              <span>
                {durationLabel} {displayDuration}
                {isLoadingDuration && actualDuration === null && (
                  <span className="ml-1 animate-pulse">analyzing...</span>
                )}
              </span>
            </div>
            
            <div className="text-xs text-muted-foreground/75">
              Modified: {lastModified}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}