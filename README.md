# EvalMath 0.2.0

Gestor de evaluaciones estilo ICFES construído con React, Zustand y React Router.

## Características

- **4 pasos wizard**: Configuración → Clave de respuestas → Respuestas de estudiantes → Resumen
- **Validación de campos obligatorios**: Paso 1 valida uno por uno (nombre, fecha, período, num preguntas, num estudiantes)
- **Sistemas de calificación flexibles**:
  - "1aX" (de 1 a X) o "0aX" (de 0 a X), donde X = 5 a 10
  - Configurable mediante dropdown y botones "Desde 1" / "Desde 0"
- **Peso de preguntas**: Igual o diferente por pregunta
  - Validación de suma de pesos (no puede exceder ni ser menor al peso total)
  - Mensajes diferenciados: verde (exacto), amarillo (faltante), rojo (excedido)
- **Paso 3 mejorado**:
  - Navegación de preguntas debajo de tabs de estudiantes
  - Todas las preguntas visibles a la vez
  - Botón "Calificar estudiante actual" para ver resultado individual
  - Botón Continuar solo habilitado cuando todos los estudiantes están calificados
- **Historial**: Evaluaciones guardadas en IndexedDB con filtros y importar CSV
- **Import/Export CSV**: Formato completo compatible (metadata + estudiantes)
- **Exportar PDF**: Generación de reportes
- **Configuración**: Sistema de calificación y nota de aprobación configurables
- **PWA**: Aplicación instalable, funciona sin conexión después de la primera carga

## Tech Stack

- **Frontend**: React 19 + Vite 8
- **Estado**: Zustand
- **Navegación**: React Router (SPA)
- **Base de datos**: IndexedDB (vía idb)
- **PDF**: jsPDF
- **Estilos**: CSS vanilla (mantenido del proyecto original)

## Estructura

```
src/
├── main.jsx              # Entry point + SW registration
├── App.jsx               # Router + Layout + Header + Toast + SettingsModal
├── stores/useAppStore.js # Estado global + IndexedDB + importarEvaluacion
├── pages/
│   ├── NuevaEvaluacion.jsx  # Wizard 4 pasos
│   ├── Historial.jsx        # Lista evaluaciones + importar CSV
│   └── Resumen.jsx          # Resultados + export CSV/PDF completo
├── utils/calification.js    # Lógica de cálculo
└── styles.css               # Estilos (sin cambios)
```

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
| `npm run dev` | Iniciar servidor de desarrollo (puerto 3000) |
| `npm run build` | Compilar para producción |
| `npm run preview` | Previsualizar build |
| `npm run lint` | Verificar código |
| `npm run lint:fix` | Auto-corrección de lint |

## Cambios desde v0.1.0

- **Migración completa a React** - De vanilla JavaScript a React 19
- **Estado con Zustand** - Gestión de estado centralizada
- **Navegación SPA** - React Router con rutas internas
- **IndexedDB con idb** - API async/await más limpia
- **Paso 1**: Validación de campos obligatorios uno por uno
- **Paso 2**: Validación de pesos (no exceder, no faltar)
- **Paso 3**: Todas las preguntas visibles, botón calificar, continuar solo si todos calificados
- **CSV Export/Import**: Formato completo compatible
- **Settings**: Modal de configuración funcional
- **PWA** - Service worker vanilla mantenido

## Licencia

MIT
