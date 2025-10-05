import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Upload, Trash2, X, AlertTriangle, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { api, type BatchDetails, type BatchFeedbackSummary } from '@/lib/api';
import { storage } from '@/lib/storage';
import { DEFAULT_EXTREMISM_DEFINITIONS } from '@/lib/extremism-definitions';
import BatchFileUploader from './batch-file-uploader';
import ErrorAlert from './error-alert';
import EmptyState from './empty-state';

export default function BatchListView() {
  const [batches, setBatches] = useState<(BatchDetails & { id: string })[]>([]);
  const [batchFeedback, setBatchFeedback] = useState<Map<string, BatchFeedbackSummary>>(new Map());
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    files: [] as File[],
    defaultDefinitions: DEFAULT_EXTREMISM_DEFINITIONS,
    positiveExamples: [''] as string[],
    negativeExamples: [''] as string[]
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
      const validBatches = loadedBatches.filter((batch): batch is BatchDetails & { id: string } => batch !== null);
      setBatches(validBatches);
      
      // Load feedback for each batch
      const feedbackMap = new Map<string, BatchFeedbackSummary>();
      for (const batch of validBatches) {
        try {
          const feedback = await api.getBatchFeedbackSummary(batch.id);
          feedbackMap.set(batch.id, feedback);
        } catch (error) {
          console.error(`Failed to load feedback for batch ${batch.id}:`, error);
        }
      }
      setBatchFeedback(feedbackMap);
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
      // Merge form data with any additional user-edited examples
      const positiveExList = formData.positiveExamples.filter(e => e.trim() !== '');
      const negativeExList = formData.negativeExamples.filter(e => e.trim() !== '');

      // Filter out empty strings and duplicates
      const result = await api.uploadBatch({
        ...formData,
        positiveExamples: Array.from(new Set(positiveExList)),
        negativeExamples: Array.from(new Set(negativeExList))
      });
      storage.addBatchId(result.batch_id);

      // Reset form
      setFormData({
        name: '',
        description: '',
        files: [],
        defaultDefinitions: DEFAULT_EXTREMISM_DEFINITIONS,
        positiveExamples: [''],
        negativeExamples: ['']
      });
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
        <Button onClick={() => {
          // Pre-populate form with feedback from previous batches
          const allPositiveFromFeedback = new Set<string>();
          const allNegativeFromFeedback = new Set<string>();

          batchFeedback.forEach((feedback) => {
            feedback.positive_examples.forEach(ex => allNegativeFromFeedback.add(ex)); // User marked as normal
            feedback.negative_examples.forEach(ex => allPositiveFromFeedback.add(ex)); // User marked as extremist
          });

          setFormData({
            name: '',
            description: '',
            files: [],
            defaultDefinitions: DEFAULT_EXTREMISM_DEFINITIONS,
            positiveExamples: Array.from(allPositiveFromFeedback).length > 0 ? Array.from(allPositiveFromFeedback) : [''],
            negativeExamples: Array.from(allNegativeFromFeedback).length > 0 ? Array.from(allNegativeFromFeedback) : ['']
          });
          setShowCreateForm(true);
        }} disabled={showCreateForm}>
          <Plus className="w-4 h-4 mr-2" />
          Create Batch
        </Button>
      </div>

      {showCreateForm && (
        <Card>
          <CardHeader>
            {/* Show feedback usage indicator */}
            {(() => {
              // Count feedback items still present in the form
              const allPositiveFeedback = new Set<string>();
              const allNegativeFeedback = new Set<string>();
              Array.from(batchFeedback.values()).forEach(f => {
                f.negative_examples.forEach(ex => allPositiveFeedback.add(ex));
                f.positive_examples.forEach(ex => allNegativeFeedback.add(ex));
              });
              const positiveCount = formData.positiveExamples.filter(ex => ex.trim() !== '' && allPositiveFeedback.has(ex)).length;
              const negativeCount = formData.negativeExamples.filter(ex => ex.trim() !== '' && allNegativeFeedback.has(ex)).length;
              const totalCount = positiveCount + negativeCount;

              return totalCount > 0 && (
                <div className="flex items-center gap-2 mb-3 px-3 py-2 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg">
                  <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                  <span className="text-sm font-medium text-green-900 dark:text-green-100">
                    Using Previous Feedback
                  </span>
                  <span className="text-xs text-green-700 dark:text-green-300">
                    ({totalCount} example{totalCount !== 1 ? 's' : ''} from feedback)
                  </span>
                </div>
              );
            })()}
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
              <label className="block text-sm font-medium mb-1">
                Default Extremism Definitions
              </label>
              <p className="text-xs text-muted-foreground mb-2">
                Select the default definitions to use for extremism detection.
              </p>
              <div className="space-y-2">
                {DEFAULT_EXTREMISM_DEFINITIONS.map((definition, index) => {
                  const isChecked = formData.defaultDefinitions.includes(definition);
                  return (
                    <div key={index} className="flex items-start gap-2">
                      <input
                        type="checkbox"
                        id={`default-${index}`}
                        checked={isChecked}
                        onChange={(e) => {
                          const newDefaults = e.target.checked
                            ? [...formData.defaultDefinitions, definition]
                            : formData.defaultDefinitions.filter(d => d !== definition);
                          setFormData({ ...formData, defaultDefinitions: newDefaults });
                        }}
                        className="mt-1 h-4 w-4"
                      />
                      <label htmlFor={`default-${index}`} className="text-sm flex-1 cursor-pointer">
                        {definition}
                      </label>
                    </div>
                  );
                })}
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-1">
                <label className="text-sm font-medium">
                  Positive Examples
                  <span className="text-xs text-muted-foreground ml-2">(Optional)</span>
                </label>
                {(() => {
                  // Count only feedback items that are still present in the form
                  const allFeedbackItems = new Set<string>();
                  Array.from(batchFeedback.values()).forEach(f => {
                    f.negative_examples.forEach(ex => allFeedbackItems.add(ex));
                  });
                  const feedbackCount = formData.positiveExamples.filter(ex =>
                    ex.trim() !== '' && allFeedbackItems.has(ex)
                  ).length;
                  return feedbackCount > 0 && (
                    <div className="flex items-center gap-1 px-2 py-0.5 bg-orange-100 dark:bg-orange-900/20 rounded text-xs text-orange-700 dark:text-orange-300">
                      <AlertTriangle className="w-3 h-3" />
                      <span>{feedbackCount} from feedback</span>
                    </div>
                  );
                })()}
              </div>
              <p className="text-xs text-muted-foreground mb-2">
                Concrete examples of extremist content TO flag.
              </p>
              <div className="space-y-2">
                {formData.positiveExamples.map((example, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      value={example}
                      onChange={(e) => {
                        const newPositive = [...formData.positiveExamples];
                        newPositive[index] = e.target.value;
                        setFormData({ ...formData, positiveExamples: newPositive });
                      }}
                      placeholder="e.g., Kill all infidels, Death to traitors..."
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        const newPositive = formData.positiveExamples.filter((_, i) => i !== index);
                        // Ensure at least one empty field remains
                        if (newPositive.length === 0) {
                          newPositive.push('');
                        }
                        setFormData({ ...formData, positiveExamples: newPositive });
                      }}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setFormData({
                  ...formData,
                  positiveExamples: [...formData.positiveExamples, '']
                })}
                className="mt-2"
              >
                <Plus className="w-4 h-4 mr-1" />
                Add Positive Example
              </Button>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-1">
                <label className="text-sm font-medium">
                  Negative Examples
                  <span className="text-xs text-muted-foreground ml-2">(Optional)</span>
                </label>
                {(() => {
                  // Count only feedback items that are still present in the form
                  const allFeedbackItems = new Set<string>();
                  Array.from(batchFeedback.values()).forEach(f => {
                    f.positive_examples.forEach(ex => allFeedbackItems.add(ex));
                  });
                  const feedbackCount = formData.negativeExamples.filter(ex =>
                    ex.trim() !== '' && allFeedbackItems.has(ex)
                  ).length;
                  return feedbackCount > 0 && (
                    <div className="flex items-center gap-1 px-2 py-0.5 bg-green-100 dark:bg-green-900/20 rounded text-xs text-green-700 dark:text-green-300">
                      <CheckCircle className="w-3 h-3" />
                      <span>{feedbackCount} from feedback</span>
                    </div>
                  );
                })()}
              </div>
              <p className="text-xs text-muted-foreground mb-2">
                Concrete examples of normal content NOT to flag.
              </p>
              <div className="space-y-2">
                {formData.negativeExamples.map((example, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      value={example}
                      onChange={(e) => {
                        const newNegative = [...formData.negativeExamples];
                        newNegative[index] = e.target.value;
                        setFormData({ ...formData, negativeExamples: newNegative });
                      }}
                      placeholder="e.g., News reporting, Academic discussion..."
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        const newNegative = formData.negativeExamples.filter((_, i) => i !== index);
                        // Ensure at least one empty field remains
                        if (newNegative.length === 0) {
                          newNegative.push('');
                        }
                        setFormData({ ...formData, negativeExamples: newNegative });
                      }}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setFormData({
                  ...formData,
                  negativeExamples: [...formData.negativeExamples, '']
                })}
                className="mt-2"
              >
                <Plus className="w-4 h-4 mr-1" />
                Add Negative Example
              </Button>
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
          {batches.map((batch) => {
            const feedback = batchFeedback.get(batch.id);
            const hasUserFeedback = feedback && (feedback.positive_examples.length > 0 || feedback.negative_examples.length > 0);
            
            return (
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
                <CardContent className="pt-0 space-y-4">
                  {batch.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {batch.description}
                    </p>
                  )}
                  
                  {hasUserFeedback && (
                    <div className="space-y-2 pt-2 border-t">
                      <p className="text-xs font-semibold text-muted-foreground uppercase">
                        Human Feedback
                      </p>
                      {feedback.positive_examples.length > 0 && (
                        <div className="flex items-start gap-2 text-xs">
                          <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                          <div>
                            <span className="font-medium text-green-600">
                              {feedback.positive_examples.length} phrase{feedback.positive_examples.length !== 1 ? 's' : ''}
                            </span>
                            <span className="text-muted-foreground"> marked as normal</span>
                          </div>
                        </div>
                      )}
                      {feedback.negative_examples.length > 0 && (
                        <div className="flex items-start gap-2 text-xs">
                          <AlertTriangle className="w-4 h-4 text-orange-600 flex-shrink-0 mt-0.5" />
                          <div>
                            <span className="font-medium text-orange-600">
                              {feedback.negative_examples.length} phrase{feedback.negative_examples.length !== 1 ? 's' : ''}
                            </span>
                            <span className="text-muted-foreground"> marked as extremist</span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  
                  <Link to={`/${batch.id}`}>
                    <Button className="w-full">
                      View Batch
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}