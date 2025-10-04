import { Sun, Cloud, Zap } from 'lucide-react';

export type FlagType = 'neutral' | 'mild' | 'extremist';

interface FlagIconProps {
  flag: FlagType;
  className?: string;
}

const flagIconMap = {
  neutral: Sun,        // Clean content - no issues detected
  mild: Cloud,         // Minor issues - mild language or concerns
  extremist: Zap,      // Harmful content - extremist or toxic speech
} as const;

export default function FlagIcon({ flag, className = "h-4 w-4" }: FlagIconProps) {
  const IconComponent = flagIconMap[flag] || Sun;
  return <IconComponent className={className} />;
}