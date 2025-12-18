# Developer Metrics - Implementación Inline

Este documento describe la implementación completa del componente DeveloperMetrics en el código inline de `index.html`.

## Estructura

El componente está implementado completamente en el código inline de `index.html` alrededor de la línea 4949.

## Funcionalidades

1. **Carga de Squads**: Carga todos los squads disponibles desde Supabase
2. **Carga de Sprints**: Carga sprints para el squad seleccionado
3. **Carga de Developers**: Carga developers que tienen issues en el squad seleccionado
4. **Carga de Métricas**: Calcula métricas basadas en los issues del developer seleccionado
5. **Gráficos Doughnut**: Dev Done Rate y SP Dev Done
6. **Key Metrics**: Total Tickets, With SP, No SP, Total SP
7. **Gráficos**: Tickets by Status (Pie) y SP vs No SP (Bar)

## Notas

- El componente usa `window.supabaseClient` para acceder a Supabase
- Usa `window.Recharts` para los gráficos
- Los iconos están definidos en el objeto `Icons` global
