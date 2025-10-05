export default function AppFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="mt-auto bg-background">
        {/* Bottom Bar */}
        <div className="mt-8 pt-6 border-t">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-muted-foreground mx-6 mb-6">
            <p>© {currentYear} Perun. All rights reserved.</p>
            <p className="flex items-center gap-1">
              Built with <span className="text-red-500">♥</span> for a safer digital world
            </p>
          </div>
        </div>
    </footer>
  );
}