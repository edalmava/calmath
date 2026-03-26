# EvalMath — Gestor de Evaluaciones ICFES

Aplicación web vanilla JavaScript para gestionar y calificar evaluaciones de matemáticas tipo ICFES. Utiliza IndexedDB para persistencia local.

## Características

- **4 pasos**: Configuración → Clave de respuestas → Respuestas de estudiantes → Resumen
- **Sistemas de calificación**: 1-5 (nota mínima 1.0) o 0-5 (nota mínima 0.0)
- **Peso de preguntas**: Igual o diferente por pregunta
- **Fotos de exámenes**: Adjuntar imágenes a cada evaluación
- **Autoguardado**: Borrador automático al calificar cada estudiante
- **Historial**: Evaluaciones guardadas en IndexedDB
- **Exportar CSV**: Descargar resultados con análisis por pregunta
- **Navegación por teclado**: Atajos en paso 3 (←/→ estudiantes, A/B/C/D respuestas, Enter calificar)
- **Configuración global**: Nota máxima y de aprobación personalizables
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
├── eslint.config.js         # Reglas ESLint
├── vitest.config.js        # Configuración de tests
├── src/
│   ├── styles.css          # Estilos de la aplicación
│   ├── app/
│   │   ├── index.js        # Punto de entrada JS
│   │   ├── state.js        # Gestión de estado
│   │   ├── calification.js # Cálculo de notas
│   │   ├── steps.js        # Navegación entre pasos
│   │   ├── render.js       # Renderizado DOM
│   │   ├── views.js        # Vistas y modales
│   │   └── bindHtmlEvents.js # Binding de eventos (CSP)
│   └── db/
│       ├── indexedDB.js    # IndexedDB core
│       ├── draft.js        # Borradores
│       └── photos.js       # Fotos de exámenes
└── tests/
    ├── app.test.js         # Tests de lógica
    └── db.test.js          # Tests de IndexedDB
```

## Atajos de teclado (Paso 3)

| Tecla | Acción |
|-------|--------|
| `←` / `PageUp` | Estudiante anterior |
| `→` / `PageDown` | Siguiente estudiante |
| `A` / `B` / `C` / `D` | Marcar respuesta |
| `Enter` | Calificar y avanzar |
| `Home` | Primer estudiante |
| `End` | Último estudiante |

## Tecnologías

- **Vite** — Build tool
- **ESLint** — Linting
- **Vitest** — Testing
- **IndexedDB** — Persistencia local

## Seguridad

- Content Security Policy (CSP)
- Sanitización HTML contra XSS
- Validación de rangos de entrada
- Eventos bindeados vía JavaScript (no inline)

## Licencia

MIT