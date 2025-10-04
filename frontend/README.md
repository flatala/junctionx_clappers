# Frontend - React + Vite Application

A modern React application built with Vite, TypeScript, Tailwind CSS, and shadcn/ui.

## Features

- React 18 with TypeScript
- Vite for fast development and building
- Tailwind CSS for styling
- shadcn/ui component library
- Path aliases configured for clean imports
- Modern, responsive UI

## Project Structure

```
frontend/
├── src/
│   ├── components/      # React components
│   │   └── ui/         # shadcn/ui components
│   ├── lib/            # Utility functions
│   ├── App.tsx         # Main App component
│   ├── main.tsx        # Entry point
│   └── index.css       # Global styles with Tailwind
├── public/             # Static assets
├── components.json     # shadcn/ui configuration
├── tailwind.config.js  # Tailwind CSS configuration
├── tsconfig.json       # TypeScript configuration
├── vite.config.ts      # Vite configuration
└── package.json        # Dependencies
```

## Setup

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

1. Install dependencies:
```bash
npm install
```

2. Run the development server:
```bash
npm run dev
```

The application will be available at `http://localhost:5173`

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## Adding shadcn/ui Components

To add new shadcn/ui components:

```bash
npx shadcn@latest add button
npx shadcn@latest add card
npx shadcn@latest add input
# etc.
```

## Path Aliases

The project uses path aliases for cleaner imports:

```typescript
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
```

## Styling

This project uses Tailwind CSS for styling. The configuration includes:
- CSS variables for theming
- Dark mode support
- Custom design tokens
- shadcn/ui integration

## Tech Stack

- **React**: UI library
- **TypeScript**: Type-safe JavaScript
- **Vite**: Build tool and dev server
- **Tailwind CSS**: Utility-first CSS framework
- **shadcn/ui**: Re-usable component library
- **class-variance-authority**: For component variants
- **clsx & tailwind-merge**: For conditional class names

## License

MIT
