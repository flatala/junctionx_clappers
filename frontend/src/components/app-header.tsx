import Logo from './logo';

export default function AppHeader() {
  return (
    <header className="w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 mb-8">
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-3">
            <Logo className="w-8 h-8 sm:w-10 sm:h-10" />
            <div className="flex flex-col">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
                Perun
              </h1>
              <p className="hidden sm:block text-xs text-muted-foreground">
                AI-Powered Content Analysis
              </p>
            </div>
          </div>
          
          <nav className="flex items-center gap-4">
            <a 
              href="#features" 
              className="hidden md:inline-flex text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Features
            </a>
            <a 
              href="#about" 
              className="hidden md:inline-flex text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              About
            </a>
            <a 
              href="#contact" 
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Contact
            </a>
          </nav>
        </div>
      </div>
    </header>
  );
}