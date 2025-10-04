import { FileAudio, Video } from 'lucide-react';

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

export default function FileInfo({ file }: FileInfoProps) {
  return (
    <div className="border rounded-lg p-4">
      <div className="flex items-center gap-3">
        {getFileIcon(file.type)}
        <div className="flex-1">
          <p className="font-medium">{file.name}</p>
          <p className="text-sm text-muted-foreground">
            {formatFileSize(file.size)} • Estimated duration: 2:45 min
          </p>
        </div>
      </div>
    </div>
  );
}