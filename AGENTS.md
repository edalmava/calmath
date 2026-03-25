# EvalMath - Agent Development Guide

## Project Overview

EvalMath is a vanilla JavaScript application for managing and grading ICFES-style math evaluations. It uses IndexedDB for persistence, supports draft auto-save, and allows attaching photos of exams.

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Run linting
npm run lint
npm run lint:fix

# Run tests
npm run test           # Run all tests once
npm run test:watch     # Watch mode
npm run test:coverage  # With coverage report
```

## Project Structure

```
calmath/
├── index.html              # Main HTML entry point
├── package.json            # Dependencies and scripts
├── vite.config.js          # Vite configuration
├── eslint.config.js        # ESLint rules
├── vitest.config.js        # Vitest configuration
├── src/
│   ├── styles.css          # All application styles
│   ├── app/
│   │   ├── index.js        # Main entry point, initializes app
│   │   ├── state.js        # Global state management
│   │   ├── calification.js # Grade calculation logic
│   │   ├── steps.js        # Step navigation (1-4)
│   │   ├── render.js      # DOM rendering functions
│   │   └── views.js       # View management + modals
│   └── db/
│       ├── indexedDB.js    # IndexedDB core operations
│       ├── draft.js        # Draft auto-save
│       └── photos.js       # Photo storage
└── tests/
    ├── app.test.js         # Application logic tests
    └── db.test.js         # IndexedDB tests
```

## Code Style Guidelines

### General Principles

- **Vanilla JavaScript**: No frameworks (React, Vue, etc.). Use browser APIs directly.
- **ES Modules**: Use ES6 modules with `import`/`export`.
- **Single Responsibility**: Each module should have a focused purpose.

### Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Variables | camelCase | `numP`, `estudiantesNombres` |
| Constants | UPPER_SNAKE | `DB_NAME`, `DB_VER` |
| Functions | camelCase | `irPaso2()`, `calcNota()` |
| File names | kebab-case | `indexedDB.js`, `calification.js` |
| CSS classes | kebab-case | `.btn-primary`, `.step-dot` |

### Functions

- Use `function name()` declarations, not arrow functions at top level
- Arrow functions are acceptable for callbacks: `arr.map(x => x * 2)`
- Keep functions under 50 lines; split complex functions

### State Management

- All mutable state lives in `src/app/state.js`
- Use `getState()` to read, `setState()` to update
- Never modify state directly; always use setters

```javascript
// Bad
numP = 20;

// Good
setState({ numP: 20 });
```

### HTML Generation

- Use template literals with backticks
- Always escape user input: `.replace(/"/g, '&quot;')`
- Create elements via `document.createElement()` for complex structures

```javascript
// Good
const html = `<div class="card">${userName}</div>`;
document.getElementById('container').innerHTML = html;
```

### IndexedDB

- All DB operations return Promises
- Wrap in try/catch for error handling
- Use helper functions from `src/db/`

```javascript
// Good
try {
  const evals = await dbListar();
  renderHistorial(evals);
} catch (e) {
  toast('Error: ' + e.message, true);
}
```

### CSS Guidelines

- Use CSS custom properties (variables) from `:root`
- Follow BEM-like naming: `.block__element--modifier`
- Keep styles in `src/styles.css`

## Testing

### Running Tests

```bash
# Single run
npm run test

# Watch mode during development
npm run test:watch

# With coverage
npm run test:coverage
```

### Writing Tests

Tests go in `tests/` with `.test.js` extension:

```javascript
import { describe, it, expect, beforeEach } from 'vitest';

describe('calcNota', () => {
  it('calculates correct grade for 1a5 system', () => {
    // Setup
    setState({ sistemaCalif: '1a5', pesosPreguntas: [1, 1, 1, 1] });
    
    // Execute
    const nota = calcNota(['A', 'A', 'A', 'A']);
    
    // Assert
    expect(nota).toBe(5);
  });
});
```

### Test Focus Areas

- Grade calculation (`calcNota`, `calcAciertos`)
- State management (`getState`, `setState`)
- IndexedDB operations (mock or use test DB)

## Common Patterns

### Navigation Between Steps

```javascript
function irPaso2() {
  // Validate
  if (!valid) return;
  
  // Update state
  setState({ numP: value });
  
  // Render
  document.getElementById('metaBanner2').innerHTML = metaHTML();
  
  // Navigate
  setStep(2);
}
```

### Toast Notifications

```javascript
toast('Mensaje de exito');
toast('Mensaje de error', true); // second arg = isError
```

### Modal Pattern

```javascript
function abrirModal() {
  document.getElementById('modalId').classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

function cerrarModal() {
  document.getElementById('modalId').classList.add('hidden');
  document.body.style.overflow = '';
}
```

## Error Handling

- Always wrap async operations in try/catch
- Show user-friendly errors via `toast(msg, true)`
- Log detailed errors to console for debugging

## Building for Production

```bash
npm run build
```

Output goes to `dist/`. Vite handles:
- Minification
- Asset hashing
- Code splitting

## API Reference

### State (`src/app/state.js`)

| Function | Description |
|----------|-------------|
| `getState()` | Returns current state object |
| `setState(obj)` | Merges updates into state |
| `resetState()` | Resets all state to initial |

### Calculation (`src/app/calification.js`)

| Function | Description |
|----------|-------------|
| `pesoTotal()` | Returns 4 (1a5) or 5 (0a5) |
| `calcNota(respuestas)` | Calculates grade for student |
| `calcAciertos(respuestas)` | Counts correct answers |
| `notaMinima()` | Returns 0 or 1 based on system |

### Database (`src/db/*.js`)

| Function | Description |
|----------|-------------|
| `abrirDB()` | Opens IndexedDB connection |
| `dbGuardar(obj)` | Saves evaluation |
| `dbListar()` | Returns all evaluations |
| `dbEliminar(id)` | Deletes evaluation |

## Notes

- This project uses **Vanilla JavaScript** - no React, Vue, or other frameworks
- IndexedDB is used for persistence (evaluations, drafts, photos)
- The app works offline after first load
- Photos are stored as Blobs in IndexedDB
