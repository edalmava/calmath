# EvalMath - Agent Development Guide

Vanilla JavaScript app for managing and grading ICFES-style math evaluations. Uses IndexedDB with draft auto-save and exam photo attachments.

## Commands

```bash
# Install
npm install

# Dev/Build
npm run dev              # Dev server (port 3000)
npm run build            # Production build to dist/
npm run preview          # Preview production build

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
├── index.html                    # Entry point
├── package.json                  # Dependencies + scripts
├── vite.config.js                # Vite config
├── eslint.config.js              # ESLint config
├── src/
│   ├── styles.css                 # All styles
│   ├── app/
│   │   ├── index.js               # Entry + exports to window
│   │   ├── state.js               # Global state (getState/setState)
│   │   ├── calification.js        # calcNota, calcAciertos, pesoTotal
│   │   ├── steps.js               # irPaso2, irPaso3, irPaso4, setStep
│   │   ├── render.js              # DOM rendering + bindPaso3Events
│   │   ├── views.js               # Views + modals + escapeHtml
│   │   └── bindHtmlEvents.js      # Event binding for CSP compliance
│   └── db/
│       ├── indexedDB.js           # Core DB (abrirDB, dbGuardar, dbListar)
│       ├── draft.js                # dbGuardarBorrador, dbObtenerBorrador
│       └── photos.js              # dbGuardarFoto, dbObtenerFoto
└── tests/
    ├── app.test.js                # Calc logic tests
    └── db.test.js                 # DB helper tests
```

## Code Style

### General
- **Vanilla JS only** - No frameworks. Use browser APIs directly.
- **ES Modules** - Use `import`/`export`.
- **Single Responsibility** - Each module has focused purpose.
- **Use function declarations**, not arrow functions at top level
- Arrow functions OK for callbacks: `arr.map(x => x * 2)`
- Keep functions under 50 lines

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
- Use template literals with backticks
- Always escape user input: use `escapeHtml(str)` from views.js
- Use string concatenation instead of template literals for simple values

### IndexedDB
- All operations return Promises
- Wrap in try/catch
- Use helpers from `src/db/`

```javascript
try {
  const evals = await dbListar();
} catch (e) {
  toast('Error: ' + e.message, true);
}
```

### CSS
- Use CSS custom properties from `:root`
- BEM-like naming: `.block__element--modifier`
- Keep styles in `src/styles.css`

### Event Binding (CSP Compliance)
- **Never use inline event handlers** (`onclick`, `onchange`, etc.) in HTML
- Use `bindHtmlEvents.js` for static HTML elements
- Use `bindPaso2Events()` and `bindPaso3Events(idx)` for dynamically generated content

```javascript
// Bad - violates CSP
<button onclick="myFunc()">Click</button>

// Good - use event binding
document.getElementById('myBtn').onclick = () => myFunc();
```

## Security Guidelines

### XSS Prevention
- Always escape user-generated content with `escapeHtml(str)`
- Never use `innerHTML` with unsanitized user input
- Use `textContent` instead of `innerHTML` when possible

### Input Validation
- Validate all numeric inputs with parseInt/parseFloat + defaults
- Enforce ranges: questions (1-100), students (1-200)

### CSP
- Content Security Policy meta tag in index.html
- No inline event handlers - use binding functions
- Use `'unsafe-inline'` in CSP only if absolutely necessary

## Keyboard Shortcuts (Step 3)

| Key | Action |
|-----|--------|
| `←` / `PageUp` | Previous student |
| `→` / `PageDown` | Next student |
| `A` / `B` / `C` / `D` | Mark answer (first unanswered or last) |
| `Enter` | Grade and advance |
| `Home` | First student |
| `End` | Last student |

## Testing

Tests go in `tests/*.test.js`:

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
  document.getElementById('metaBanner2').innerHTML = metaHTML();
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

## Error Handling
- Wrap async operations in try/catch
- Show user-friendly errors via `toast(msg, true)`
- Log detailed errors to console

## API Reference

### State (`src/app/state.js`)
| Function | Description |
|----------|-------------|
| `getState()` | Returns current state object |
| `setState(obj)` | Merges updates into state |

### Calculation (`src/app/calification.js`)
| Function | Description |
|----------|-------------|
| `pesoTotal()` | Returns 4 (1a5) or 5 (0a5) |
| `calcNota(respuestas)` | Calculates grade |
| `calcAciertos(respuestas)` | Counts correct answers |

### Database (`src/db/*.js`)
| Function | Description |
|----------|-------------|
| `abrirDB()` | Opens IndexedDB |
| `dbGuardar(obj)` | Saves evaluation |
| `dbListar()` | Returns all evaluations |
| `dbGuardarBorrador(obj)` | Saves draft |
| `dbObtenerBorrador()` | Returns draft or null |

## Notes
- No frameworks - pure vanilla JavaScript
- IndexedDB persistence (evaluations, drafts, photos, settings)
- Offline capable after first load
- Photos stored as Blobs in IndexedDB
- CSP enforced - no inline event handlers

## Import/Export CSV

### Export Format
The CSV export includes metadata for re-importation:

```
# ===== METADATA (para importacion) =====
# Formato: EVALMATH_v1
nombre,Parcial Algebra
fecha,2024-03-15
periodo,2
numP,20
numE,30
sistemaCalif,1a5
notaMaxima,5
notaAprobacion,3
pesoMode,igual
pesosPreguntas,0.2000,0.2000,...
claveRespuestas,A,B,C,D,A,B,...

# ===== ESTUDIANTES =====
#num,nombre,respuestas,calificado
1|Juan Pérez|A|B|C|D|A|No
```

### Import
Use the "Importar CSV" button in the Historial view. The import parses the metadata section and student data, recalculates grades, and saves to IndexedDB.