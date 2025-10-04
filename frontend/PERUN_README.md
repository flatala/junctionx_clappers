# Perun Frontend

A React application for analyzing audio and video content for extremist or toxic speech, built with Vite, TypeScript, and shadcn/ui components.

## Features

- **File Upload**: Drag & drop or browse to upload MP3, WAV, or MP4 files
- **Real-time Progress**: Visual progress tracking during analysis
- **Transcript Analysis**: Color-coded transcript with timestamps and confidence scores
- **Risk Assessment**: Automated risk level categorization (Low/Medium/High)
- **Timeline Visualization**: Visual timeline showing flagged segments
- **Export Options**: Download results as JSON or CSV
- **Responsive Design**: Works on desktop and mobile devices

## Color Coding

- 🟢 **Green**: Neutral content - no concerning language detected
- 🟠 **Orange**: Mild content - potentially inappropriate language (e.g., mild profanity)
- 🔴 **Red**: Extremist content - hate speech, discriminatory language, or extremist content

## Components

### Main Components
- `PerunApp.tsx` - Main application component
- `FileUploader.tsx` - File upload interface with drag & drop
- `ProgressSection.tsx` - Analysis progress indicator
- `TranscriptView.tsx` - Scrollable transcript with color-coded segments
- `SummaryPanel.tsx` - Risk assessment, timeline, metrics, and export options

### UI Components (shadcn/ui)
- Button, Card, Progress, Table, Alert, ScrollArea, Input, Slider

## Getting Started

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Start development server**:
   ```bash
   npm run dev
   ```

3. **Build for production**:
   ```bash
   npm run build
   ```

## Usage

1. **Upload File**: Click "Drop your file here or click to browse" or drag & drop an audio/video file
2. **Start Analysis**: Click "Start Analysis" button to begin processing
3. **View Results**: Review the color-coded transcript, timeline, and summary metrics
4. **Export Data**: Download results as JSON or CSV using the export buttons

## Mock Data

The application currently uses mock data for demonstration purposes. In a production environment, you would integrate with a backend API that provides:

- Real audio/video transcription
- AI-powered content analysis
- Confidence scoring
- Risk assessment algorithms

## Integration Points

The application is designed with placeholder hooks for backend integration:

```typescript
// Example API integration points:
// POST /api/upload - File upload
// GET /api/analyze/:fileId - Analysis status
// GET /api/results/:fileId - Analysis results
```

## Styling

- **Design System**: Uses shadcn/ui components with Tailwind CSS
- **Color Scheme**: Neutral research-oriented aesthetic with blue accent (#3b82f6)
- **Typography**: Clean, readable fonts with proper hierarchy
- **Layout**: Responsive grid layout that adapts to different screen sizes

## Browser Support

- Modern browsers with ES2020+ support
- Chrome 88+, Firefox 85+, Safari 14+, Edge 88+