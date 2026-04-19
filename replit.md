# NinjaLife

## Project Overview
A React + Vite web application.

## Tech Stack
- **Frontend**: React 18 + Vite 5
- **Language**: JavaScript (JSX)
- **Package Manager**: npm

## Project Structure
```
ninjalife/
├── src/
│   ├── main.jsx        # Entry point
│   ├── App.jsx         # Root component
│   └── index.css       # Global styles
├── index.html          # HTML template
├── vite.config.js      # Vite configuration
└── package.json        # Dependencies
```

## Running the App
```bash
npm run dev
```
Starts the dev server on port 5000 (0.0.0.0).

## Building for Production
```bash
npm run build
```
Outputs to `dist/`.

## Deployment
Configured as a static site deployment:
- Build command: `npm run build`
- Public directory: `dist`
