# EvalMath - Agent Development Guide

Vanilla JavaScript app for managing and grading ICFES-style multiple choice evaluations. Uses IndexedDB with draft auto-save, photo attachments, PDF export, and PWA support.

## Idioma

**Responder siempre en español.**

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
npx vitest run -t "calculates correct grade"
```

## Project Structure

```
calmath/
├── index.html              # Entry point + CSP headers
├── package.json            # Dependencies + scripts
├── vite.config.js         # Vite config
├── vitest.config.js       # Vitest config
├── public/
│   ├── icon.svg           # App icon
│   ├── sw.js              # Service Worker (Workbox)
│   └── manifest.json      # PWA manifest
├── src/
│   ├── styles.css         # All styles
│   ├── app/
│   │   ├── index.js        # Entry + exports to window
│   │   ├── state.js        # Global state (getState/setState)
│   │   ├── calification.js # calcNota, calcAciertos, pesoTotal
│   │   ├── steps.js        # irPaso2, irPaso3, irPaso4, setStep
│   │   ├── render.js       # DOM rendering + bindPaso3Events
│   │   ├── views.js        # Views + modals + escapeHtml + PDF export
│   │   └── bindHtmlEvents.js # Event binding for CSP
│   └── db/
│       ├── indexedDB.js    # Core DB (abrirDB, dbGuardar, dbListar)
│       ├── draft.js        # dbGuardarBorrador, dbObtenerBorrador
│       └── photos.js       # dbGuardarFoto, dbObtenerFoto
└── tests/
    ├── app.test.js         # Calc logic tests
    └── db.test.js         # DB helper tests
```

## Code Style

### General
- **Vanilla JS only** - No frameworks. Use browser APIs directly.
- **ES Modules** - Use `import`/`export`.
- **Single Responsibility** - Each module has focused purpose.
- **Use function declarations** at top level, not arrow functions.
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

### State Management (`src/app/state.js`)
```javascript
// Bad - mutates state directly
numP = 20;

// Good - uses setState
setState({ numP: 20 });
```

### HTML Generation
- Use template literals with backticks.
- Always escape user input: use `escapeHtml(str)` from views.js.
- Use string concatenation for simple values.

### IndexedDB
- All operations return Promises.
- Wrap in try/catch.
- Use helpers from `src/db/`.

```javascript
try {
  const evals = await dbListar();
} catch (e) {
  toast('Error: ' + e.message, true);
}
```

### CSS
- Use CSS custom properties from `:root`.
- BEM-like naming: `.block__element--modifier`.
- Keep styles in `src/styles.css`.

### Event Binding (CSP Compliance)
- **Never use inline event handlers** (`onclick`, `onchange`) in HTML.
- Use `bindHtmlEvents.js` for static HTML elements.
- Use `bindPaso2Events()` and `bindPaso3Events(idx)` for dynamic content.

```javascript
// Bad - violates CSP
<button onclick="myFunc()">Click</button>

