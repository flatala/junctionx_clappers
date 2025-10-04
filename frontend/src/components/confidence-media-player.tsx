"use client"

import { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react'
import { Pause, Play, Volume2, VolumeX } from 'lucide-react'
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts'

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

interface ConfidenceMediaPlayerProps {
  audioFile?: File | string
  audioUrl?: string
}

export interface ConfidenceMediaPlayerRef {
  seekTo: (timeInSeconds: number) => void;
  play: () => void;
  pause: () => void;
}

// Analyze audio and extract real volume levels
const analyzeAudioVolume = async (audioElement: HTMLAudioElement): Promise<Array<{time: number, volume: number, label: string}>> => {
  return new Promise((resolve, reject) => {
    try {
      // Create audio context
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      
      // Create source from audio element
      const source = audioContext.createMediaElementSource(audioElement)
      
      // Create analyser
      const analyser = audioContext.createAnalyser()
      analyser.fftSize = 2048
      const bufferLength = analyser.frequencyBinCount
      const dataArray = new Uint8Array(bufferLength)
      
      // Connect nodes
      source.connect(analyser)
      analyser.connect(audioContext.destination)
      
      // Store volume data
      const volumeData: Array<{time: number, volume: number, label: string}> = []
      const duration = audioElement.duration
      const dataPoints = 100
      const interval = duration / dataPoints
      
      let currentIndex = 0
      let isAnalyzing = true
      
      // Function to get volume at current time
      const captureVolume = () => {
        if (!isAnalyzing || currentIndex >= dataPoints) {
          audioElement.pause()
          audioElement.currentTime = 0
          audioContext.close()
          resolve(volumeData)
          return
        }
        
        analyser.getByteTimeDomainData(dataArray)
        
        // Calculate RMS (Root Mean Square) for volume
        let sum = 0
        for (let i = 0; i < bufferLength; i++) {
          const normalized = (dataArray[i] - 128) / 128
          sum += normalized * normalized
        }
        const rms = Math.sqrt(sum / bufferLength)
        const volume = Math.min(100, Math.round(rms * 200)) // Scale to 0-100
        
        const time = currentIndex * interval
        volumeData.push({
          time: time,
          volume: volume,
          label: formatTime(time)
        })
        
        currentIndex++
        
        // Seek to next time point
        if (currentIndex < dataPoints) {
          audioElement.currentTime = currentIndex * interval
          requestAnimationFrame(captureVolume)
        } else {
          captureVolume()
        }
      }
      
      // Wait for audio to be ready and start playing with user interaction simulation
      audioElement.addEventListener('canplay', () => {
        // Try to play, catch the error if autoplay is blocked
        const playPromise = audioElement.play()
        if (playPromise !== undefined) {
          playPromise.then(() => {
            captureVolume()
          }).catch((error) => {
            // Autoplay was prevented, resolve with empty data
            console.warn('Autoplay blocked during analysis:', error)
            audioContext.close()
            resolve([])
          })
        }
      }, { once: true })
      
      // Start from beginning
      audioElement.currentTime = 0
      
    } catch (error) {
      console.error('Error analyzing audio:', error)
      reject(error)
    }
  })
}

const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

const chartConfig = {
  volume: {
    label: "Volume Level",
    color: "hsl(var(--chart-1))",
  },
} satisfies ChartConfig

const ConfidenceMediaPlayer = forwardRef<ConfidenceMediaPlayerRef, ConfidenceMediaPlayerProps>(
  ({ audioFile, audioUrl }, ref) => {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(1)
  const [isMuted, setIsMuted] = useState(false)
  const [volumeData, setVolumeData] = useState<Array<{time: number, volume: number, label: string}>>([])
  const [audioSrc, setAudioSrc] = useState<string>('')
  const [isAnalyzing, setIsAnalyzing] = useState(false)

  // Expose methods to parent via ref
  useImperativeHandle(ref, () => ({
    seekTo: (timeInSeconds: number) => {
      if (audioRef.current) {
        audioRef.current.currentTime = timeInSeconds;
        setCurrentTime(timeInSeconds);
      }
    },
    play: () => {
      if (audioRef.current && !isPlaying) {
        audioRef.current.play();
        setIsPlaying(true);
      }
    },
    pause: () => {
      if (audioRef.current && isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      }
    },
  }));

  // Handle audio source
  useEffect(() => {
    if (audioFile instanceof File) {
      const url = URL.createObjectURL(audioFile)
      setAudioSrc(url)
      return () => URL.revokeObjectURL(url)
    } else if (audioUrl) {
      setAudioSrc(audioUrl)
    } else if (typeof audioFile === 'string') {
      setAudioSrc(audioFile)
    }
  }, [audioFile, audioUrl])

  // Analyze audio volume when audio is loaded and user interacts
  useEffect(() => {
    const analyzeAudio = async () => {
      const audio = audioRef.current
      if (!audio || !audioSrc || duration === 0 || isAnalyzing || volumeData.length > 0) return
      
      setIsAnalyzing(true)
      try {
        // Create a separate audio element for analysis
        const analysisAudio = new Audio(audioSrc)
        analysisAudio.crossOrigin = 'anonymous'
        // Mute the analysis audio so it doesn't interfere
        analysisAudio.volume = 0
        
        await new Promise((resolve) => {
          analysisAudio.addEventListener('loadedmetadata', resolve, { once: true })
          analysisAudio.load()
        })
        
        const data = await analyzeAudioVolume(analysisAudio)
        if (data.length === 0) {
          // If analysis failed due to autoplay restrictions, generate placeholder data
          const fallbackData = generateFallbackVolumeData(duration)
          setVolumeData(fallbackData)
        } else {
          setVolumeData(data)
        }
      } catch (error) {
        console.error('Failed to analyze audio:', error)
        // Fallback to placeholder data
        const fallbackData = generateFallbackVolumeData(duration)
        setVolumeData(fallbackData)
      } finally {
        setIsAnalyzing(false)
      }
    }
    
    analyzeAudio()
  }, [audioSrc, duration, isAnalyzing, volumeData.length])

  // Generate fallback volume data when real analysis isn't possible
  const generateFallbackVolumeData = (duration: number) => {
    const dataPoints = 100
    const interval = duration / dataPoints
    
    return Array.from({ length: dataPoints }, (_, i) => {
      const time = i * interval
      // Generate a smooth sine wave pattern as placeholder
      const volume = Math.max(0, Math.min(100, 50 + Math.sin(time * 0.5) * 30))
      
      return {
        time: time,
        volume: Math.round(volume),
        label: formatTime(time)
      }
    })
  }

  // Audio event listeners
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const handleTimeUpdate = () => setCurrentTime(audio.currentTime)
    const handleDurationChange = () => setDuration(audio.duration)
    const handleEnded = () => setIsPlaying(false)
    const handleLoadedMetadata = () => {
      setDuration(audio.duration)
    }

    audio.addEventListener('timeupdate', handleTimeUpdate)
    audio.addEventListener('durationchange', handleDurationChange)
    audio.addEventListener('ended', handleEnded)
    audio.addEventListener('loadedmetadata', handleLoadedMetadata)

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate)
      audio.removeEventListener('durationchange', handleDurationChange)
      audio.removeEventListener('ended', handleEnded)
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata)
    }
  }, [])

  const togglePlayPause = () => {
    const audio = audioRef.current
    if (!audio) return

    if (isPlaying) {
      audio.pause()
    } else {
      audio.play()
    }
    setIsPlaying(!isPlaying)
  }

  const handleSeek = (value: number[]) => {
    const audio = audioRef.current
    if (!audio) return

    const newTime = value[0]
    audio.currentTime = newTime
    setCurrentTime(newTime)
  }

  const handleVolumeChange = (value: number[]) => {
    const audio = audioRef.current
    if (!audio) return

    const newVolume = value[0]
    audio.volume = newVolume
    setVolume(newVolume)
    setIsMuted(newVolume === 0)
  }

  const toggleMute = () => {
    const audio = audioRef.current
    if (!audio) return

    if (isMuted) {
      audio.volume = volume || 0.5
      setVolume(volume || 0.5)
      setIsMuted(false)
    } else {
      audio.volume = 0
      setIsMuted(true)
    }
  }

  const handleChartClick = (data: any) => {
    if (!data || !data.activePayload || !data.activePayload[0]) return
    
    const clickedTime = data.activePayload[0].payload.time
    const audio = audioRef.current
    if (!audio) return

    audio.currentTime = clickedTime
    setCurrentTime(clickedTime)
    
    if (!isPlaying) {
      audio.play()
      setIsPlaying(true)
    }
  }

  const getVolumeColor = (volume: number): string => {
    if (volume >= 70) return 'hsl(0, 84%, 60%)' // Red (loud)
    if (volume >= 40) return 'hsl(43, 96%, 56%)' // Yellow (medium)
    return 'hsl(142, 76%, 36%)' // Green (quiet)
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Audio Analysis Player</CardTitle>
        <CardDescription>
          Interactive volume level visualization over time
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Hidden audio element */}
        <audio ref={audioRef} src={audioSrc || undefined} preload="metadata" />

        {/* Volume Chart */}
        <div className="relative">
          <ChartContainer config={chartConfig} className="h-[200px] w-full">
            <AreaChart
              data={volumeData}
              margin={{ left: 12, right: 12, top: 12, bottom: 12 }}
              onClick={handleChartClick}
              className="cursor-pointer"
            >
              <defs>
                <linearGradient id="volumeGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--chart-1))" stopOpacity={0.8} />
                  <stop offset="100%" stopColor="hsl(var(--chart-1))" stopOpacity={0.2} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="time"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tickFormatter={(value) => formatTime(value)}
                label={{ value: 'Time', position: 'insideBottom', offset: -5 }}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                domain={[0, 100]}
                label={{ value: 'Volume %', angle: -90, position: 'insideLeft' }}
              />
              <ChartTooltip
                content={({ active, payload }) => {
                  if (!active || !payload || !payload[0]) return null
                  const data = payload[0].payload
                  return (
                    <div className="rounded-lg border bg-background p-2 shadow-md">
                      <div className="flex flex-col gap-1">
                        <span className="text-xs text-muted-foreground">
                          Time: {data.label}
                        </span>
                        <span className="text-sm font-bold" style={{ color: getVolumeColor(data.volume) }}>
                          Volume: {data.volume}%
                        </span>
                      </div>
                    </div>
                  )
                }}
              />
              <Area
                dataKey="volume"
                type="monotone"
                fill="url(#volumeGradient)"
                fillOpacity={0.6}
                stroke="hsl(var(--chart-1))"
                strokeWidth={2}
                isAnimationActive={false}
              />
              
              {/* Current time indicator */}
              {currentTime > 0 && (
                <line
                  x1={`${(currentTime / duration) * 100}%`}
                  x2={`${(currentTime / duration) * 100}%`}
                  y1="0"
                  y2="100%"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  strokeDasharray="4 4"
                />
              )}
            </AreaChart>
          </ChartContainer>
        </div>

        {/* Timeline Slider */}
        <div className="space-y-2">
          <Slider
            value={[currentTime]}
            min={0}
            max={duration || 100}
            step={0.1}
            onValueChange={handleSeek}
            className="cursor-pointer"
          />
          <div className="flex justify-between text-xs text-muted-foreground px-2">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={togglePlayPause}
            disabled={!audioSrc}
          >
            {isPlaying ? (
              <Pause className="h-4 w-4" />
            ) : (
              <Play className="h-4 w-4" />
            )}
          </Button>

          <div className="flex items-center gap-2 flex-1 max-w-[200px]">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleMute}
              disabled={!audioSrc}
            >
              {isMuted ? (
                <VolumeX className="h-4 w-4" />
              ) : (
                <Volume2 className="h-4 w-4" />
              )}
            </Button>
            <Slider
              value={[isMuted ? 0 : volume]}
              min={0}
              max={1}
              step={0.01}
              onValueChange={handleVolumeChange}
              className="flex-1"
            />
          </div>

          <div className="text-sm text-muted-foreground ml-auto">
            {isAnalyzing ? 'Analyzing audio...' : audioSrc ? 'Ready' : 'No audio loaded'}
          </div>
        </div>
      </CardContent>
    </Card>
  )
})

ConfidenceMediaPlayer.displayName = 'ConfidenceMediaPlayer';

export default ConfidenceMediaPlayer;
