import { ScrollArea } from './ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Slider } from './ui/slider';
import { Play, Pause, SkipBack, SkipForward, Volume2, Maximize2 } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { Area, AreaChart, CartesianGrid, XAxis, ReferenceLine } from 'recharts';
import {
  ChartContainer,
  ChartTooltip,
} from './ui/chart';
import type { ChartConfig } from './ui/chart';
import type { FlagType } from './flag-icon';

export interface TranscriptSegment {
  id: string;
  timestamp: string;
  text: string;
  flag: FlagType;
  explanation?: string;
}

interface TranscriptViewProps {
  segments: TranscriptSegment[];
  isVisible: boolean;
  audioFile?: File;
}

// Helper function to parse timestamp to seconds
function parseTimestamp(timestamp: string): number {
  const timeMatch = timestamp.match(/\[(\d+):(\d+)–(\d+):(\d+)\]/);
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

export default function TranscriptView({ segments, isVisible, audioFile }: TranscriptViewProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(75);
  const [activeSegmentId, setActiveSegmentId] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Setup audio file
  useEffect(() => {
    if (audioFile) {
      const url = URL.createObjectURL(audioFile);
      setAudioUrl(url);
      
      return () => {
        URL.revokeObjectURL(url);
      };
    }
  }, [audioFile]);

  // Setup audio element event listeners
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleEnded = () => {
      setIsPlaying(false);
    };

    const handlePlay = () => {
      setIsPlaying(true);
    };

    const handlePause = () => {
      setIsPlaying(false);
    };

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

  if (!isVisible) return null;

  const handlePlayPause = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
    } else {
      audio.play();
    }
  };

  const handleSeek = (newTime: number[]) => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.currentTime = newTime[0];
    setCurrentTime(newTime[0]);
  };

  const handleVolumeChange = (newVolume: number[]) => {
    const audio = audioRef.current;
    const volumeValue = newVolume[0] / 100;
    
    if (audio) {
      audio.volume = volumeValue;
    }
    setVolume(newVolume[0]);
  };

  const handleSkipBack = () => {
    const audio = audioRef.current;
    if (!audio) return;
    
    audio.currentTime = Math.max(0, currentTime - 10);
  };

  const handleSkipForward = () => {
    const audio = audioRef.current;
    if (!audio) return;
    
    audio.currentTime = Math.min(duration, currentTime + 10);
  };

  const handleJumpToSegment = (segmentId: string) => {
    const segment = segments.find(s => s.id === segmentId);
    const audio = audioRef.current;
    
    if (segment && audio) {
      const segmentTime = parseTimestamp(segment.timestamp);
      audio.currentTime = segmentTime;
      setActiveSegmentId(segmentId);
    }
  };

  // Generate proper timeline waveform data
  const generateWaveformChartData = () => {
    const points = [];
    const totalPoints = 200; // More points for smoother waveform
    const actualDuration = duration || 180; // Fallback to 3 minutes if no audio loaded
    
    for (let i = 0; i < totalPoints; i++) {
      const timePosition = (i / totalPoints) * actualDuration;
      const timeInSeconds = Math.floor(timePosition);
      const timeLabel = formatTime(timePosition);
      
      // Create realistic audio waveform amplitude pattern
      const baseFreq = 0.1; // Base frequency for natural variation
      const highFreq = 0.8; // Higher frequency for detail
      const amplitude = 
        Math.abs(Math.sin(i * baseFreq) * 50) + // Main wave pattern
        Math.abs(Math.sin(i * highFreq) * 25) + // Detailed variations
        Math.random() * 20 + 15; // Natural randomness with minimum height
      
      // Check if this time corresponds to problematic segments
      const problematicSegment = segments.find(segment => {
        const segmentTime = parseTimestamp(segment.timestamp);
        const tolerance = 2; // 2 second tolerance window
        return Math.abs(timePosition - segmentTime) < tolerance && segment.flag !== 'neutral';
      });
      
      // Determine content type for coloring
      let contentType = 'normal';
      if (problematicSegment) {
        contentType = problematicSegment.flag === 'extremist' ? 'extremist' : 'mild';
      }
      
      // Separate the amplitude by content type for proper visualization
      const finalAmplitude = Math.max(amplitude, 8);
      
      points.push({
        time: timePosition,
        timeInSeconds,
        timeLabel,
        // Split amplitude by content type
        normal: contentType === 'normal' ? finalAmplitude : 0,
        mild: contentType === 'mild' ? finalAmplitude : 0,
        extremist: contentType === 'extremist' ? finalAmplitude : 0,
        // For tooltip display
        flag: problematicSegment?.flag || 'normal',
        text: problematicSegment?.text || ''
      });
    }
    return points;
  };

  // Chart configuration for timeline waveform
  const chartConfig = {
    normal: {
      label: "Normal Content",
      color: "hsl(var(--chart-1))",
    },
    mild: {
      label: "Minor Issues",
      color: "hsl(var(--chart-4))",
    },
    extremist: {
      label: "Harmful Content", 
      color: "hsl(var(--destructive))",
    },
  } satisfies ChartConfig;

  const waveformChartData = generateWaveformChartData();

  return (
    <div className="space-y-6">
      {/* Audio Player with Waveform */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Volume2 className="h-5 w-5" />
            Audio Analysis
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Timeline-based Waveform Chart */}
          <div className="relative bg-muted/20 rounded-lg p-2 h-32 overflow-hidden border cursor-pointer">
            <ChartContainer
              config={chartConfig}
              className="h-full w-full"
            >
              <AreaChart
                data={waveformChartData}
                margin={{ top: 5, right: 10, left: 10, bottom: 20 }}
                onClick={(data) => {
                  if (data && data.activePayload && data.activePayload[0]) {
                    const clickedTime = data.activePayload[0].payload.time;
                    const audio = audioRef.current;
                    if (audio && duration > 0) {
                      audio.currentTime = clickedTime;
                    }
                  }
                }}
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
                      const amplitude = data.normal || data.mild || data.extremist || 0;
                      return (
                        <div className="bg-background border rounded-lg p-2 shadow-lg">
                          <p className="text-sm font-medium">{data.timeLabel}</p>
                          <p className="text-sm text-muted-foreground">
                            Amplitude: {Math.round(amplitude)}%
                          </p>
                          {data.flag !== 'normal' && (
                            <p className={`text-sm font-medium ${
                              data.flag === 'extremist' ? 'text-destructive' : 'text-orange-500'
                            }`}>
                              {data.flag === 'extremist' ? 'Harmful Content' : 'Minor Issues'}
                            </p>
                          )}
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                
                {/* Timeline waveform areas by content type */}
                <Area
                  type="monotone"
                  dataKey="normal"
                  stroke="hsl(var(--chart-1))"
                  fill="hsl(var(--chart-1))"
                  fillOpacity={0.4}
                  strokeWidth={1}
                />
                <Area
                  type="monotone"
                  dataKey="mild"
                  stroke="hsl(var(--chart-4))"
                  fill="hsl(var(--chart-4))"
                  fillOpacity={0.6}
                  strokeWidth={1}
                />
                <Area
                  type="monotone"
                  dataKey="extremist"
                  stroke="hsl(var(--destructive))"
                  fill="hsl(var(--destructive))"
                  fillOpacity={0.8}
                  strokeWidth={1}
                />
                
                {/* Current playback position indicator */}
                <ReferenceLine 
                  x={currentTime} 
                  stroke="hsl(var(--foreground))" 
                  strokeWidth={2}
                  strokeDasharray="none"
                />
              </AreaChart>
            </ChartContainer>
          </div>

          {/* Audio Controls */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleSkipBack}
              >
                <SkipBack className="h-4 w-4" />
              </Button>
              <Button
                onClick={handlePlayPause}
                size="sm"
                className="h-10 w-10 rounded-full"
                disabled={!audioFile}
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
              >
                <SkipForward className="h-4 w-4" />
              </Button>
            </div>

            {/* Time display */}
            <div className="flex items-center gap-2 text-sm font-mono">
              <span>{formatTime(currentTime)}</span>
              <span className="text-muted-foreground">/</span>
              <span className="text-muted-foreground">{formatTime(duration)}</span>
            </div>

            {/* Seek slider */}
            <div className="flex-1">
              <Slider
                value={[currentTime]}
                onValueChange={handleSeek}
                max={duration}
                step={1}
                className="w-full"
              />
            </div>

            {/* Volume control */}
            <div className="flex items-center gap-2">
              <Volume2 className="h-4 w-4 text-muted-foreground" />
              <Slider
                value={[volume]}
                onValueChange={handleVolumeChange}
                max={100}
                step={1}
                className="w-20"
              />
            </div>

            <Button variant="outline" size="sm">
              <Maximize2 className="h-4 w-4" />
            </Button>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-primary/60 rounded"></div>
              <span>Normal Content</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-orange-500 rounded"></div>
              <span>Minor Issues</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-destructive rounded"></div>
              <span>Extremist Content</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Interactive Transcript */}
      <Card>
        <CardHeader>
          <CardTitle>Interactive Transcript</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-96">
            <div className="space-y-4">
              {segments.map((segment) => {
                const segmentTime = parseTimestamp(segment.timestamp);
                const isActive = activeSegmentId === segment.id;
                const isCurrentlyPlaying = currentTime >= segmentTime && currentTime < segmentTime + 5; // Assume 5-second segments

                return (
                  <div
                    key={segment.id}
                    className={`p-4 rounded-lg border-l-4 cursor-pointer transition-all ${
                      segment.flag === 'extremist'
                        ? 'border-l-destructive bg-destructive/5 hover:bg-destructive/10'
                        : segment.flag === 'mild'
                          ? 'border-l-orange-500 bg-orange-50 hover:bg-orange-100 dark:bg-orange-950/20'
                          : 'border-l-primary/20 bg-muted/20 hover:bg-muted/30'
                    } ${isActive ? 'ring-2 ring-primary' : ''} ${
                      isCurrentlyPlaying ? 'bg-primary/10' : ''
                    }`}
                    onClick={() => handleJumpToSegment(segment.id)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-mono text-muted-foreground font-medium">
                        {segment.timestamp}
                      </span>
                      {segment.flag !== 'neutral' && (
                        <span
                          className={`text-xs px-2 py-1 rounded-full font-medium ${
                            segment.flag === 'extremist'
                              ? 'bg-destructive text-destructive-foreground'
                              : 'bg-orange-500 text-white'
                          }`}
                        >
                          {segment.flag === 'extremist' ? 'HARMFUL' : 'MINOR'}
                        </span>
                      )}
                    </div>

                    <p
                      className={`text-base leading-relaxed mb-2 ${
                        segment.flag === 'extremist'
                          ? 'text-destructive font-medium'
                          : segment.flag === 'mild'
                            ? 'text-orange-700 dark:text-orange-300'
                            : 'text-foreground'
                      }`}
                    >
                      {segment.text}
                    </p>

                    {segment.explanation && (
                      <div className="bg-muted/50 rounded-md p-3 border-l-2 border-muted-foreground/20">
                        <p className="text-sm text-muted-foreground italic leading-relaxed">
                          <strong className="font-medium not-italic">Analysis:</strong>{' '}
                          {segment.explanation}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Audio element for real audio playback */}
      <audio 
        ref={audioRef} 
        src={audioUrl || undefined}
        className="hidden"
        preload="metadata"
      />
    </div>
  );
}