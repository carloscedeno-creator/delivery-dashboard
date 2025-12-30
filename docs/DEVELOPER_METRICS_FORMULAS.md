# Fórmulas de Métricas de Desarrollador y Gráficos

## 📊 Resumen

Este documento describe las fórmulas y lógica utilizada para mapear tickets del desarrollador y generar los gráficos en el board de Developer Metrics.

---

## 🔍 1. FILTROS Y QUERY BASE

### 1.1 Filtro por Sprint (usando `current_sprint`)

```javascript
// Obtener nombre del sprint seleccionado
sprintName = sprints.find(s => s.id === sprintId)?.sprint_name

// Query base para obtener issues del desarrollador
query = supabase
  .from('issues')
  .select(`
    id, issue_key, summary, current_status, 
    current_story_points, current_sprint, assignee_id, initiative_id
  `)
  .eq('assignee_id', developerId)

// Filtrar por current_sprint (métrica real)
if (sprintName) {
  query = query.eq('current_sprint', sprintName)
}
```

**Nota importante**: Se usa `current_sprint` (no `issue_sprints`) porque es la métrica real que define si un ticket está en el sprint seleccionado, calculada con la misma lógica del spreadsheet.

### 1.2 Filtro por Squad

```javascript
// Filtrar issues por squad después de obtener los datos
filteredIssues = issues.filter(issue => {
  return issue.initiatives?.squad_id === squadId
})
```

---

## 📈 2. CÁLCULO DE MÉTRICAS BASE

### 2.1 Mapeo de Tickets

```javascript
tickets = filteredIssues.map(issue => ({
  id: issue.id,
  key: issue.issue_key,
  summary: issue.summary,
  status: issue.current_status,
  storyPoints: issue.current_story_points || 0,
  hasSP: (issue.current_story_points || 0) > 0,
  squad: issue.initiatives?.squads?.squad_name || 'Unknown'
}))
```

### 2.2 Función `isDevDone` (Estados considerados como "Dev Done")

```javascript
isDevDone = (status) => {
  if (!status) return false
  statusUpper = status.trim().toUpperCase()
  
  return statusUpper === 'DONE' || 
         statusUpper === 'DEVELOPMENT DONE' ||
         statusUpper.includes('DEVELOPMENT DONE') ||
         statusUpper.includes('DEV DONE') ||
         (statusUpper.includes('DONE') && 
          !statusUpper.includes('TO DO') && 
          !statusUpper.includes('TODO')) ||
         statusUpper === 'CLOSED' ||
         statusUpper === 'RESOLVED' ||
         statusUpper === 'COMPLETED'
}
```

**Estados que se consideran "Dev Done"**:
- `DONE`
- `DEVELOPMENT DONE`
- `CLOSED`
- `RESOLVED`
- `COMPLETED`
- Cualquier estado que contenga "DEV DONE" o "DEVELOPMENT DONE"

---

## 🧮 3. FÓRMULAS DE MÉTRICAS

### 3.1 Métricas de Conteo

```javascript
// Total de tickets
totalTickets = tickets.length

// Tickets con Story Points
withSP = tickets.filter(t => t.hasSP).length

// Tickets sin Story Points
noSP = tickets.filter(t => !t.hasSP).length

// Total de Story Points asignados
totalSP = tickets.reduce((sum, t) => sum + t.storyPoints, 0)
```

### 3.2 Métricas de "Dev Done"

```javascript
// Tickets en estado "Dev Done"
devDone = tickets.filter(t => isDevDone(t.status)).length

// Story Points de tickets "Dev Done"
devDoneSP = tickets
  .filter(t => isDevDone(t.status) && t.hasSP)
  .reduce((sum, t) => sum + t.storyPoints, 0)

// Total de Story Points asignados (solo tickets con SP)
totalSPAssigned = tickets
  .filter(t => t.hasSP)
  .reduce((sum, t) => sum + t.storyPoints, 0)
```

### 3.3 Porcentajes

```javascript
// Dev Done Rate (por tickets)
devDoneRate = totalTickets > 0 
  ? Math.round((devDone / totalTickets) * 100) 
  : 0

// SP Dev Done Rate (por Story Points)
spDevDoneRate = totalSPAssigned > 0 
  ? Math.round((devDoneSP / totalSPAssigned) * 100) 
  : 0
```

**Fórmulas matemáticas**:
- `devDoneRate = (devDone / totalTickets) × 100`
- `spDevDoneRate = (devDoneSP / totalSPAssigned) × 100`

---

## 📊 4. BREAKDOWN POR STATUS

### 4.1 Cálculo de Breakdown

```javascript
statusBreakdown = {}

// Contar tickets por status
tickets.forEach(ticket => {
  status = ticket.status || 'Unknown'
  if (!statusBreakdown[status]) {
    statusBreakdown[status] = { count: 0, percentage: 0 }
  }
  statusBreakdown[status].count++
})

// Calcular porcentajes
Object.keys(statusBreakdown).forEach(status => {
  statusBreakdown[status].percentage = totalTickets > 0 
    ? Math.round((statusBreakdown[status].count / totalTickets) * 100) 
    : 0
})
```

**Fórmula**: `percentage = (count / totalTickets) × 100`

---

## 📈 5. DATOS PARA GRÁFICOS

