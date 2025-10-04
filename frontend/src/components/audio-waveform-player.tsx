"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Play, Pause, Volume2, VolumeX, SkipForward, SkipBack } from 'lucide-react'
import { Area, AreaChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer } from 'recharts'

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  ChartContainer,
  ChartTooltip,
} from '@/components/ui/chart'
import type { ChartConfig } from '@/components/ui/chart'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'

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

// Helper to parse various timestamp formats
function parseTimestamp(timestamp: string): number {
  // Handle range format [MM:SS-MM:SS] or [MM:SS–MM:SS]
  const rangeMatch = timestamp.match(/\[(\d+):(\d+)[-–](\d+):(\d+)\]/);
  if (rangeMatch) {
    const startMinutes = parseInt(rangeMatch[1]);
    const startSeconds = parseInt(rangeMatch[2]);
    return startMinutes * 60 + startSeconds;
  }
  
  // Handle simple format MM:SS
  const simpleMatch = timestamp.match(/(\d+):(\d+)/);
  if (simpleMatch) {
    const minutes = parseInt(simpleMatch[1]);
    const seconds = parseInt(simpleMatch[2]);
    return minutes * 60 + seconds;
  }
  
  return 0;
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

  // Generate waveform data with organic variation
  const waveformData = useMemo(() => {
    if (!duration || duration === 0) return [];
    
    const actualDuration = duration;
    const totalPoints = Math.min(Math.max(Math.floor(actualDuration / 2), 50), 200);
    const points: WaveformDataPoint[] = [];
    
    for (let i = 0; i < totalPoints; i++) {
      const timePosition = (actualDuration / totalPoints) * i;
      
      // Create smooth wave pattern with multiple frequencies
      const baseWave = Math.abs(Math.sin(i * 0.3)) * 30;
      const detailWave = Math.abs(Math.sin(i * 0.8 + Math.PI/3)) * 20;
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
        timeInSeconds: timePosition,
        timeLabel: formatTime(timePosition),
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
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
    };
  }, [audioUrl]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (!isLoaded) return;
      
      // Only handle if not typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      switch(e.code) {
        case 'Space':
          e.preventDefault();
          togglePlayPause();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          skipBackward();
          break;
        case 'ArrowRight':
          e.preventDefault();
          skipForward();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isLoaded, isPlaying]);

  // Playback controls
  const togglePlayPause = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !isLoaded) return;

    if (isPlaying) {
      audio.pause();
    } else {
      audio.play();
    }
  }, [isPlaying, isLoaded]);

  const skipForward = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = Math.min(audio.currentTime + 10, duration);
  }, [duration]);

  const skipBackward = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = Math.max(audio.currentTime - 10, 0);
  }, []);

  const handleSeek = useCallback((values: number[]) => {
    const audio = audioRef.current;
    if (!audio) return;
    
    const newTime = values[0];
    audio.currentTime = newTime;
    setCurrentTime(newTime);
  }, []);

  const handleVolumeChange = useCallback((values: number[]) => {
    const audio = audioRef.current;
    if (!audio) return;
    
    const newVolume = values[0];
    audio.volume = newVolume / 100;
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
  }, []);

  const toggleMute = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isMuted) {
      const newVolume = volume > 0 ? volume : 75;
      audio.volume = newVolume / 100;
      setVolume(newVolume);
      setIsMuted(false);
    } else {
      audio.volume = 0;
      setIsMuted(true);
    }
  }, [isMuted, volume]);

  // Chart click handler
  const handleChartClick = useCallback((data: any) => {
    if (!data?.activePayload?.[0]) return;
    
    const point = data.activePayload[0].payload as WaveformDataPoint;
    const audio = audioRef.current;
    
    if (audio) {
      audio.currentTime = point.timeInSeconds;
      setCurrentTime(point.timeInSeconds);
      
      if (!isPlaying) {
        audio.play();
      }
    }
    
    // Call segment click handler if available
    if (point.segmentId && onSegmentClick) {
      onSegmentClick(point.segmentId);
    }
  }, [isPlaying, onSegmentClick]);

  // Format time helper
  function formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Audio Waveform</CardTitle>
        <CardDescription>
          Interactive audio visualization with flagged content detection
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Waveform Chart */}
        <ChartContainer config={chartConfig} className="h-[200px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={waveformData}
              margin={{ top: 10, right: 10, bottom: 0, left: 0 }}
              onClick={handleChartClick}
              className="cursor-pointer"
            >
              <defs>
                <linearGradient id="normalGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0.1}/>
                </linearGradient>
                <linearGradient id="flaggedGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--destructive))" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="hsl(var(--destructive))" stopOpacity={0.1}/>
                </linearGradient>
              </defs>
              
              <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
              
              <XAxis
                dataKey="timeLabel"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                minTickGap={50}
              />
              
              <YAxis
                hide={true}
              />

              <ChartTooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.[0]) return null;
                  
                  const data = payload[0].payload as WaveformDataPoint;
                  const isFlagged = data.flag !== 'normal';
                  
                  return (
                    <div className="rounded-lg border bg-background p-3 shadow-md">
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">Time:</span>
                          <span className="text-sm font-bold">{data.timeLabel}</span>
                        </div>
                        {isFlagged && (
                          <>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground">Type:</span>
                              <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                                data.flag === 'extremist' 
                                  ? 'bg-destructive text-destructive-foreground' 
                                  : 'bg-orange-500 text-white'
                              }`}>
                                {data.flag === 'extremist' ? 'HARMFUL' : 'MINOR'}
                              </span>
                            </div>
                            {data.text && (
                              <div className="max-w-[200px]">
                                <span className="text-xs text-muted-foreground">Text:</span>
                                <p className="text-xs mt-1">{data.text}</p>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  );
                }}
              />
              
              {/* Stack normal and flagged areas */}
              <Area
                type="monotone"
                dataKey="normal"
                stackId="1"
                stroke="hsl(var(--chart-1))"
                fill="url(#normalGradient)"
                strokeWidth={2}
              />
              <Area
                type="monotone"
                dataKey="flagged"
                stackId="1"
                stroke="hsl(var(--destructive))"
                fill="url(#flaggedGradient)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartContainer>

        {/* Timeline Slider */}
        <div className="space-y-2">
          <Slider
            value={[currentTime]}
            min={0}
            max={duration || 100}
            step={0.1}
            onValueChange={handleSeek}
            disabled={!isLoaded}
            className="cursor-pointer"
          />
          <div className="flex justify-between text-xs text-muted-foreground px-2">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Playback Controls */}
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={skipBackward}
            disabled={!isLoaded}
          >
            <SkipBack className="h-4 w-4" />
          </Button>

          <Button
            variant="outline"
            size="icon"
            onClick={togglePlayPause}
            disabled={!isLoaded}
          >
            {isPlaying ? (
              <Pause className="h-4 w-4" />
            ) : (
              <Play className="h-4 w-4" />
            )}
          </Button>

          <Button
            variant="outline"
            size="icon"
            onClick={skipForward}
            disabled={!isLoaded}
          >
            <SkipForward className="h-4 w-4" />
          </Button>

          {/* Volume Control */}
          <div className="flex items-center gap-2 flex-1 max-w-[200px]">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleMute}
              disabled={!isLoaded}
            >
              {isMuted || volume === 0 ? (
                <VolumeX className="h-4 w-4" />
              ) : (
                <Volume2 className="h-4 w-4" />
              )}
            </Button>
            <Slider
              value={[isMuted ? 0 : volume]}
              min={0}
              max={100}
              step={1}
              onValueChange={handleVolumeChange}
              disabled={!isLoaded}
              className="flex-1"
            />
          </div>

          {/* Status Text */}
          <div className="text-sm text-muted-foreground ml-auto">
            {!audioFile ? 'No audio file' : !isLoaded ? 'Loading...' : 'Ready'}
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-6 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-chart-1 rounded"></div>
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
