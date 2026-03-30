# EvalMath - Agent Development Guide

Vanilla JavaScript app for managing and grading ICFES-style multiple choice evaluations. Uses IndexedDB with draft auto-save, photo attachments, PDF export, and PWA support.

## Idioma

**Responder siempre en español.**

---

## Commands

```bash
# Install dependencies
npm install

# Development
npm run dev              # Dev server (port 3000)
npm run build            # Production build to dist/
npm run preview          # Preview production build (port 4173)

# Linting
npm run lint             # Run ESLint
npm run lint:fix         # Auto-fix ESLint issues

# Testing
npm run test             # Run all tests once
npm run test:watch       # Watch mode
npm run test:coverage    # With coverage report

# Single test file
npx vitest run tests/app.test.js

# Single test by name
npx vitest run -t "parseSistemaCalif"
```

---

## Project Structure

```
calmath/
├── index.html              # Entry point + CSP headers
├── package.json            # Dependencies + scripts
├── vite.config.js          # Vite config
├── vitest.config.js        # Vitest config
├── public/
│   ├── icon.svg           # App icon
│   ├── sw.js              # Service Worker (Workbox)
│   └── manifest.json      # PWA manifest
├── src/
│   ├── styles.css         # All styles
│   ├── app/
│   │   ├── index.js       # Entry + exports to window
│   │   ├── state.js       # Global state (getState/setState)
│   │   ├── calification.js # Grade calculation
│   │   ├── steps.js       # Step navigation
│   │   ├── render.js     # DOM rendering
│   │   ├── views.js      # Views, modals, exports
│   │   └── bindHtmlEvents.js # Event binding (CSP)
│   └── db/
│       ├── indexedDB.js   # IndexedDB core
│       ├── draft.js       # Draft auto-save
│       └── photos.js      # Photo storage
└── tests/
    ├── app.test.js        # Core tests (34 tests)
    └── db.test.js         # DB tests
```

---

## Code Style

### General
- **Vanilla JS only** - No frameworks. Use browser APIs directly.
- **ES Modules** - Use `import`/`export`.
- **Function declarations** at top level, not arrow functions.
- Arrow functions OK for callbacks: `arr.map(x => x * 2)`
- Keep functions under 50 lines.

### Naming Conventions
| Type | Convention | Example |
|------|------------|---------|
| Variables | camelCase | `numP`, `estudiantesNombres` |
| Constants | UPPER_SNAKE | `DB_NAME`, `DB_VER` |
| Functions | camelCase | `irPaso2()`, `calcNota()` |
| Files | kebab-case | `indexedDB.js`, `calification.js` |
| CSS classes | kebab-case | `.btn-primary`, `.step-dot` |

### State Management
```javascript
// Bad - mutates state directly
numP = 20;

// Good - uses setState
setState({ numP: 20 });
```

### Event Binding (CSP Compliance)
- **Never use inline event handlers** (`onclick`, `onkeydown`, `onchange`) in HTML.
- Use `bindHtmlEvents.js` for static elements.
- Use `bindPaso2Events()` and `bindPaso3Events(idx)` for dynamic content.

---

## Security Guidelines

### XSS Prevention
- Always escape user input: use `escapeHtml(str)` from views.js.
- Never use `innerHTML` with unsanitized user input.
- Use `textContent` instead of `innerHTML` when possible.

### Input Validation
- Validate numeric inputs with parseInt/parseFloat + defaults.
- Enforce ranges: questions (1-100), students (1-200).

### CSP
- Content Security Policy meta tag in index.html.
- No inline event handlers - use binding functions.

---

## Testing

Tests use Vitest with jsdom. Focus on:
- Grade calculation (`calcNota`, `calcAciertos`, `parseSistemaCalif`)
- State management (`getState`, `setState`)
- CSV/PDF import/export

```javascript
import { describe, it, expect, beforeEach } from 'vitest';

describe('calcNota', () => {
  it('calculates correct grade', () => {
    expect(calcNota(['A', 'B'])).toBe(5);
  });
});
```

---

## Common Patterns

### Toast Notifications
```javascript
toast('Success message');
toast('Error message', true); // second arg = isError
```

### Modal
```javascript
function abrirModal() {
  document.getElementById('modalId').classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}
```

### Step Navigation
```javascript
function irPaso2() {
  if (!valid) return;
  setState({ numP: value });
  setStep(2);
}
```

---

## API Reference

### State (`src/app/state.js`)
| Function | Description |
|----------|-------------|
| `getState()` | Returns current state object |
| `setState(obj)` | Merges updates into state |

### Calculation (`src/app/calification.js`)
| Function | Description |
|----------|-------------|
| `parseSistemaCalif(str)` | Parses "1a5", "0a10" -> {notaMaxima, notaMinima, empiezaEnCero} |
| `pesoTotal()` | Returns notaMaxima - notaMinima |
| `notaMinima()` / `notaMaxima()` | Returns min/max grade |
| `calcNota(respuestas)` | Calculates final grade |
| `calcAciertos(respuestas, clave)` | Counts correct answers |

### Database (`src/db/*.js`)
| Function | Description |
|----------|-------------|
| `abrirDB()` | Opens IndexedDB |
| `dbGuardar(obj)` | Saves evaluation |
| `dbListar()` | Returns all evaluations |
| `dbGuardarBorrador(obj)` | Auto-saves draft |
| `dbObtenerBorrador()` | Retrieves draft |

### Import/Export (`src/app/views.js`)
| Function | Description |
|----------|-------------|
| `exportarCSV()` | Exports to CSV with metadata |
| `exportarPDF()` | Exports to PDF |
| `importarEvaluacion(file)` | Imports from CSV |

---

## Flexible Grading System

### Format
- `sistemaCalif` stored as string: "1a5", "0a10", "1a7", etc.
- Format: "{notaMinima}a{notaMaxima}" where notaMinima is 0 or 1
- Max grade (X): 5-10

### UI Components
- Dropdown `<select id="califMaxSelect">` for max grade (5-10)
- Buttons "Desde 1" (`btnCalif1`) and "Desde 0" (`btnCalif0`)

### Key Functions
- `parseSistemaCalif(sistemaCalif)` → `{ notaMaxima, notaMinima, empiezaEnCero }`
- `pesoTotal()` → `notaMaxima - notaMinima` (e.g., 1a5 = 4, 0a5 = 5)
- Question weight = `pesoTotal() / numP`

### CSV Import/Export
- Export includes `sistemaCalif`, `notaMaxima`, `pesosPreguntas`
- Import uses `parseSistemaCalif()` for calculations (not hardcoded)
- Default weights = `(notaMaxima - notaMinima) / numP`

### Defaults
- Max grade: 5
- Passing grade: 3
- System: "1a5"

---

## Error Handling
- Wrap async operations in try/catch.
- Show user-friendly errors via `toast(msg, true)`.
- Log detailed errors to console.

## Notes
- No frameworks - pure vanilla JavaScript.
- IndexedDB persistence (evaluations, drafts, photos, settings).
- Offline capable after first load (PWA with Workbox).
- Photos stored as Blobs in IndexedDB.
- Uses Vite 8, Vitest 4, jsdom 29 for testing.
