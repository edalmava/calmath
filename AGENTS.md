# EvalMath - Agent Development Guide

React app for managing and grading ICFES-style multiple choice evaluations with IndexedDB, PDF export, photos support, and PWA.

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
npm run test:watch     # Watch mode
npm run test:coverage  # With coverage report
npx vitest run src/utils/calification.test.js  # Run single test file
npx vitest run -t "test name"  # Run single test by name
```

---

## Project Structure

```
calmath/
├── index.html              # Entry point + CSP headers
├── package.json           # Dependencies + scripts
├── vite.config.js         # Vite config
├── vitest.config.js       # Vitest config
├── scripts/
│   └── generate-sw-manifest.js  # Post-build script for PWA
├── public/
│   ├── icon.svg, sw.js, manifest.json  # PWA assets
├── src/
│   ├── main.jsx, App.jsx  # Entry point + Router
│   ├── styles.css         # Vanilla CSS (unchanged)
│   ├── stores/
│   │   └── useAppStore.js # Zustand store + IndexedDB + draft
│   ├── pages/
│   │   ├── NuevaEvaluacion.jsx # Wizard 4 pasos + photos
│   │   ├── Historial.jsx        # Lista + importar CSV
│   │   └── Resumen.jsx          # Resultados + export + photos modal
│   ├── utils/
│   │   ├── calification.js   # Grade calculation logic
│   │   └── escapeHtml.js    # XSS prevention utility
│   └── legacy/             # Deprecated vanilla JS code
│       ├── app/            # Old implementation (unused)
│       └── db/              # Old IndexedDB helpers (unused)
└── tests/
    └── *.test.js           # Vitest tests
```

---

## Tech Stack

- **React 19** + Vite 8
- **Zustand** for state management
- **React Router** for navigation
- **IndexedDB** via `idb` wrapper
- **jsPDF** + **jspdf-autotable** for PDF export
- **Vitest** + jsdom for testing
- **PWA** with vanilla Service Worker

---

## Code Style

### General
- React functional components with hooks (`useState`, `useEffect`, `useCallback`)
- ES Modules - use `import`/`export`
- Arrow functions for callbacks and components
- Keep components under 200 lines

### Imports (order: react → react-router → zustand → utils → local)
```javascript
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useAppStore } from '../stores/useAppStore';
import { parseSistemaCalif, calcNota } from '../utils/calification';
import { escapeHtml } from '../utils/escapeHtml';
```

### Naming Conventions
| Type | Convention | Example |
|------|------------|---------|
| Components | PascalCase | `NuevaEvaluacion`, `Resumen` |
| Hooks | camelCase + use prefix | `useState`, `useAppStore` |
| Variables/Functions | camelCase | `handleContinuar`, `estudiantesNombres` |
| Constants | UPPER_SNAKE | `DB_NAME`, `DB_VER` |
| Files | kebab-case | `useAppStore.js`, `calification.js` |
| CSS classes | kebab-case | `.btn-primary`, `.modal-bg` |

### Zustand Store Pattern
```javascript
export const useAppStore = create((set, get) => ({
  // State
  step: 1,
  numP: 0,
  // Actions
  setStep: (step) => set({ step }),
  setNumP: (numP) => set({ numP }),
}));

// Usage
const { step, setStep } = useAppStore();
```

### Event Binding
- Use `onClick`, `onChange` in JSX (React handles it)
- Never use inline HTML handlers like `onclick="..."`
- Use `useCallback` for handlers passed to child components

---

## Error Handling

- Wrap async operations in try/catch
- Show user-friendly errors via `setToast({ message, isError: true })`
- Log detailed errors to console
- Validate inputs before processing

---

## Security

### XSS Prevention
- Escape user input: use `escapeHtml(str)` from `src/utils/escapeHtml.js`
- Never use `innerHTML` with unsanitized user input
- Use `textContent` instead of `innerHTML`

### Input Validation
- Validate numeric inputs with parseInt/parseFloat + defaults
- Enforce ranges: questions (1-100), students (1-200)

### CSP
- Content Security Policy meta tag in index.html
- No inline event handlers - use React's event system

---

## Testing

Tests use Vitest with jsdom. Focus on grade calculation, store actions, and CSV import/export.

```javascript
import { describe, it, expect } from 'vitest';