// Good - use event binding
document.getElementById('myBtn').onclick = () => myFunc();
```

## Security Guidelines

### XSS Prevention
- Always escape user-generated content with `escapeHtml(str)`.
- Never use `innerHTML` with unsanitized user input.
- Use `textContent` instead of `innerHTML` when possible.

### Input Validation
- Validate all numeric inputs with parseInt/parseFloat + defaults.
- Enforce ranges: questions (1-100), students (1-200).

### CSP
- Content Security Policy meta tag in index.html.
- No inline event handlers - use binding functions.

## Keyboard Shortcuts (Step 3)

| Key | Action |
|-----|--------|
| `←` / `PageUp` | Previous student |
| `→` / `PageDown` | Next student |
| `A` / `B` / `C` / `D` | Mark answer |
| `Enter` | Grade student |
| `Home` | First student |
| `End` | Last student |

## Testing

Tests use Vitest in `tests/*.test.js`:

```javascript
import { describe, it, expect } from 'vitest';

describe('calcNota', () => {
  it('calculates correct grade', () => {
    const nota = calcNota(['A', 'B', 'C', 'D']);
    expect(nota).toBe(5);
  });
});
```

Focus areas:
- Grade calculation (`calcNota`, `calcAciertos`)
- State management (`getState`, `setState`)

## Common Patterns

### Toast Notifications
```javascript
toast('Success message');
toast('Error message', true); // second arg = isError
```

### Step Navigation
```javascript
function irPaso2() {
  if (!valid) return;
  setState({ numP: value });
  setStep(2);
}
```

### Modal
```javascript
function abrirModal() {
  document.getElementById('modalId').classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}
```

## API Reference

### State (`src/app/state.js`)
| Function | Description |
|----------|-------------|
| `getState()` | Returns current state object |
| `setState(obj)` | Merges updates into state |

### Calculation (`src/app/calification.js`)
| Function | Description |
|----------|-------------|
| `parseSistemaCalif(str)` | Parses sistemaCalif ("1a5", "0a10") -> {notaMaxima, notaMinima, empiezaEnCero} |
| `pesoTotal()` | Returns notaMaxima - notaMinima based on sistemaCalif |
| `notaMinima()` | Returns minimum grade based on sistemaCalif (0 or 1) |
| `notaMaxima()` | Returns maximum grade based on sistemaCalif |
| `notaAprobacion()` | Returns notaAprobacion from appSettings (default 3) |
| `calcNota(respuestas)` | Calculates grade using sistemaCalif |
| `calcAciertos(respuestas, clave)` | Counts correct answers (clave param optional) |
| `calcNotaWithParams(...)` | Calculates grade with explicit parameters |

### Database (`src/db/*.js`)
| Function | Description |
|----------|-------------|
| `abrirDB()` | Opens IndexedDB |
| `dbGuardar(obj)` | Saves evaluation |
| `dbListar()` | Returns all evaluations |
| `dbGuardarBorrador(obj)` | Saves draft |
| `dbObtenerBorrador()` | Returns draft or null |

### Import/Export (`src/app/views.js`)
| Function | Description |
|----------|-------------|
| `exportarCSV()` | Exports evaluation to CSV with metadata (sistemaCalif, weights, etc.) |
| `exportarPDF()` | Exports current evaluation to PDF (works from step 4 and history) |
| `importarEvaluacion(file)` | Imports evaluation from CSV file |

## Features

- **Flexible Grading System**: Configurable "1aX" (from 1 to X) or "0aX" (from 0 to X), where X = 5-10
- **CSV Import/Export**: Full evaluation data with metadata, supports all grading systems
- **PDF Export**: Generate printable PDF reports with jsPDF (includes student table, question analysis, and answer distribution).
- **PWA**: Installable, works offline via manual Workbox implementation.
- **Filters**: Search by name, filter by period/date in history.
- **Visual Analysis**: Bar charts for question analysis and answer distribution.
- **Auto-save**: Draft auto-save to IndexedDB while grading.
- **Smooth Transitions**: 250ms fade transitions between steps.
- **Step Data Persistence**: Step 1 data restored when going back from step 2.

## Error Handling
- Wrap async operations in try/catch.
- Show user-friendly errors via `toast(msg, true)`.
- Log detailed errors to console.

## Notes
- No frameworks - pure vanilla JavaScript.
- IndexedDB persistence (evaluations, drafts, photos, settings).
- Offline capable after first load (PWA with Workbox).
- Photos stored as Blobs in IndexedDB.
- CSP enforced - no inline event handlers.
- Uses Vite 8, Vitest 4, jsdom 29 for testing.
- Sistema de calificación flexible: "1aX" (de 1 a X) o "0aX" (de 0 a X), donde X = 5-10.
- Valores por defecto: nota máxima = 5, nota aprobación = 3, sistema = "1a5".

## Sistema de Calificación Flexible

### Formato
- `sistemaCalif` almacenado como string: "1a5", "0a10", "1a7", etc.
- Formato: "{notaMinima}a{notaMaxima}" donde notaMinima es 0 o 1

### UI (index.html)
- Dropdown `<select id="califMaxSelect">` para nota máxima (5-10)
- Botones "Desde 1" (`btnCalif1`) y "Desde 0" (`btnCalif0`)

### Funciones clave
- `parseSistemaCalif(sistemaCalif)` → `{ notaMaxima, notaMinima, empiezaEnCero }`
- `pesoTotal()` → `notaMaxima - notaMinima` (ej: 1a5 = 4, 0a5 = 5)
- Peso por pregunta = `pesoTotal() / numP`

### Import/Export CSV
- Export incluye `sistemaCalif`, `notaMaxima`, `pesosPreguntas`
- Import usa `parseSistemaCalif()` para calcular notas (no hardcoded)
- Default weights = `(notaMaxima - notaMinima) / numP`

## Fixes Realizados

1. **CSP Keyboard Events (render.js)**: Eliminado `onkeydown` inline, ahora se bindea en `bindPaso3Events()`
2. **Reiniciar Step 4 (steps.js)**: Corregido IDs de botones `btnCalif1a5`/`btnCalif0a5` → `btnCalif1`/`btnCalif0`
3. **CSV Import**: Fixed hardcoded "0a5" check, now uses `parseSistemaCalif()`
