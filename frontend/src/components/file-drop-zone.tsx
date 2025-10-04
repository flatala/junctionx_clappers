import { useState } from 'react';
import { Input } from './ui/input';

interface FileDropZoneProps {
  onFileSelect: (file: File) => void;
  accept?: string;
}

export default function FileDropZone({ onFileSelect, accept = ".mp3,.wav,.mp4,audio/*,video/*" }: FileDropZoneProps) {
  const [dragOver, setDragOver] = useState(false);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onFileSelect(file);
    }
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
    <div
      className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
        dragOver ? 'border-primary' : 'border-muted-foreground/25'
      }`}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
    >
      <p className="text-lg font-medium">
        Drop your file here or click to browse
      </p>
      <Input
        type="file"
        accept={accept}
        onChange={handleFileChange}
        className="mt-4"
      />
    </div>
  );
}