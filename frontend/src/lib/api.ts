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
  async uploadAudio(file: File): Promise<WhisperResponse> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${API_BASE_URL}/upload-audio`, {
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

// Type definitions for the Whisper API response
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