### 5.1 Gráfico: Tickets by Status (Pie Chart)

```javascript
statusChartData = Object.entries(statusBreakdown).map(([status, data]) => ({
  name: status,
  value: data.count,
  percentage: data.percentage
}))
```

**Estructura**:
```javascript
[
  { name: "TO DO", value: 5, percentage: 25 },
  { name: "IN PROGRESS", value: 8, percentage: 40 },
  { name: "DONE", value: 7, percentage: 35 }
]
```

### 5.2 Gráfico: SP vs No SP (Bar Chart)

```javascript
spVsNoSPData = [
  { name: 'With SP', value: withSP, color: '#3b82f6' },
  { name: 'No SP', value: noSP, color: '#8b5cf6' }
]
```

**Estructura**:
```javascript
[
  { name: "With SP", value: 15, color: "#3b82f6" },
  { name: "No SP", value: 5, color: "#8b5cf6" }
]
```

### 5.3 Gráfico: Dev Done Rate (Doughnut Chart)

```javascript
devDoneChartData = [
  { 
    name: 'Done', 
    value: devDone, 
    color: '#10b981' 
  },
  { 
    name: 'Remaining', 
    value: totalTickets - devDone, 
    color: '#1e293b' 
  }
]
```

**Fórmula**: `Remaining = totalTickets - devDone`

**Centro del gráfico**: Muestra `devDoneRate` como porcentaje

### 5.4 Gráfico: SP Dev Done Rate (Doughnut Chart)

```javascript
spDevDoneChartData = [
  { 
    name: 'Done', 
    value: devDoneSP, 
    color: '#10b981' 
  },
  { 
    name: 'Remaining', 
    value: totalSPAssigned - devDoneSP, 
    color: '#1e293b' 
  }
]
```

**Fórmula**: `Remaining = totalSPAssigned - devDoneSP`

**Centro del gráfico**: Muestra `spDevDoneRate` como porcentaje

---

## 🔄 6. FLUJO COMPLETO DE CÁLCULO

```
1. Obtener issues del desarrollador
   ↓
2. Filtrar por current_sprint (si hay sprint seleccionado)
   ↓
3. Filtrar por squad (si hay squad seleccionado)
   ↓
4. Mapear a tickets con: id, key, summary, status, storyPoints, hasSP
   ↓
5. Calcular métricas base:
   - totalTickets
   - withSP, noSP
   - totalSP
   - devDone, devDoneSP, totalSPAssigned
   ↓
6. Calcular porcentajes:
   - devDoneRate = (devDone / totalTickets) × 100
   - spDevDoneRate = (devDoneSP / totalSPAssigned) × 100
   ↓
7. Calcular breakdown por status:
   - Contar tickets por status
   - Calcular porcentaje por status
   ↓
8. Preparar datos para gráficos:
   - statusChartData (Pie Chart)
   - spVsNoSPData (Bar Chart)
   - devDoneChartData (Doughnut Chart)
   - spDevDoneChartData (Doughnut Chart)
```

---

## 📝 7. EJEMPLO PRÁCTICO

### Datos de Entrada:
```javascript
issues = [
  { id: 1, current_status: "DONE", current_story_points: 5, current_sprint: "Sprint 1" },
  { id: 2, current_status: "IN PROGRESS", current_story_points: 3, current_sprint: "Sprint 1" },
  { id: 3, current_status: "TO DO", current_story_points: 0, current_sprint: "Sprint 1" },
  { id: 4, current_status: "DEVELOPMENT DONE", current_story_points: 8, current_sprint: "Sprint 1" }
]
```

### Cálculos:

```javascript
totalTickets = 4
withSP = 3  // (tickets con SP > 0)
noSP = 1    // (ticket sin SP)
totalSP = 5 + 3 + 0 + 8 = 16

devDone = 2  // (DONE + DEVELOPMENT DONE)
devDoneSP = 5 + 8 = 13
totalSPAssigned = 5 + 3 + 8 = 16

devDoneRate = (2 / 4) × 100 = 50%
spDevDoneRate = (13 / 16) × 100 = 81.25% ≈ 81%

statusBreakdown = {
  "DONE": { count: 1, percentage: 25 },
  "IN PROGRESS": { count: 1, percentage: 25 },
  "TO DO": { count: 1, percentage: 25 },
  "DEVELOPMENT DONE": { count: 1, percentage: 25 }
}
```

---

## 🎯 8. PUNTOS CLAVE

1. **Filtro por Sprint**: Usa `current_sprint` (no `issue_sprints`) porque es la métrica real calculada con la lógica del spreadsheet.

2. **Estados "Dev Done"**: Se consideran múltiples variaciones de estados completados, no solo "DONE".

3. **Porcentajes**: Se redondean a números enteros usando `Math.round()`.

4. **Story Points**: Solo se cuentan tickets con `current_story_points > 0` para métricas de SP.

5. **Gráficos**: 
   - Pie Charts para distribución por status
   - Bar Chart para SP vs No SP
   - Doughnut Charts para tasas de completitud

---

## 📚 Referencias

- **Archivo de API**: `src/utils/developerMetricsApi.js`
- **Componente de UI**: `src/components/DeveloperMetrics.jsx`
- **Lógica de filtrado**: Usa `current_sprint` de la tabla `issues`




