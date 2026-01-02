/**
 * Utilidad para generar PDFs de Project Metrics
 */
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { getDeveloperMetricsData } from './developerMetricsApi';
import { supabase } from './supabaseApi';

/**
 * Obtiene los issues completos con todos los campos necesarios para el PDF
 */
export const getIssuesForPDF = async (squadId, sprintId, supabase) => {
  if (!supabase) {
    throw new Error('Supabase no está configurado');
  }

  try {
    // Obtener initiative_ids del squad
    let initiativeIds = null;
    if (squadId) {
      const { data: initiatives, error: initiativesError } = await supabase
        .from('initiatives')
        .select('id')
        .eq('squad_id', squadId);

      if (initiativesError) throw initiativesError;
      initiativeIds = (initiatives || []).map(i => i.id);
      
      if (initiativeIds.length === 0) {
        return [];
      }
    }

    // Obtener el nombre del sprint
    let sprintName = null;
    if (sprintId) {
      const { data: sprint, error: sprintError } = await supabase
        .from('sprints')
        .select('sprint_name')
        .eq('id', sprintId)
        .single();

      if (sprintError) throw sprintError;
      sprintName = sprint?.sprint_name;
    }

    // Construir query para obtener issues con todos los campos necesarios
    // Nota: Algunos campos pueden no existir en la BD, usar valores por defecto
    let query = supabase
      .from('issues')
      .select(`
        id,
        issue_key,
        summary,
        current_status,
        current_story_points,
        current_sprint,
        assignee_id,
        initiatives(
          id,
          initiative_name
        )
      `);

    // Filtrar por initiatives del squad
    if (initiativeIds) {
      query = query.in('initiative_id', initiativeIds);
    }

    // Filtrar por current_sprint
    if (sprintName) {
      query = query.eq('current_sprint', sprintName);
    }

    // Obtener todos los issues sin límite
    const { data: issues, error } = await query;

    if (error) throw error;
    
    console.log(`[PDF_GENERATOR] Issues obtenidos para PDF: ${(issues || []).length}`);

    // Obtener assignee_ids únicos
    const assigneeIds = [...new Set((issues || []).map(i => i.assignee_id).filter(Boolean))];
    
    // Obtener información de developers
    let developersMap = new Map();
    if (assigneeIds.length > 0) {
      try {
        const { data: developers, error: devError } = await supabase
          .from('developers')
          .select('id, display_name, email')
          .in('id', assigneeIds);
        
        if (!devError && developers) {
          developers.forEach(dev => {
            developersMap.set(dev.id, dev);
          });
        }
      } catch (error) {
        console.warn('[PDF_GENERATOR] Error obteniendo developers:', error);
      }
    }

    // Formatear los issues para la tabla y ordenarlos por key
    const formattedIssues = (issues || []).map(issue => {
      // Determinar issue type basado en el key (Bug si contiene "BUG", Task por defecto)
      const issueType = issue.issue_key?.toUpperCase().includes('BUG') ? 'Bug' : 'Task';
      
      // Obtener assignee
      const developer = issue.assignee_id ? developersMap.get(issue.assignee_id) : null;
      const assignee = developer?.display_name || developer?.email || 'Unassigned';
      
      // Priority puede no estar en la BD, usar Medium por defecto
      // Status ya está disponible
      return {
        issueType: issueType,
        key: issue.issue_key || '',
        assignee: assignee,
        priority: 'Medium', // Por defecto, ya que puede no estar en la BD
        status: issue.current_status || 'Unknown',
        storyPoint: issue.current_story_points || 0,
        summary: issue.summary || ''
      };
    });
    
    // Ordenar por key para consistencia
    formattedIssues.sort((a, b) => {
      if (!a.key && !b.key) return 0;
      if (!a.key) return 1;
      if (!b.key) return -1;
      return a.key.localeCompare(b.key);
    });
    
    console.log(`[PDF_GENERATOR] Issues formateados y ordenados: ${formattedIssues.length}`);
    return formattedIssues;
  } catch (error) {
    console.error('[PDF_GENERATOR] Error obteniendo issues:', error);
    throw error;
  }
};

