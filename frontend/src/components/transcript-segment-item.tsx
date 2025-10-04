import FlagIcon, { type FlagType } from './flag-icon';

interface TranscriptSegmentItemProps {
  id: string;
  timestamp: string;
  text: string;
  confidence: number;
  flag: FlagType;
  explanation?: string;
}

const getFlagVariant = (flag: FlagType) => {
  switch (flag) {
    case 'neutral':
      return 'border-l-primary';
    case 'mild':
      return 'border-l-secondary';
    case 'extremist':
      return 'border-l-destructive';
    default:
      return 'border-l-primary';
  }
};

const getFlagBgVariant = (flag: FlagType) => {
  switch (flag) {
    case 'neutral':
      return 'bg-muted/30';
    case 'mild':
      return 'bg-secondary/20';
    case 'extremist':
      return 'bg-destructive/10';
    default:
      return 'bg-muted/30';
  }
};

const getFlagLabel = (flag: FlagType) => {
  switch (flag) {
    case 'neutral':
      return 'CLEAN';
    case 'mild':
      return 'MINOR';
    case 'extremist':
      return 'HARMFUL';
    default:
      return 'CLEAN';
  }
};

export default function TranscriptSegmentItem({
  timestamp,
  text,
  confidence,
  flag,
  explanation
}: TranscriptSegmentItemProps) {
  return (
    <div className={`border-l-4 p-5 rounded-r-lg border transition-colors hover:bg-muted/20 ${getFlagVariant(flag)} ${getFlagBgVariant(flag)}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <FlagIcon flag={flag} className="h-5 w-5" />
          <span className="text-sm font-mono text-muted-foreground font-medium">
            {timestamp}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
            {(confidence * 100).toFixed(0)}% confidence
          </span>
          {flag !== 'neutral' && (
            <span className={`text-xs px-2 py-1 rounded-full font-medium ${
              flag === 'mild' ? 'bg-secondary text-secondary-foreground' :
              flag === 'extremist' ? 'bg-destructive text-destructive-foreground' :
              'bg-primary text-primary-foreground'
            }`}>
              {getFlagLabel(flag)}
            </span>
          )}
        </div>
      </div>
      <p className="text-foreground leading-relaxed mb-3 text-base">{text}</p>
      {explanation && (
        <div className="bg-muted/50 rounded-md p-3 border-l-2 border-muted-foreground/20">
          <p className="text-sm text-muted-foreground italic leading-relaxed">
            <strong className="font-medium not-italic">Analysis:</strong> {explanation}
          </p>
        </div>
      )}
    </div>
  );
}