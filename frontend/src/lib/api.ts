// API configuration and utilities for connecting to the backend
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export class ApiError extends Error {
  public status: number;
  public statusText: string;

  constructor(message: string, status: number, statusText: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.statusText = statusText;
  }
}

export const api = {
  // Upload batch of files
  async uploadBatch(batchData: {
    name: string;
    description: string;
    files: File[];
    defaultDefinitions?: string[];
    customDefinitions?: string[];
    negativeExamples?: string[];
  }): Promise<{ batch_id: string }> {
    const formData = new FormData();
    formData.append('name', batchData.name);
    formData.append('description', batchData.description);

    // Convert arrays to JSON strings
    formData.append('default_definitions', JSON.stringify(batchData.defaultDefinitions || []));
    formData.append('custom_definitions', JSON.stringify(batchData.customDefinitions || []));
    formData.append('negative_examples', JSON.stringify(batchData.negativeExamples || []));

    batchData.files.forEach((file) => {
      formData.append('files', file);
    });

    const response = await fetch(`${API_BASE_URL}/upload/`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new ApiError(
        `Upload failed: ${response.statusText}`,
        response.status,
        response.statusText
      );
    }

    return response.json();
  },

  // Get batch details
  async getBatch(batchId: string): Promise<BatchDetails> {
    const response = await fetch(`${API_BASE_URL}/batch/${batchId}`);
    
    if (!response.ok) {
      throw new ApiError(
        `Failed to fetch batch: ${response.statusText}`,
        response.status,
        response.statusText
      );
    }

    return response.json();
  },

  // Get job details within a batch
  async getJob(batchId: string, jobId: string): Promise<JobAnalysisResult> {
    const response = await fetch(`${API_BASE_URL}/batch/${batchId}/${jobId}`);
    
    if (!response.ok) {
      throw new ApiError(
        `Failed to fetch job: ${response.statusText}`,
        response.status,
        response.statusText
      );
    }

    return response.json();
  },

  // Get audio file for a job
  async getJobAudioFile(batchId: string, jobId: string): Promise<Blob> {
    const response = await fetch(`${API_BASE_URL}/batch/${batchId}/${jobId}/file`);
    
    if (!response.ok) {
      throw new ApiError(
        `Failed to fetch audio file: ${response.statusText}`,
        response.status,
        response.statusText
      );
    }

    return response.blob();
  },

  async healthCheck(): Promise<{ status: string; database: string }> {
    const response = await fetch(`${API_BASE_URL}/health`);
    
    if (!response.ok) {
      throw new ApiError(
        `Health check failed: ${response.statusText}`,
        response.status,
        response.statusText
      );
    }

    return response.json();
  }
};

// Type definitions for batch workflow

export interface JobInfo {
  job_id: string;
  filename: string;
  status: string;
}

export interface BatchDetails {
  name: string;
  description: string;
  jobs: JobInfo[];
}

export interface JobAnalysisResult {
  audio_file_id: string;
  transcript_text: string;
  spans: AnalysisSpan[];
}

export interface AnalysisSpan {
  start: string;
  end: string;
  text: string;
  rationale: string;
  confidence: number;
}

export interface JobStatus {
  job_id: string;
  name: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
}

// Legacy type definitions for backward compatibility
export interface WhisperResponse {
  text: string;
  segments: WhisperSegment[];
  language: string;
}

export interface WhisperSegment {
  id: number;
  seek: number;
  start: number;
  end: number;
  text: string;
  tokens: number[];
  temperature: number;
  avg_logprob: number;
  compression_ratio: number;
  no_speech_prob: number;
}