/**
 * Obtiene el sprint goal
 * Nota: La columna sprint_goal puede no existir en la base de datos
 */
export const getSprintGoal = async (sprintId, supabase) => {
  if (!supabase || !sprintId) {
    return null;
  }

  try {
    // Intentar obtener sprint_goal, pero si no existe, retornar null sin error
    const { data, error } = await supabase
      .from('sprints')
      .select('sprint_goal')
      .eq('id', sprintId)
      .single();

    // Si el error es porque la columna no existe, simplemente retornar null
    if (error) {
      if (error.code === '42703' || error.message?.includes('does not exist')) {
        console.log('[PDF_GENERATOR] La columna sprint_goal no existe en la tabla sprints');
        return null;
      }
      throw error;
    }
    
    return data?.sprint_goal || null;
  } catch (error) {
    // Si hay un error diferente, loguearlo pero no fallar
    console.warn('[PDF_GENERATOR] No se pudo obtener sprint goal:', error.message);
    return null;
  }
};

/**
 * Convierte un elemento HTML a imagen usando html2canvas
 */
const elementToImage = async (element, options = {}) => {
  const canvas = await html2canvas(element, {
    backgroundColor: '#0a0e17',
    scale: 2,
    useCORS: true,
    logging: false,
    ...options
  });
  return canvas.toDataURL('image/png');
};

/**
 * Obtiene métricas de developers que trabajaron en el sprint
 */
const getDevelopersMetricsForSprint = async (squadId, sprintId) => {
  if (!supabase || !squadId || !sprintId) {
    return [];
  }

  try {
    // Obtener el nombre del sprint
    const { data: sprint, error: sprintError } = await supabase
      .from('sprints')
      .select('sprint_name')
      .eq('id', sprintId)
      .single();

    if (sprintError) throw sprintError;
    const sprintName = sprint?.sprint_name;

    if (!sprintName) return [];

    // Obtener initiative_ids del squad
    const { data: initiatives, error: initiativesError } = await supabase
      .from('initiatives')
      .select('id')
      .eq('squad_id', squadId);

    if (initiativesError) throw initiativesError;
    const initiativeIds = (initiatives || []).map(i => i.id);

    if (initiativeIds.length === 0) return [];

    // Obtener assignee_ids únicos de issues en el sprint
    const { data: issues, error: issuesError } = await supabase
      .from('issues')
      .select('assignee_id')
      .in('initiative_id', initiativeIds)
      .eq('current_sprint', sprintName)
      .not('assignee_id', 'is', null);

    if (issuesError) throw issuesError;

    const assigneeIds = [...new Set((issues || []).map(i => i.assignee_id).filter(Boolean))];

    if (assigneeIds.length === 0) return [];

    // Obtener información de developers
    const { data: developers, error: devsError } = await supabase
      .from('developers')
      .select('id, display_name, email')
      .in('id', assigneeIds)
      .eq('active', true)
      .order('display_name', { ascending: true });

    if (devsError) throw devsError;

    // Obtener métricas para cada developer
    const developersMetrics = await Promise.all(
      (developers || []).map(async (dev) => {
        try {
          const metrics = await getDeveloperMetricsData(dev.id, squadId, sprintId);
          return {
            developer: dev,
            metrics: metrics.metrics,
            statusBreakdown: metrics.statusBreakdown,
            tickets: metrics.tickets
          };
        } catch (error) {
          console.warn(`[PDF_GENERATOR] Error obteniendo métricas para developer ${dev.id}:`, error);
          return null;
        }
      })
    );

    return developersMetrics.filter(Boolean);
  } catch (error) {
    console.error('[PDF_GENERATOR] Error obteniendo métricas de developers:', error);
    return [];
  }
};

/**
 * Genera un PDF con el reporte de Project Metrics
 */
