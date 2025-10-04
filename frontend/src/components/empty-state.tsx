import { Card, CardContent } from './ui/card';
import { Zap } from 'lucide-react';

export default function EmptyState() {
  return (
    <Card className="h-96 flex items-center justify-center">
      <CardContent className="text-center">
        <Zap className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-medium mb-2">
          Ready to Analyze
        </h3>
        <p className="text-muted-foreground">
          Upload an audio or video file to get started with content analysis
        </p>
      </CardContent>
    </Card>
  );
}