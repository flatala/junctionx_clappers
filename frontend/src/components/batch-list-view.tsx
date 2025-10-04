import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Upload, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { api, type BatchDetails } from '@/lib/api';
import { storage } from '@/lib/storage';
import BatchFileUploader from './batch-file-uploader';
import ErrorAlert from './error-alert';
import EmptyState from './empty-state';

export default function BatchListView() {
  const [batches, setBatches] = useState<(BatchDetails & { id: string })[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    files: [] as File[],
    extremismDefinition: ''
  });

  useEffect(() => {
    loadBatches();
  }, []);

  const loadBatches = async () => {
    setIsLoading(true);
    try {
      const batchIds = storage.getBatchIds();
      const batchPromises = batchIds.map(async (id) => {
        try {
          const batch = await api.getBatch(id);
          return { ...batch, id };
        } catch (error) {
          console.error(`Failed to load batch ${id}:`, error);
          return null;
        }
      });
      
      const loadedBatches = await Promise.all(batchPromises);
      setBatches(loadedBatches.filter((batch): batch is BatchDetails & { id: string } => batch !== null));
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to load batches');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateBatch = async () => {
    if (!formData.name.trim() || formData.files.length === 0) {
      setError('Please provide a batch name and select at least one file');
      return;
    }

    setIsUploading(true);
    try {
      const result = await api.uploadBatch(formData);
      storage.addBatchId(result.batch_id);
      
      // Reset form
      setFormData({ name: '', description: '', files: [], extremismDefinition: '' });
      setShowCreateForm(false);
      
      // Reload batches
      await loadBatches();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to create batch');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteBatch = (batchId: string) => {
    storage.removeBatchId(batchId);
    setBatches(batches.filter(batch => batch.id !== batchId));
  };

  const clearError = () => setError(null);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading batches...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <ErrorAlert error={error} onDismiss={clearError} />
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Audio Analysis Batches</h1>
          <p className="text-muted-foreground">Manage and monitor your audio analysis projects</p>
        </div>
        <Button onClick={() => setShowCreateForm(true)} disabled={showCreateForm}>
          <Plus className="w-4 h-4 mr-2" />
          Create Batch
        </Button>
      </div>

      {showCreateForm && (
        <Card>
          <CardHeader>
            <CardTitle>Create New Batch</CardTitle>
            <CardDescription>
              Upload multiple audio files for analysis as a batch
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium mb-2">
                Batch Name *
              </label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter batch name"
              />
            </div>
            
            <div>
              <label htmlFor="description" className="block text-sm font-medium mb-2">
                Description
              </label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Optional description"
                rows={3}
              />
            </div>

            <div>
              <label htmlFor="extremismDefinition" className="block text-sm font-medium mb-2">
                Custom Extremism Definition
                <span className="text-xs text-muted-foreground ml-2">(Optional)</span>
              </label>
              <Textarea
                id="extremismDefinition"
                value={formData.extremismDefinition}
                onChange={(e) => setFormData({ ...formData, extremismDefinition: e.target.value })}
                placeholder="Define what you consider extremist content for this analysis..."
                rows={4}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Provide your own definition of extremism to guide the AI analysis. If left empty, the default definition will be used.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Audio Files *
              </label>
              <BatchFileUploader
                onFileSelect={(files: File[]) => setFormData({ ...formData, files })}
                selectedFiles={formData.files}
                multiple={true}
              />
            </div>

            <div className="flex gap-2">
              <Button 
                onClick={handleCreateBatch} 
                disabled={isUploading}
                className="flex-1"
              >
                {isUploading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Creating Batch...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Create Batch
                  </>
                )}
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setShowCreateForm(false)}
                disabled={isUploading}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {batches.length === 0 ? (
        <EmptyState 
          title="No batches yet"
          description="Create your first batch to start analyzing audio files"
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {batches.map((batch) => (
            <Card key={batch.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-lg">{batch.name}</CardTitle>
                    <CardDescription className="text-sm">
                      {batch.jobs.length} file{batch.jobs.length !== 1 ? 's' : ''}
                    </CardDescription>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteBatch(batch.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                {batch.description && (
                  <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                    {batch.description}
                  </p>
                )}
                <Link to={`/${batch.id}`}>
                  <Button className="w-full">
                    View Batch
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}