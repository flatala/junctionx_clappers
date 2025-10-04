import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Slider } from './ui/slider';
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX } from 'lucide-react';
import { Area, AreaChart, CartesianGrid, XAxis, ReferenceLine } from 'recharts';
import { ChartContainer, ChartTooltip } from './ui/chart';
import type { ChartConfig } from './ui/chart';

export interface AudioWaveformPlayerProps {
  audioFile: File | null;
  segments: Array<{
    id: string;
    timestamp: string; // Format: "MM:SS" or "[MM:SS-MM:SS]"
    text: string;
    flag: 'normal' | 'mild' | 'extremist';
  }>;
  onSegmentClick?: (segmentId: string) => void;
  className?: string;
}

interface WaveformDataPoint {
  time: number;
  timeInSeconds: number;
  timeLabel: string;
  normal: number;
  flagged: number;
  flag: string;
  segmentId?: string;
  text?: string;
}

// Helper function to parse timestamp to seconds
function parseTimestamp(timestamp: string): number {
  // Handle format "[MM:SS–MM:SS]" or "MM:SS"
  const timeMatch = timestamp.match(/\[?(\d+):(\d+)(?:–(\d+):(\d+))?\]?/);
  if (timeMatch) {
    const [, startMin, startSec] = timeMatch;
    return parseInt(startMin) * 60 + parseInt(startSec);
  }
  return 0;
}