describe('calcNota', () => {
  it('calculates correct grade', () => {
    expect(calcNota(['A', 'B'], ['A', 'B'], [0.5, 0.5], '1a5')).toBe(5);
  });
});
```

### Test Files
- `tests/app.test.js` - **@deprecated** Legacy vanilla JS tests (34 passing, DOM warnings)
- `tests/db.test.js` - **@deprecated** Legacy vanilla JS tests

Los tests legacy referencian código en `src/legacy/` que ya no se usa en la versión React.

---

## Common Patterns

### Toast Notifications
```javascript
const { setToast } = useAppStore();
setToast({ message: 'Success message' });
setToast({ message: 'Error', isError: true });
```

### Modal
```javascript
const [isOpen, setIsOpen] = useState(false);
return (
  <>
    <button onClick={() => setIsOpen(true)}>Open</button>
    {isOpen && (
      <div className="modal-bg" onClick={() => setIsOpen(false)}>
        <div className="modal" onClick={e => e.stopPropagation()}>Content</div>
      </div>
    )}
  </>
);
```

### Lightbox (for photo zoom)
```javascript
const [lightboxImg, setLightboxImg] = useState(null);
// In render:
{lightboxImg && (
  <div className="modal-bg" onClick={() => setLightboxImg(null)}>
    <img src={lightboxImg} onClick={e => e.stopPropagation()} />
  </div>
)}
```

---

## Auto-Save / Draft System

The app includes automatic draft saving:
- **Autoguardado**: Every 15 seconds when in steps 2-4 with valid data
- **Validación de borrador**: numP > 0, numE > 0, and at least 1 student graded
- **Recuperación**: Modal on app start asks to continue editing or discard

### Draft Functions
```javascript
const { saveDraft, getDraft, hasValidDraft, recoverDraft, deleteDraft } = useAppStore();
await saveDraft();           // Save current state to IndexedDB
const hasDraft = await hasValidDraft();  // Check if valid draft exists
await recoverDraft();        // Restore draft and navigate to step 3
await deleteDraft();        // Remove draft from IndexedDB
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
| `setEstudianteFoto(idx, foto)` | Set student photo ({nombre, type, blob}) |
| `saveEvaluacion()` | Save evaluation to IndexedDB, deletes draft |
| `saveDraft()` | Auto-save current state to IndexedDB |
| `hasValidDraft()` | Check if valid draft exists |
| `recoverDraft()` | Restore draft and go to step 3 |
| `getEvaluacionWithPhotos(id)` | Get evaluation with photos loaded |
| `listEvaluaciones()` | Get all evaluations |
| `getEvaluacion(id)` | Get evaluation by ID |
| `deleteEvaluacion(id)` | Delete evaluation |
| `importarEvaluacion(file)` | Import from CSV |

### Calculation (`src/utils/calification.js`)
| Function | Description |
|----------|-------------|
| `parseSistemaCalif(str)` | Parse "1a5", "0a10" → {notaMaxima, notaMinima, empiezaEnCero} |
| `pesoTotal(str)` | Returns notaMaxima - notaMinima |
| `calcNota(respuestas, clave, pesos, sistemaCalif)` | Calculate final grade |

### Utilities (`src/utils/escapeHtml.js`)
| Function | Description |
|----------|-------------|
| `escapeHtml(str)` | Escape HTML special chars for XSS prevention |

---

## Notes

- Language: Always respond in Spanish
- Vanilla CSS unchanged from original version
- PWA with vanilla Service Worker (no Workbox)
- Offline capable after first load
- Photos are optimized (max 800x600, JPEG 70%) before storing