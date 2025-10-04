export default function AppFooter() {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="mt-auto border-t bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Brand Section */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold">Perun</h3>
            <p className="text-sm text-muted-foreground max-w-xs">
              Advanced AI-powered content analysis platform for detecting harmful content and ensuring digital safety.
            </p>
          </div>
          
          {/* Quick Links */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold">Quick Links</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <a href="#features" className="hover:text-foreground transition-colors">
                  Features
                </a>
              </li>
              <li>
                <a href="#documentation" className="hover:text-foreground transition-colors">
                  Documentation
                </a>
              </li>
              <li>
                <a href="#api" className="hover:text-foreground transition-colors">
                  API
                </a>
              </li>
              <li>
                <a href="#support" className="hover:text-foreground transition-colors">
                  Support
                </a>
              </li>
            </ul>
          </div>
          
          {/* Legal & Contact */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold">Legal & Contact</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <a href="#privacy" className="hover:text-foreground transition-colors">
                  Privacy Policy
                </a>
              </li>
              <li>
                <a href="#terms" className="hover:text-foreground transition-colors">
                  Terms of Service
                </a>
              </li>
              <li>
                <a href="#contact" className="hover:text-foreground transition-colors">
                  Contact Us
                </a>
              </li>
              <li>
                <a href="https://github.com" className="hover:text-foreground transition-colors" target="_blank" rel="noopener noreferrer">
                  GitHub
                </a>
              </li>
            </ul>
          </div>
        </div>
        
        {/* Bottom Bar */}
        <div className="mt-8 pt-6 border-t">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-muted-foreground">
            <p>© {currentYear} Perun. All rights reserved.</p>
            <p className="flex items-center gap-1">
              Built with <span className="text-red-500">♥</span> for a safer digital world
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}