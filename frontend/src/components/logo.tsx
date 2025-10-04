import { useTheme } from "./theme-provider";

interface LogoProps {
  className?: string;
  width?: number;
  height?: number;
}

export default function Logo({ className = "w-10 h-10", width = 512, height = 512 }: LogoProps) {
  const { theme, setTheme } = useTheme();

  const toggleTheme = () => {
    if (theme === "dark") {
      setTheme("light");
    } else if (theme === "light") {
      setTheme("dark");
    } else {
      // If system theme, set to opposite of current system preference
      const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
      setTheme(systemTheme === "dark" ? "light" : "dark");
    }
  };
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 512 512" 
      width={width}
      height={height}
      className={`${className} cursor-pointer hover:opacity-80 transition-opacity`}
      role="img" 
      aria-label="Perun Logo - Click to toggle theme"
      onClick={toggleTheme}
    >
      <title>Perun Logo</title>
      <g transform="translate(256 256)">
        {/* 3 rounded rays (capsule-like) */}
        <g fill="currentColor">
          <rect x="-20" y="-160" width="40" height="320" rx="20" ry="20" transform="rotate(30)"/>
          <rect x="-20" y="-160" width="40" height="320" rx="20" ry="20" transform="rotate(90)"/>
          <rect x="-20" y="-160" width="40" height="320" rx="20" ry="20" transform="rotate(330)"/>
        </g>

        {/* 6 outer dots placed between rays (30° offset) */}
        <g fill="currentColor">
          <circle r="22" cx="0" cy="-210" transform="rotate(30)"/>
          <circle r="22" cx="0" cy="-210" transform="rotate(90)"/>
          <circle r="22" cx="0" cy="-210" transform="rotate(150)"/>
          <circle r="22" cx="0" cy="-210" transform="rotate(210)"/>
          <circle r="22" cx="0" cy="-210" transform="rotate(270)"/>
          <circle r="22" cx="0" cy="-210" transform="rotate(330)"/>
        </g>
      </g>
    </svg>
  );
}