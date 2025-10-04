import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from "@/components/theme-provider"
import BatchListView from './components/batch-list-view';
import BatchDetailsView from './components/batch-details-view';
import JobAnalysisView from './components/job-analysis-view';
import AppHeader from './components/app-header';
import AppFooter from './components/app-footer';
import './App.css'

function App() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <Router>
          <AppHeader />
            <div className='mx-auto px-4 max-w-6xl w-full flex-grow mb-16 min-h-screen'>

          <Routes>
            <Route path="/" element={<BatchListView />} />
            <Route path="/:batchId" element={<BatchDetailsView />} />
            <Route path="/:batchId/:jobId" element={<JobAnalysisView />} />
          </Routes>
          </div>
          <AppFooter />
      </Router>
    </ThemeProvider>
  )
}

export default App
