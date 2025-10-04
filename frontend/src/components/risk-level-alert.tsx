import { Alert, AlertDescription } from './ui/alert';
import { AlertTriangle, TrendingUp } from 'lucide-react';

type RiskLevel = 'low' | 'medium' | 'high';

interface RiskLevelAlertProps {
  riskLevel: RiskLevel;
}

const getRiskLevelIcon = (level: RiskLevel) => {
  switch (level) {
    case 'high':
      return <AlertTriangle className="h-4 w-4" />;
    default:
      return <TrendingUp className="h-4 w-4" />;
  }
};

const getRiskLevelMessage = (level: RiskLevel) => {
  switch (level) {
    case 'high':
      return 'This content contains concerning language that requires review.';
    case 'medium':
      return 'Some potentially problematic content detected.';
    case 'low':
      return 'Content appears to be largely appropriate.';
    default:
      return '';
  }
};

const getRiskLevelVariant = (level: RiskLevel) => {
  switch (level) {
    case 'high':
      return 'destructive';
    case 'medium':
      return 'default';
    case 'low':
      return 'default';
    default:
      return 'default';
  }
};

export default function RiskLevelAlert({ riskLevel }: RiskLevelAlertProps) {
  return (
    <Alert variant={getRiskLevelVariant(riskLevel)}>
      <div className="flex items-center gap-2">
        {getRiskLevelIcon(riskLevel)}
        <AlertDescription>
          <strong>Risk Level: {riskLevel.toUpperCase()}</strong>
          <span className="ml-2">{getRiskLevelMessage(riskLevel)}</span>
        </AlertDescription>
      </div>
    </Alert>
  );
}