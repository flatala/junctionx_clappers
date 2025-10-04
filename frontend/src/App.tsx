import PerunApp from './perun-app'
import { ThemeProvider } from "@/components/theme-provider"
import './App.css'

function App() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <PerunApp />
    </ThemeProvider>
  )
}

export default App
