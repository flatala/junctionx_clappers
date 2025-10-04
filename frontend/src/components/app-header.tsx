import Logo from './logo';

export default function AppHeader() {
  return (
    <header className="text-center mb-12">
      <div className="flex items-center justify-center gap-4 mb-6">
          <Logo className="w-10 h-10" />
        <div className="text-left">
          <h1 className="text-4xl font-bold tracking-tight">
            Perun
          </h1>
          <p className="text-sm text-muted-foreground font-medium">
            AI-Powered Content Analysis
          </p>
        </div>
      </div>
      <div className="max-w-3xl mx-auto space-y-3">
        <p className="text-xl text-muted-foreground leading-relaxed">
          Inclusive Audio Screening Tool
        </p>
        <p className="text-base text-muted-foreground/80 leading-relaxed">
          Analyze audio and video content for extremist or toxic speech with detailed timestamps and explanations
        </p>
      </div>
    </header>
  );
}