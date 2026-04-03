# EvalMath - Agent Development Guide

React app for managing and grading ICFES-style multiple choice evaluations. Uses IndexedDB with draft auto-save, photo attachments, PDF export, and PWA support.

## Idioma

**Responder siempre en español.**

---

## Commands

```bash
# Install dependencies
npm install

# Development
npm run dev              # Dev server (port 3000)
npm run build           # Production build to dist/ + generate SW manifest
npm run preview         # Preview production build (port 4173)

# Linting
npm run lint            # Run ESLint
npm run lint:fix        # Auto-fix ESLint issues

# Testing
npm run test           # Run all tests once
npm run test:watch    # Watch mode
npm run test:coverage # With coverage report
```

---

## Project Structure

```
calmath/
├── index.html              # Entry point + CSP headers
├── package.json           # Dependencies + scripts
├── vite.config.js         # Vite config
├── vitest.config.js      # Vitest config
├── scripts/
│   └── generate-sw-manifest.js  # Post-build script for PWA
├── public/
│   ├── icon.svg           # App icon
│   ├── sw.js              # Service Worker (vanilla, no CDN)
│   └── manifest.json      # PWA manifest
├── src/
│   ├── main.jsx              # Entry point + SW registration
│   ├── App.jsx               # Router + Layout + Header + Toast + SettingsModal
│   ├── styles.css            # All styles (vanilla CSS, unchanged)
│   ├── stores/
│   │   └── useAppStore.js    # Zustand store + IndexedDB + importarEvaluacion
│   ├── pages/
│   │   ├── NuevaEvaluacion.jsx  # Wizard 4 pasos
│   │   ├── Historial.jsx        # Lista evaluaciones + importar CSV
│   │   └── Resumen.jsx          # Resultados + export CSV/PDF completo
│   └── utils/
│       └── calification.js    # Lógica de cálculo (reutilizada)
└── tests/
    ├── app.test.js       # Core tests
    └── db.test.js        # DB tests
```

---

## Tech Stack

- **React 19** with Vite 8
- **Zustand** for state management
- **React Router** for SPA navigation
- **IndexedDB** via `idb` wrapper
- **jsPDF** for PDF export
- **Vanilla CSS** (unchanged from original)

---

## Code Style

### General
- **React functional components** with hooks (`useState`, `useEffect`, `useCallback`)
- **ES Modules** - Use `import`/`export`
- **Arrow functions** for callbacks and component definitions
- Keep components under 200 lines

### Imports
```javascript
// React imports
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

// Zustand store
import { useAppStore } from '../stores/useAppStore';

// Utils
import { parseSistemaCalif, pesoTotal } from '../utils/calification';
```

### Naming Conventions
| Type | Convention | Example |
|------|------------|---------|
| Components | PascalCase | `NuevaEvaluacion`, `Historial`, `Resumen` |
| Hooks | camelCase + use prefix | `useState`, `useEffect`, `useAppStore` |
| Variables | camelCase | `numP`, `estudiantesNombres`, `currentStudent` |
| Constants | UPPER_SNAKE | `DB_NAME`, `DB_VER` |
| Functions | camelCase | `handleContinuarPaso1()`, `calcNota()` |
| Files | kebab-case | `useAppStore.js`, `calification.js` |
| CSS classes | kebab-case | `.btn-primary`, `.step-dot` |

### Zustand Store
```javascript
// Store definition
export const useAppStore = create((set, get) => ({
  // State
  step: 1,
  numP: 0,
  
  // Actions
  setStep: (step) => set({ step }),
  setNumP: (numP) => set({ numP }),
}));

// Usage in component
const { step, setStep } = useAppStore();
```

### Event Binding (React)
- Use `onClick`, `onChange` in JSX (React handles it)
- Never use inline HTML handlers like `onclick="..."`
- Use `useCallback` for event handlers passed to child components

---

## Security Guidelines

### XSS Prevention
- Always escape user input: use `escapeHtml(str)` from utils.
- Never use `innerHTML` with unsanitized user input.
- Use `textContent` instead of `innerHTML` when possible.

### Input Validation
- Validate numeric inputs with parseInt/parseFloat + defaults.
- Enforce ranges: questions (1-100), students (1-200).

### CSP
- Content Security Policy meta tag in index.html.
- No inline event handlers - use React's event system.

---

## Testing

Tests use Vitest with jsdom. Focus on:
- Grade calculation (`calcNota`, `calcAciertos`, `parseSistemaCalif`)
- Zustand store actions
- CSV import/export

