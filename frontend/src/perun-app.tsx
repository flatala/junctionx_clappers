import FileUploader from './components/file-uploader';
import ProgressSection from './components/progress-section';
import TranscriptView from './components/transcript-view';
import SummaryPanel from './components/summary-panel';
import AppHeader from './components/app-header';
import AppFooter from './components/app-footer';
import EmptyState from './components/empty-state';
import { useAnalysis } from './hooks/use-analysis';
import { useExport } from './hooks/use-export';

export default function PerunApp() {
  const {
    selectedFile,
    isAnalyzing,
    progress,
    currentStage,
    showResults,
    transcriptSegments,
    handleFileSelect,
    handleStartAnalysis,
  } = useAnalysis();

  const { mockSummaryData, handleDownloadJson, handleDownloadCsv } = useExport(
    selectedFile,
    transcriptSegments
  );

  return (
      <div className="container mx-auto px-4 max-w-6xl">
        <AppHeader />
        <div className="grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-1 space-y-6">
            <FileUploader
              onFileSelect={handleFileSelect}
              onStartAnalysis={handleStartAnalysis}
              selectedFile={selectedFile}
              isAnalyzing={isAnalyzing}
            />
            
            <ProgressSection
              progress={progress}
              stage={currentStage}
              isVisible={isAnalyzing}
            />

            {showResults && (
              <SummaryPanel
                summaryData={mockSummaryData}
                isVisible={showResults}
                onDownloadJson={handleDownloadJson}
                onDownloadCsv={handleDownloadCsv}
              />
            )}
          </div>

          <div className="lg:col-span-2">
            {showResults ? (
              <TranscriptView
                segments={transcriptSegments}
                isVisible={showResults}
              />
            ) : (
              <EmptyState />
            )}
          </div>
        </div>

        <AppFooter />
      </div>
  );
}