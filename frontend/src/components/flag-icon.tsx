import { Sun, Cloud, Zap } from 'lucide-react';

export type FlagType = 'neutral' | 'mild' | 'extremist';

interface FlagIconProps {
  flag: FlagType;
  className?: string;
}

const flagIconMap = {
  neutral: Sun,        // Clear skies - no issues
  mild: Cloud,         // Cloudy - minor issues
  extremist: Zap,      // Lightning - major issues
} as const;

export default function FlagIcon({ flag, className = "h-4 w-4" }: FlagIconProps) {
  const IconComponent = flagIconMap[flag] || Sun;
  return <IconComponent className={className} />;
}