// Helper function to format seconds to MM:SS
function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export default function AudioWaveformPlayer({ 
  audioFile, 
  segments, 
  onSegmentClick,
  className = ""
}: AudioWaveformPlayerProps) {
  // Audio state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(75);
  const [isMuted, setIsMuted] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  
  const audioRef = useRef<HTMLAudioElement>(null);

  // Chart configuration
  const chartConfig: ChartConfig = useMemo(() => ({
    normal: {
      label: "Normal Content",
      color: "hsl(var(--chart-1))",
    },
    flagged: {
      label: "Flagged Content", 
      color: "hsl(var(--destructive))",
    },
  }), []);

  // Generate stable waveform data
  const waveformData = useMemo(() => {
    if (!duration && !audioFile) return [];
    
    const points: WaveformDataPoint[] = [];
    const totalPoints = 180; // Optimal for smooth visualization
    const actualDuration = duration || 180; // Fallback duration
    
    for (let i = 0; i < totalPoints; i++) {
      const timePosition = (i / totalPoints) * actualDuration;
      const timeInSeconds = Math.floor(timePosition);
      const timeLabel = formatTime(timePosition);
      
      // Generate realistic waveform amplitude using multiple sine waves
      const baseWave = Math.abs(Math.sin(i * 0.08)) * 40; // Main pattern
      const detailWave = Math.abs(Math.sin(i * 0.3)) * 20; // Fine details
      const noiseWave = Math.abs(Math.sin(i * 0.6 + Math.PI/4)) * 15; // Texture
      const randomNoise = Math.random() * 10; // Natural variation
      
      const amplitude = Math.max(baseWave + detailWave + noiseWave + randomNoise + 5, 8);
      
      // Find corresponding segment for this time position
      const correspondingSegment = segments.find(segment => {
        const segmentTime = parseTimestamp(segment.timestamp);
        const tolerance = actualDuration / totalPoints * 2; // Dynamic tolerance
        return Math.abs(timePosition - segmentTime) < tolerance;
      });
      
      // Determine content type and amplitude distribution
      const contentType = correspondingSegment?.flag || 'normal';
      const isFlagged = contentType !== 'normal';
      const finalAmplitude = Math.round(amplitude);
      
      points.push({
        time: timePosition,
        timeInSeconds,
        timeLabel,
        normal: !isFlagged ? finalAmplitude : 0,
        flagged: isFlagged ? finalAmplitude : 0,
        flag: contentType,
        segmentId: correspondingSegment?.id,
        text: correspondingSegment?.text || ''
      });
    }
    
    return points;
  }, [duration, audioFile, segments]);

  // Setup audio file URL
  useEffect(() => {
    if (audioFile) {
      const url = URL.createObjectURL(audioFile);
      setAudioUrl(url);
      setIsLoaded(false);
      
      return () => {
        URL.revokeObjectURL(url);
        setAudioUrl(null);
      };
    }
  }, [audioFile]);

  // Audio event handlers
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
      setIsLoaded(true);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleError = () => {
      console.error('Audio playback error');
      setIsPlaying(false);
    };

    // Add event listeners
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('error', handleError);

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('error', handleError);
    };
  }, [audioUrl]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return; // Don't interfere with inputs
      
      switch (e.code) {
        case 'Space':
          e.preventDefault();
          handlePlayPause();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          handleSkipBack();
          break;
        case 'ArrowRight':
          e.preventDefault();
          handleSkipForward();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying]);

  // Control handlers
  const handlePlayPause = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !isLoaded) return;

    if (isPlaying) {
      audio.pause();
    } else {
      audio.play().catch(console.error);
    }
  }, [isPlaying, isLoaded]);

  const handleSeek = useCallback((newTime: number[]) => {
    const audio = audioRef.current;
    if (!audio || !isLoaded) return;

    const seekTime = Math.max(0, Math.min(newTime[0], duration));
    audio.currentTime = seekTime;
    setCurrentTime(seekTime);
  }, [duration, isLoaded]);

  const handleVolumeChange = useCallback((newVolume: number[]) => {
    const audio = audioRef.current;
    const volumeValue = newVolume[0];
    
    if (audio) {
      audio.volume = volumeValue / 100;
      audio.muted = false;
    }
    
    setVolume(volumeValue);
    setIsMuted(volumeValue === 0);
  }, []);

  const handleMuteToggle = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isMuted) {
      audio.muted = false;
      audio.volume = volume / 100;
      setIsMuted(false);
    } else {
      audio.muted = true;
      setIsMuted(true);
    }
  }, [isMuted, volume]);

  const handleSkipBack = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !isLoaded) return;
    
    const newTime = Math.max(0, currentTime - 10);
    audio.currentTime = newTime;
  }, [currentTime, isLoaded]);

  const handleSkipForward = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !isLoaded) return;
    
    const newTime = Math.min(duration, currentTime + 10);
    audio.currentTime = newTime;
  }, [currentTime, duration, isLoaded]);

  const handleWaveformClick = useCallback((data: any) => {
    if (data && data.activePayload && data.activePayload[0]) {
      const clickedTime = data.activePayload[0].payload.time;
      const segmentId = data.activePayload[0].payload.segmentId;
      
      handleSeek([clickedTime]);
      
      if (segmentId && onSegmentClick) {
        onSegmentClick(segmentId);
      }
    }
  }, [handleSeek, onSegmentClick]);

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Volume2 className="h-5 w-5" />
          Audio Waveform Player
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Waveform Visualization */}
        <div className="relative bg-muted/20 rounded-lg p-3 h-40 overflow-hidden border">
          {waveformData.length > 0 ? (
            <ChartContainer config={chartConfig} className="h-full w-full">
              <AreaChart
                data={waveformData}
                margin={{ top: 10, right: 15, left: 15, bottom: 25 }}
                onClick={handleWaveformClick}
                className="cursor-pointer"
              >
                <CartesianGrid strokeDasharray="3 3" className="opacity-20" />
                <XAxis 
                  dataKey="timeInSeconds" 
                  type="number"
                  scale="linear"
                  domain={[0, duration || 180]}
                  tick={{ fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(value) => formatTime(value)}
                  interval="preserveStartEnd"
                />
                <ChartTooltip 
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-background border rounded-lg p-3 shadow-lg max-w-xs">
                          <p className="text-sm font-medium mb-2">{data.timeLabel}</p>
                          {data.text && (
                            <p className="text-sm text-foreground leading-relaxed mb-2">
                              "{data.text}"
                            </p>
                          )}
                          {data.flag !== 'normal' && (
                            <p className="text-xs font-medium px-2 py-1 rounded-full inline-block bg-destructive text-destructive-foreground">
                              Flagged Content
                            </p>
                          )}
                          {!data.text && data.flag === 'normal' && (
                            <p className="text-xs text-muted-foreground">Normal content</p>
                          )}
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                
                {/* Waveform areas by content type */}
                <Area
                  type="monotone"
                  dataKey="normal"
                  stroke="hsl(var(--chart-1))"
                  fill="hsl(var(--chart-1))"
                  fillOpacity={0.4}
                  strokeWidth={1.5}
                />
                <Area
                  type="monotone"
                  dataKey="flagged"
                  stroke="hsl(var(--destructive))"
                  fill="hsl(var(--destructive))"
                  fillOpacity={0.8}
                  strokeWidth={1.5}
                />
                
                {/* Playback position indicator */}
                <ReferenceLine 
                  x={currentTime} 
                  stroke="hsl(var(--foreground))" 
                  strokeWidth={2}
                  strokeDasharray="none"
                />
              </AreaChart>
            </ChartContainer>
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <p className="text-sm">Upload an audio file to see waveform visualization</p>
            </div>
          )}
        </div>

        {/* Playback Controls */}
        <div className="flex items-center gap-4">
          {/* Transport Controls */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSkipBack}
              disabled={!isLoaded}
              title="Skip back 10s (←)"
            >
              <SkipBack className="h-4 w-4" />
            </Button>
            <Button
              onClick={handlePlayPause}
              size="sm"
              className="h-10 w-10 rounded-full"
              disabled={!audioFile || !isLoaded}
              title={isPlaying ? "Pause (Space)" : "Play (Space)"}
            >
              {isPlaying ? (
                <Pause className="h-5 w-5" />
              ) : (
                <Play className="h-5 w-5 ml-0.5" />
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSkipForward}
              disabled={!isLoaded}
              title="Skip forward 10s (→)"
            >
              <SkipForward className="h-4 w-4" />
            </Button>
          </div>

          {/* Time Display */}
          <div className="flex items-center gap-2 text-sm font-mono min-w-[80px]">
            <span>{formatTime(currentTime)}</span>
            <span className="text-muted-foreground">/</span>
            <span className="text-muted-foreground">{formatTime(duration)}</span>
          </div>

          {/* Seek Slider */}
          <div className="flex-1">
            <Slider
              value={[currentTime]}
              onValueChange={handleSeek}
              max={duration || 100}
              step={0.1}
              className="w-full"
              disabled={!isLoaded}
            />
          </div>

          {/* Volume Controls */}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleMuteToggle}
              className="p-2"
            >
              {isMuted ? (
                <VolumeX className="h-4 w-4 text-muted-foreground" />
              ) : (
                <Volume2 className="h-4 w-4 text-muted-foreground" />
              )}
            </Button>
            <Slider
              value={[isMuted ? 0 : volume]}
              onValueChange={handleVolumeChange}
              max={100}
              step={1}
              className="w-20"
            />
          </div>
        </div>

        {/* Content Legend */}
        <div className="flex items-center gap-6 text-xs border-t pt-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-chart-1 rounded opacity-60"></div>
            <span>Normal Content</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-destructive rounded"></div>
            <span>Flagged Content</span>
          </div>
          <div className="flex items-center gap-2 ml-auto text-muted-foreground">
            <span>Use Space to play/pause • Arrow keys to skip</span>
          </div>
        </div>

        {/* Hidden Audio Element */}
        <audio 
          ref={audioRef} 
          src={audioUrl || undefined}
          className="hidden"
          preload="metadata"
        />
      </CardContent>
    </Card>
  );
}