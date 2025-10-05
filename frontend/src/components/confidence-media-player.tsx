"use client"

import { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react'
import { Pause, Play, Volume2, VolumeX } from 'lucide-react'

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
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

const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

const ConfidenceMediaPlayer = forwardRef<ConfidenceMediaPlayerRef, ConfidenceMediaPlayerProps>(
  ({ audioFile, audioUrl }, ref) => {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(1)
  const [isMuted, setIsMuted] = useState(false)
  const [audioSrc, setAudioSrc] = useState<string>('')

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

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Audio Player</CardTitle>
        <CardDescription>
          Playback controls and timeline navigation
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Hidden audio element */}
        <audio ref={audioRef} src={audioSrc || undefined} preload="metadata" />

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
            {audioSrc ? 'Ready' : 'No audio loaded'}
          </div>
        </div>
      </CardContent>
    </Card>
  )
})

ConfidenceMediaPlayer.displayName = 'ConfidenceMediaPlayer';

export default ConfidenceMediaPlayer;