export const generateProjectMetricsPDF = async ({
  squadName,
  sprintName,
  sprintGoal,
  chartElements, // Array de elementos HTML de los gráficos
  issues, // Array de issues formateados
  metricsData, // Datos de métricas para el resumen
  squadId, // ID del squad para obtener métricas de developers
  sprintId // ID del sprint para obtener métricas de developers
}) => {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - (margin * 2);
  let yPosition = margin;

  // Función para agregar una nueva página si es necesario
  const checkPageBreak = (requiredHeight) => {
    if (yPosition + requiredHeight > pageHeight - margin) {
      doc.addPage();
      yPosition = margin;
      return true;
    }
    return false;
  };

  // PORTADA
  doc.setTextColor(0, 0, 0); // Negro
  doc.setFontSize(32);
  doc.setFont('helvetica', 'bold');
  doc.text('Project Metrics Report', pageWidth / 2, pageHeight / 2 - 30, { align: 'center' });
  
  doc.setFontSize(24);
  doc.setFont('helvetica', 'normal');
  doc.text(squadName || 'Unknown Squad', pageWidth / 2, pageHeight / 2, { align: 'center' });
  
  doc.setFontSize(18);
  doc.text(sprintName || 'Unknown Sprint', pageWidth / 2, pageHeight / 2 + 15, { align: 'center' });
  
  doc.setFontSize(12);
  doc.setTextColor(100, 100, 100); // Gris
  doc.text(new Date().toLocaleDateString('es-ES', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  }), pageWidth / 2, pageHeight / 2 + 35, { align: 'center' });

  // Nueva página para el contenido
  doc.addPage();
  yPosition = margin;

  // SPRINT GOAL
  if (sprintGoal) {
    doc.setFillColor(30, 40, 60);
    doc.roundedRect(margin, yPosition, contentWidth, 30, 3, 3, 'F');
    
    doc.setTextColor(100, 200, 255);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Sprint Goal', margin + 5, yPosition + 10);
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    const goalLines = doc.splitTextToSize(sprintGoal, contentWidth - 10);
    doc.text(goalLines, margin + 5, yPosition + 20);
    
    yPosition += 40;
  }

  // RESUMEN DE MÉTRICAS
  if (metricsData) {
    checkPageBreak(30);
    
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Summary', margin, yPosition);
    yPosition += 8;
    
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text(`Total Tickets: ${metricsData.totalTickets || 0}`, margin, yPosition);
    doc.text(`Total Story Points: ${metricsData.totalSP || 0}`, margin + 100, yPosition);
    doc.text(`Completed Story Points: ${metricsData.completedSP || 0}`, margin, yPosition + 8);
    
    yPosition += 20;
  }

  // GRÁFICOS
  if (chartElements && chartElements.length > 0) {
    for (let i = 0; i < chartElements.length; i++) {
      const chartElement = chartElements[i];
      checkPageBreak(120);
      
      try {
        // Esperar un poco para que el gráfico se renderice completamente
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const imgData = await elementToImage(chartElement, {
          backgroundColor: '#0a0e17',
          scale: 2,
          width: chartElement.offsetWidth,
          height: chartElement.offsetHeight
        });
        
        // Calcular dimensiones manteniendo proporción
        const maxWidth = contentWidth;
        const maxHeight = 100;
        const imgWidth = chartElement.offsetWidth;
        const imgHeight = chartElement.offsetHeight;
        const ratio = Math.min(maxWidth / imgWidth, maxHeight / imgHeight);
        const finalWidth = imgWidth * ratio;
        const finalHeight = imgHeight * ratio;
        
        doc.addImage(imgData, 'PNG', margin, yPosition, finalWidth, finalHeight);
        yPosition += finalHeight + 15;
      } catch (error) {
        console.error('[PDF_GENERATOR] Error convirtiendo gráfico a imagen:', error);
        doc.setTextColor(255, 100, 100);
        doc.setFontSize(10);
        doc.text(`Error al generar gráfico ${i + 1}`, margin, yPosition);
        yPosition += 20;
      }
    }
  }

  // TABLA DE ISSUES
  if (issues && issues.length > 0) {
    console.log(`[PDF_GENERATOR] Generando tabla con ${issues.length} issues`);
    checkPageBreak(50);
    
    doc.setTextColor(0, 0, 0); // Negro
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Jira Tickets', margin, yPosition);
    yPosition += 10;

    const colWidths = {
      type: 15,
      key: 25,
      assignee: 35,
      priority: 20,
      status: 30,
      sp: 15,
      summary: contentWidth - 140
    };

    // Función helper para dibujar los encabezados de la tabla
    const drawTableHeader = () => {
      // Línea superior del encabezado
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.5);
      doc.line(margin, yPosition, margin + contentWidth, yPosition);
      
      doc.setTextColor(0, 0, 0); // Negro
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      
      let xPos = margin + 2;
      doc.text('Type', xPos, yPosition + 6);
      xPos += colWidths.type;
      doc.text('Key', xPos, yPosition + 6);
      xPos += colWidths.key;
      doc.text('Assignee', xPos, yPosition + 6);
      xPos += colWidths.assignee;
      doc.text('Priority', xPos, yPosition + 6);
      xPos += colWidths.priority;
      doc.text('Status', xPos, yPosition + 6);
      xPos += colWidths.status;
      doc.text('SP', xPos, yPosition + 6);
      xPos += colWidths.sp;
      doc.text('Summary', xPos, yPosition + 6);
      
      // Línea inferior del encabezado
      yPosition += 8;
      doc.line(margin, yPosition, margin + contentWidth, yPosition);
      yPosition += 5;
    };

    // Dibujar encabezados iniciales
    drawTableHeader();

    // Filas de la tabla
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(0, 0, 0); // Negro
    
    issues.forEach((issue, index) => {
      // Log para debugging
      if (index === 0 || index === Math.floor(issues.length / 2) || index === issues.length - 1) {
        console.log(`[PDF_GENERATOR] Procesando issue ${index + 1}/${issues.length}: ${issue.key}`);
      }
      
      // Calcular altura necesaria para esta fila (puede tener múltiples líneas)
      const summaryLines = doc.splitTextToSize(issue.summary || '', colWidths.summary - 2);
      const assigneeLines = doc.splitTextToSize(issue.assignee || 'Unassigned', colWidths.assignee - 2);
      const maxLines = Math.max(summaryLines.length, assigneeLines.length, 1);
      const lineHeight = 4;
      const rowHeight = maxLines * lineHeight + 4;
      
      // Verificar si necesitamos una nueva página (incluyendo espacio para el encabezado si es necesario)
      if (yPosition + rowHeight + 10 > pageHeight - margin) {
        doc.addPage();
        yPosition = margin;
        // Redibujar encabezados en la nueva página
        drawTableHeader();
      }
      
      // Renderizar cada campo con texto negro
      let currentY = yPosition + 5;
      
      // Type
      doc.setTextColor(0, 0, 0);
      doc.text(issue.issueType || 'Task', margin + 2, currentY);
      
      // Key
      doc.setTextColor(0, 0, 0);
      doc.text(issue.key || '', margin + 2 + colWidths.type, currentY);
      
      // Assignee (puede tener múltiples líneas)
      doc.setTextColor(0, 0, 0);
      if (Array.isArray(assigneeLines)) {
        assigneeLines.forEach((line, lineIdx) => {
          doc.setTextColor(0, 0, 0);
          doc.text(line, margin + 2 + colWidths.type + colWidths.key, currentY + (lineIdx * lineHeight));
        });
      } else {
        doc.setTextColor(0, 0, 0);
        doc.text(assigneeLines, margin + 2 + colWidths.type + colWidths.key, currentY);
      }
      
      // Priority
      doc.setTextColor(0, 0, 0);
      doc.text(issue.priority || 'Medium', margin + 2 + colWidths.type + colWidths.key + colWidths.assignee, currentY);
      
      // Status
      doc.setTextColor(0, 0, 0);
      doc.text(issue.status || 'Unknown', margin + 2 + colWidths.type + colWidths.key + colWidths.assignee + colWidths.priority, currentY);
      
      // Story Points
      doc.setTextColor(0, 0, 0);
      doc.text(String(issue.storyPoint || 0), margin + 2 + colWidths.type + colWidths.key + colWidths.assignee + colWidths.priority + colWidths.status, currentY);
      
      // Summary (puede tener múltiples líneas)
      doc.setTextColor(0, 0, 0);
      if (Array.isArray(summaryLines)) {
        summaryLines.forEach((line, lineIdx) => {
          doc.setTextColor(0, 0, 0);
          doc.text(line, margin + 2 + colWidths.type + colWidths.key + colWidths.assignee + colWidths.priority + colWidths.status + colWidths.sp, currentY + (lineIdx * lineHeight));
        });
      } else {
        doc.setTextColor(0, 0, 0);
        doc.text(summaryLines, margin + 2 + colWidths.type + colWidths.key + colWidths.assignee + colWidths.priority + colWidths.status + colWidths.sp, currentY);
      }
      
      // Línea separadora entre filas
      yPosition += rowHeight;
      doc.setDrawColor(200, 200, 200); // Gris claro para las líneas
      doc.setLineWidth(0.2);
      doc.line(margin, yPosition, margin + contentWidth, yPosition);
      yPosition += 2;
    });
  } else {
    // Si no hay issues, mostrar mensaje
    checkPageBreak(20);
    doc.setTextColor(150, 150, 150);
    doc.setFontSize(10);
    doc.text('No Jira tickets found for the selected squad and sprint.', margin, yPosition);
  }

  // MÉTRICAS POR DEVELOPER
  if (squadId && sprintId) {
    try {
      console.log('[PDF_GENERATOR] Obteniendo métricas de developers...');
      const developersMetrics = await getDevelopersMetricsForSprint(squadId, sprintId);
      
      if (developersMetrics && developersMetrics.length > 0) {
        checkPageBreak(50);
        yPosition += 15;
        
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text('Developer Metrics', margin, yPosition);
        yPosition += 10;

        developersMetrics.forEach((devData, index) => {
          const { developer, metrics, statusBreakdown } = devData;
          
          // Verificar si necesitamos una nueva página
          const sectionHeight = 80; // Altura estimada por developer
          if (yPosition + sectionHeight > pageHeight - margin) {
            doc.addPage();
            yPosition = margin;
          }

          // Nombre del developer
          doc.setTextColor(0, 0, 0);
          doc.setFontSize(12);
          doc.setFont('helvetica', 'bold');
          doc.text(developer.display_name || developer.email || 'Unknown Developer', margin, yPosition);
          yPosition += 8;

          // Métricas principales
          doc.setFontSize(10);
          doc.setFont('helvetica', 'normal');
          doc.text(`Total Tickets: ${metrics.totalTickets || 0}`, margin, yPosition);
          doc.text(`Total Story Points: ${metrics.totalSP || 0}`, margin + 60, yPosition);
          doc.text(`Dev Done: ${metrics.devDone || 0} (${metrics.devDoneRate || 0}%)`, margin + 120, yPosition);
          yPosition += 6;
          
          doc.text(`Dev Done SP: ${metrics.devDoneSP || 0} (${metrics.spDevDoneRate || 0}%)`, margin, yPosition);
          doc.text(`Tickets with SP: ${metrics.withSP || 0}`, margin + 60, yPosition);
          doc.text(`Tickets without SP: ${metrics.noSP || 0}`, margin + 120, yPosition);
          yPosition += 8;

          // Breakdown por status
          if (statusBreakdown && Object.keys(statusBreakdown).length > 0) {
            doc.setFontSize(9);
            doc.setFont('helvetica', 'bold');
            doc.text('Status Breakdown:', margin, yPosition);
            yPosition += 5;
            
            doc.setFont('helvetica', 'normal');
            const statusEntries = Object.entries(statusBreakdown).slice(0, 5); // Limitar a 5 estados principales
            statusEntries.forEach(([status, data]) => {
              doc.text(`${status}: ${data.count} (${data.percentage}%)`, margin + 5, yPosition);
              yPosition += 4;
            });
          }

          yPosition += 5;
          
          // Línea separadora
          doc.setDrawColor(200, 200, 200);
          doc.setLineWidth(0.2);
          doc.line(margin, yPosition, margin + contentWidth, yPosition);
          yPosition += 5;
        });
      }
    } catch (error) {
      console.error('[PDF_GENERATOR] Error agregando métricas de developers:', error);
      // Continuar sin las métricas de developers si hay error
    }
  }

  // Guardar el PDF
  const fileName = `Project_Metrics_${squadName?.replace(/\s+/g, '_') || 'Unknown'}_${sprintName?.replace(/\s+/g, '_') || 'Unknown'}_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(fileName);
};