```javascript
import { describe, it, expect, beforeEach } from 'vitest';

describe('calcNota', () => {
  it('calculates correct grade', () => {
    expect(calcNota(['A', 'B'], ['A', 'B'], [0.5, 0.5], '1a5')).toBe(5);
  });
});
```

---

## Common Patterns

### Toast Notifications (via Zustand)
```javascript
const { setToast } = useAppStore();
setToast({ message: 'Success message' });
setToast({ message: 'Error message', isError: true });
```

### Modal (React)
```javascript
const [isOpen, setIsOpen] = useState(false);

return (
  <>
    <button onClick={() => setIsOpen(true)}>Open</button>
    {isOpen && (
      <div className="modal-bg" onClick={() => setIsOpen(false)}>
        <div className="modal" onClick={e => e.stopPropagation()}>
          Content
        </div>
      </div>
    )}
  </>
);
```

### Step Navigation
```javascript
const { step, setStep } = useAppStore();

const handleContinuar = () => {
  if (!valid) {
    setToast({ message: 'Error', isError: true });
    return;
  }
  setStep(2);
};
```

---

## API Reference

### Zustand Store (`src/stores/useAppStore.js`)
| Function | Description |
|----------|-------------|
| `setStep(step)` | Navigate to step (1-4) |
| `setNumP(numP)` | Set number of questions |
| `setNumE(numE)` | Set number of students |
| `setClaveRespuesta(idx, val)` | Set answer key for question |
| `setEstudianteRespuesta(estuIdx, pregIdx, val)` | Set student answer |
| `setPeso(idx, val)` | Set weight for question (pesoMode=diferente) |
| `setSistemaCalif(str)` | Set grading system ("1a5", "0a10", etc.) |
| `setAppSettings(obj)` | Update app settings |
| `saveEvaluacion()` | Save evaluation to IndexedDB |
| `listEvaluaciones()` | Get all evaluations |
| `getEvaluacion(id)` | Get evaluation by ID |
| `deleteEvaluacion(id)` | Delete evaluation |
| `importarEvaluacion(file)` | Import from CSV |
| `saveSettings()` | Save settings to IndexedDB |
| `initFromSettings()` | Load settings from IndexedDB |
| `resetState()` | Reset evaluation state (preserves settings) |

### Calculation (`src/utils/calification.js`)
| Function | Description |
|----------|-------------|
| `parseSistemaCalif(str)` | Parses "1a5", "0a10" → {notaMaxima, notaMinima, empiezaEnCero} |
| `pesoTotal(str)` | Returns notaMaxima - notaMinima based on sistemaCalif |
| `calcNota(respuestas, clave, pesos, sistemaCalif)` | Calculates final grade |

---

## Flexible Grading System

### Format
- `sistemaCalif` stored as string: "1a5", "0a10", "1a7", etc.
- Format: "{notaMinima}a{notaMaxima}" where notaMinima is 0 or 1
- Max grade (X): 5-10

### Key Functions
- `parseSistemaCalif(sistemaCalif)` → `{ notaMaxima, notaMinima, empiezaEnCero }`
- `pesoTotal(sistemaCalif)` → `notaMaxima - notaMinima` (e.g., 1a5 = 4, 0a5 = 5)
- Question weight = `pesoTotal(sistemaCalif) / numP`

### CSV Import/Export
- Export includes `sistemaCalif`, `notaMaxima`, `pesosPreguntas`, `claveRespuestas`, students
- Format: metadata section + students section (pipe-separated)
- Import parses metadata and reconstructs evaluation

---

## PWA / Offline Support

### Service Worker (`public/sw.js`)
- **Vanilla JS** - No external dependencies or CDN
- **Precaching** - Reads `sw-manifest.json` generated at build time
- **Cache-First** strategy for assets
- **Network-First** for navigation

### Build Process
```bash
npm run build
# 1. vite build → generates /dist with hashed assets
# 2. node scripts/generate-sw-manifest.js → generates /dist/sw-manifest.json
```

---

## Error Handling
- Wrap async operations in try/catch.
- Show user-friendly errors via `setToast({ message, isError: true })`.
- Log detailed errors to console.
- Validate inputs before processing.

---

## Notes

- React 19 + Zustand + React Router SPA
- IndexedDB persistence (evaluations, drafts, photos, settings)
- Offline capable after first load (PWA with vanilla Service Worker)
- Photos stored as Blobs in IndexedDB
- Uses Vite 8, Vitest 4, jsdom 29 for testing
- CSS unchanged from vanilla version
- Language: Always respond in Spanish
