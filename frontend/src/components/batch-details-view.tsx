import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, FileAudio, Video, Clock, CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { api, type BatchDetails, type JobInfo } from '@/lib/api';
import ErrorAlert from './error-alert';
import EmptyState from './empty-state';

export default function BatchDetailsView() {
  const { batchId } = useParams<{ batchId: string }>();
  const navigate = useNavigate();
  const [batch, setBatch] = useState<BatchDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (batchId) {
      loadBatchDetails();
    }
  }, [batchId]);

  const loadBatchDetails = async () => {
    if (!batchId) return;
    
    setIsLoading(true);
    try {
      const batchData = await api.getBatch(batchId);
      setBatch(batchData);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to load batch details');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'analysing':
        return <RefreshCw className="w-4 h-4 animate-spin text-blue-500" />;
      default:
        return <Clock className="w-4 h-4 text-yellow-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="default" className="bg-green-500">Completed</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      case 'analysing':
        return <Badge variant="secondary">Processing</Badge>;
      default:
        return <Badge variant="outline">Pending</Badge>;
    }
  };

  const getFileIcon = (fileName: string) => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    if (['mp4', 'avi', 'mov', 'mkv'].includes(extension || '')) {
      return <Video className="w-5 h-5" />;
    }
    return <FileAudio className="w-5 h-5" />;
  };

  const clearError = () => setError(null);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading batch details...</p>
        </div>
      </div>
    );
  }

  if (!batch) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate('/')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Batches
          </Button>
        </div>
        <EmptyState 
          title="Batch not found"
          description="The requested batch could not be found"
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <ErrorAlert error={error} onDismiss={clearError} />
      )}

      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate('/')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Batches
        </Button>
      </div>

      {/* Batch Info */}
      <Card>
        <CardHeader>
          <CardTitle>{batch.name}</CardTitle>
          <CardDescription>
            {batch.description || 'No description provided'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span>{batch.jobs.length} file{batch.jobs.length !== 1 ? 's' : ''}</span>
            <span>•</span>
            <span>
              {batch.jobs.filter((job: JobInfo) => job.status === 'completed').length} completed
            </span>
            <span>•</span>
            <span>
              {batch.jobs.filter((job: JobInfo) => job.status === 'processing').length} processing
            </span>
            {batch.jobs.filter((job: JobInfo) => job.status === 'failed').length > 0 && (
              <>
                <span>•</span>
                <span className="text-red-500">
                  {batch.jobs.filter((job: JobInfo) => job.status === 'failed').length} failed
                </span>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Jobs List */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Files in this batch</h2>
        
        {batch.jobs.length === 0 ? (
          <EmptyState 
            title="No files in this batch"
            description="This batch doesn't contain any files"
          />
        ) : (
          <div className="space-y-3">
            {batch.jobs.map((job: JobInfo) => (
              <Card key={job.job_id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {getFileIcon(job.filename)}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate" title={job.filename}>
                          {job.filename}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          {getStatusIcon(job.status)}
                          {getStatusBadge(job.status)}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      {job.status === 'completed' && (
                        <Link to={`/${batchId}/${job.job_id}`}>
                          <Button size="sm">
                            View Analysis
                          </Button>
                        </Link>
                      )}
                      {job.status === 'failed' && (
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => loadBatchDetails()}
                        >
                          Retry
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}