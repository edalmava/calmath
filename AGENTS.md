# EvalMath - Agent Development Guide

## Project Overview
Vanilla JavaScript application for managing and grading ICFES-style math evaluations. Uses IndexedDB for persistence with draft auto-save and exam photo attachments.

## Commands

```bash
# Install dependencies
npm install

# Development
npm run dev              # Start dev server (port 3000)
npm run build            # Production build to dist/
npm run preview          # Preview production build

# Linting
npm run lint             # Run ESLint
npm run lint:fix         # Auto-fix ESLint issues

# Testing
npm run test             # Run all tests once
npm run test:watch       # Watch mode
npm run test:coverage    # With coverage report

# Run single test file
npx vitest run tests/app.test.js

# Run single test
npx vitest run -t "calculates correct grade"
```

## Project Structure

```
calmath/
├── index.html              # Entry point
├── package.json            # Dependencies + scripts
├── vite.config.js          # Vite config
├── src/
│   ├── styles.css          # All styles
│   ├── app/
│   │   ├── index.js        # Entry point + exports to window
│   │   ├── state.js        # Global state (getState/setState)
│   │   ├── calification.js # calcNota, calcAciertos, pesoTotal
│   │   ├── steps.js        # irPaso2, irPaso3, irPaso4, setStep
│   │   ├── render.js      # DOM rendering
│   │   └── views.js       # Views + modals
│   └── db/
│       ├── indexedDB.js    # Core DB (abrirDB, dbGuardar, dbListar)
│       ├── draft.js        # dbGuardarBorrador, dbObtenerBorrador
│       └── photos.js       # dbGuardarFoto, dbObtenerFoto
└── tests/
    ├── app.test.js         # Calc logic tests
    └── db.test.js          # DB helper tests
```

## Code Style

### General
- **Vanilla JS only** - No frameworks. Use browser APIs directly.
- **ES Modules** - Use `import`/`export`.
- **Single Responsibility** - Each module has focused purpose.

### Naming

| Type | Convention | Example |
|------|------------|---------|
| Variables | camelCase | `numP`, `estudiantesNombres` |
| Constants | UPPER_SNAKE | `DB_NAME`, `DB_VER` |
| Functions | camelCase | `irPaso2()`, `calcNota()` |
| Files | kebab-case | `indexedDB.js`, `calification.js` |
| CSS classes | kebab-case | `.btn-primary`, `.step-dot` |

### Functions
- Use `function name()` declarations, not arrow functions at top level
- Arrow functions OK for callbacks: `arr.map(x => x * 2)`
- Keep functions under 50 lines

### State Management (`src/app/state.js`)
```javascript
// Bad
numP = 20;

// Good
setState({ numP: 20 });
```

### HTML Generation
- Use template literals with backticks
- Escape user input: `.replace(/"/g, '&quot;')`

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
- No React/Vue/frameworks - pure vanilla JavaScript
- IndexedDB persistence (evaluations, drafts, photos)
- Offline capable after first load
- Photos stored as Blobs in IndexedDB