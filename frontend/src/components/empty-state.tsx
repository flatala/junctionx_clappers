import { Card, CardContent } from './ui/card';
import { Zap } from 'lucide-react';

interface EmptyStateProps {
  title?: string;
  description?: string;
  icon?: React.ReactNode;
}

export default function EmptyState({ 
  title = "Ready to Analyze",
  description = "Upload an audio or video file to get started with content analysis",
  icon = <Zap className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
}: EmptyStateProps) {
  return (
    <Card className="h-96 flex items-center justify-center">
      <CardContent className="text-center">
        {icon}
        <h3 className="text-lg font-medium mb-2">
          {title}
        </h3>
        <p className="text-muted-foreground">
          {description}
        </p>
      </CardContent>
    </Card>
  );
}