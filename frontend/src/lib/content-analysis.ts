import type { FlagType } from '../components/flag-icon';

export interface AnalysisResult {
  flag: FlagType;
  confidence: number;
  explanation?: string;
}

// Mock content analysis - in production this would be replaced with actual AI/ML service
export function analyzeTextContent(text: string): AnalysisResult {
  // Extremist content patterns
  const extremistPatterns = [
    /those\s+(people|immigrants|[a-z]+s)\s+are\s+.*(taking over|destroying|poisoning)/i,
    /we\s+need\s+to\s+.*(stop|fight|take action against)\s+them/i,
    /shouldn't\s+be\s+allowed/i,
    /real\s+patriots\s+need\s+to/i,
    /agenda\s+is\s+poisoning/i
  ];

  // Mild profanity patterns  
  const mildPatterns = [
    /\b(damn|shit|fucking)\b/i,
    /pain\s+in\s+the\s+ass/i
  ];

  // Check for extremist content
  for (const pattern of extremistPatterns) {
    if (pattern.test(text)) {
      let explanation = '';
      
      if (/those\s+(people|immigrants)/i.test(text)) {
        explanation = 'Contains discriminatory language targeting a specific group. Promotes exclusion based on identity.';
      } else if (/taking\s+action|fight\s+back/i.test(text)) {
        explanation = 'Contains language that suggests confrontational action or potential incitement.';
      } else if (/agenda.*poisoning/i.test(text)) {
        explanation = 'Promotes discriminatory views and uses dehumanizing language against a specific group.';
      } else {
        explanation = 'Contains potentially harmful rhetoric that targets specific groups or promotes exclusion.';
      }
      
      return {
        flag: 'extremist',
        confidence: 0.85 + Math.random() * 0.1, // 0.85-0.95
        explanation
      };
    }
  }

  // Check for mild issues
  for (const pattern of mildPatterns) {
    if (pattern.test(text)) {
      let explanation = '';
      
      if (/damn|shit/i.test(text) && !/targeting|against/i.test(text)) {
        explanation = 'Contains mild profanity used for emphasis, not targeting individuals or groups.';
      } else if (/fucking/i.test(text)) {
        explanation = 'Contains strong profanity but used for emphasis rather than targeting individuals.';
      } else {
        explanation = 'Contains mild language issues but not directed at specific individuals or groups.';
      }
      
      return {
        flag: 'mild',
        confidence: 0.75 + Math.random() * 0.15, // 0.75-0.90
        explanation
      };
    }
  }

  // Default to neutral
  return {
    flag: 'neutral',
    confidence: 0.90 + Math.random() * 0.08 // 0.90-0.98
  };
}