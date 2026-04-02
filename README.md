# EvalMath — Gestor de Evaluaciones ICFES

Aplicación web vanilla JavaScript para gestionar y calificar evaluaciones tipo ICFES con preguntas de selección múltiple (única respuesta). Utiliza IndexedDB para persistencia local.

No solo para matemáticas — funciona para cualquier área: español, ciencias, historia, biología, física, química, etc.

## Características

- **4 pasos**: Configuración → Clave de respuestas → Respuestas de estudiantes → Resumen
- **Búsqueda de estudiantes**: Filtro en tiempo real en paso 3 (parcial, case-insensitive)
- **Sistemas de calificación flexibles**: 
  - "1aX" (de 1 a X) o "0aX" (de 0 a X), donde X = 5 a 10
  - Configurable mediante dropdown y botones "Desde 1" / "Desde 0"
- **Valores por defecto**: Nota máxima = 5, nota aprobación = 3, sistema = "1a5"
- **Peso de preguntas**: Igual o diferente por pregunta
- **Fotos de exámenes**: Adjuntar imágenes a cada evaluación
- **Autoguardado**: Borrador automático al calificar cada estudiante
- **Historial**: Evaluaciones guardadas en IndexedDB con filtros (nombre, período, fecha)
- **Exportar/Importar CSV**: Descargar e importar evaluaciones con análisis por pregunta (compatible con todos los sistemas de calificación)
- **Exportar PDF**: Generación de reportes PDF legibles para padres y directivos
- **Análisis visual**: Barras proporcionales en el resumen (por pregunta y distribución A/B/C/D)
- **Navegación por teclado**: Atajos en paso 3 (←/→ estudiantes, A/B/C/D respuestas, Enter calificar)
- **PWA**: Aplicación instalable, funciona sin conexión después de la primera carga
- **Transiciones suaves**: Animaciones de 250ms entre pasos
- **Configuración global**: Sistema de calificación, nota máxima y de aprobación personalizables
- **Seguridad**: CSP, sanitización XSS, validación de entrada

## Requisitos

- Node.js 18+
- npm 9+

## Instalación

```bash
npm install
```

## Scripts

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Iniciar servidor de desarrollo |
| `npm run build` | Compilar para producción |
| `npm run preview` | Previsualizar build |
| `npm run lint` | Verificar código |
| `npm run lint:fix` | Auto-corrección de lint |
| `npm run test` | Ejecutar tests |
| `npm run test:watch` | Tests en modo watch |
| `npm run test:coverage` | Tests con cobertura |

## Estructura del Proyecto

```
calmath/
├── index.html              # Punto de entrada HTML
├── package.json            # Dependencias y scripts
├── vite.config.js          # Configuración Vite
├── eslint.config.js        # Reglas ESLint
├── vitest.config.js        # Configuración de tests
├── scripts/
│   └── generate-sw-manifest.js  # Script post-build para PWA
├── public/
│   ├── icon.svg           # Icono de la app
│   ├── sw.js              # Service Worker (vanilla, sin CDN)
│   └── manifest.json      # Manifiesto PWA
├── src/
│   ├── styles.css         # Estilos de la aplicación
│   ├── app/
│   │   ├── index.js       # Punto de entrada JS
│   │   ├── state.js       # Gestión de estado
│   │   ├── calification.js # Cálculo de notas
│   │   ├── steps.js       # Navegación entre pasos
│   │   ├── render.js      # Renderizado DOM
│   │   ├── views.js       # Re-exportación de vistas modulares
│   │   ├── views/         # Vistas modulares
│   │   │   ├── ui.js      # Utilities: escapeHtml, showView, toast
│   │   │   ├── historial.js # Vista historial
│   │   │   ├── resumen.js   # Vista resumen
│   │   │   ├── modals.js    # Modales de settings/delete
│   │   │   └── exports.js   # Import/Export CSV/PDF
│   │   └── bindHtmlEvents.js # Binding de eventos (CSP)
│   └── db/
│       ├── indexedDB.js   # IndexedDB core
│       ├── draft.js       # Borradores
│       └── photos.js      # Fotos de exámenes
└── tests/
    ├── app.test.js        # Tests de lógica (34 tests)
    └── db.test.js         # Tests de IndexedDB
```

## Atajos de teclado (Paso 3)

| Tecla | Acción |
|-------|--------|
| `←` / `PageUp` | Estudiante anterior |
| `→` / `PageDown` | Siguiente estudiante |
| `A` / `B` / `C` / `D` | Marcar respuesta |
| `Enter` | Calificar estudiante |
| `Home` | Primer estudiante |
| `End` | Último estudiante |

## Tecnologías

- **Vite 8** — Build tool
- **Service Worker Vanilla** — PWA offline sin dependencias externas
- **ESLint** — Linting
- **Vitest** — Testing (34 tests)
- **IndexedDB** — Persistencia local
- **jsPDF** — Generación de PDF

## Seguridad

- Content Security Policy (CSP)
- Sanitización HTML contra XSS
- Validación de rangos de entrada
- Eventos bindeados vía JavaScript (no inline)

## Licencia

MIT
