// Local storage utilities for managing batch IDs

const BATCH_IDS_KEY = 'perun_batch_ids';

export const storage = {
  // Get all batch IDs from localStorage
  getBatchIds(): string[] {
    const stored = localStorage.getItem(BATCH_IDS_KEY);
    return stored ? JSON.parse(stored) : [];
  },

  // Add a new batch ID to localStorage
  addBatchId(batchId: string): void {
    const batchIds = this.getBatchIds();
    if (!batchIds.includes(batchId)) {
      batchIds.unshift(batchId); // Add to beginning for recency
      localStorage.setItem(BATCH_IDS_KEY, JSON.stringify(batchIds));
    }
  },

  // Remove a batch ID from localStorage
  removeBatchId(batchId: string): void {
    const batchIds = this.getBatchIds();
    const filtered = batchIds.filter(id => id !== batchId);
    localStorage.setItem(BATCH_IDS_KEY, JSON.stringify(filtered));
  },

  // Clear all batch IDs
  clearBatchIds(): void {
    localStorage.removeItem(BATCH_IDS_KEY);
  }
};