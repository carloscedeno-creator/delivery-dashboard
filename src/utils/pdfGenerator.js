/**
 * Utility for generating Project Metrics PDFs
 */
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { getDeveloperMetricsData } from './developerMetricsApi';
import { supabase } from './supabaseApi';

/**
 * Gets complete issues with all necessary fields for the PDF
 */
export const getIssuesForPDF = async (squadId, sprintId, supabase) => {
  if (!supabase) {
    throw new Error('Supabase is not configured');
  }

  try {
    // Get initiative_ids from squad
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

    // Get sprint name
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

    // Build query to get issues with all necessary fields
    // Note: Some fields may not exist in DB, use default values
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

    // Filter by squad initiatives
    if (initiativeIds) {
      query = query.in('initiative_id', initiativeIds);
    }

    // Filter by current_sprint
    if (sprintName) {
      query = query.eq('current_sprint', sprintName);
    }

    // Get all issues without limit
    const { data: issues, error } = await query;

    if (error) throw error;
    
    console.log(`[PDF_GENERATOR] Issues retrieved for PDF: ${(issues || []).length}`);

    // Get unique assignee_ids
    const assigneeIds = [...new Set((issues || []).map(i => i.assignee_id).filter(Boolean))];
    
    // Get developer information
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
        console.warn('[PDF_GENERATOR] Error getting developers:', error);
      }
    }

    // Format issues for table and sort by key
    const formattedIssues = (issues || []).map(issue => {
      // Determine issue type based on key (Bug if contains "BUG", Task by default)
      const issueType = issue.issue_key?.toUpperCase().includes('BUG') ? 'Bug' : 'Task';
      
      // Get assignee
      const developer = issue.assignee_id ? developersMap.get(issue.assignee_id) : null;
      const assignee = developer?.display_name || developer?.email || 'Unassigned';
      
      // Priority may not be in DB, use Medium as default
      // Status is already available
      return {
        issueType: issueType,
        key: issue.issue_key || '',
        assignee: assignee,
        priority: 'Medium', // Default, as it may not be in DB
        status: issue.current_status || 'Unknown',
        storyPoint: issue.current_story_points || 0,
        summary: issue.summary || ''
      };
    });
    
    // Sort by key for consistency
    formattedIssues.sort((a, b) => {
      if (!a.key && !b.key) return 0;
      if (!a.key) return 1;
      if (!b.key) return -1;
      return a.key.localeCompare(b.key);
    });
    
    console.log(`[PDF_GENERATOR] Issues formatted and sorted: ${formattedIssues.length}`);
    return formattedIssues;
  } catch (error) {
    console.error('[PDF_GENERATOR] Error getting issues:', error);
    throw error;
  }
};

/**
 * Gets the sprint goal
 * Note: The sprint_goal column may not exist in the database
 */
export const getSprintGoal = async (sprintId, supabase) => {
  if (!supabase || !sprintId) {
    return null;
  }

  try {
    // Try to get sprint_goal, but if it doesn't exist, return null without error
    const { data, error } = await supabase
      .from('sprints')
      .select('sprint_goal')
      .eq('id', sprintId)
      .single();

    // If error is because column doesn't exist, simply return null
    if (error) {
      if (error.code === '42703' || error.message?.includes('does not exist')) {
        console.log('[PDF_GENERATOR] The sprint_goal column does not exist in the sprints table');
        return null;
      }
      throw error;
    }
    
    return data?.sprint_goal || null;
  } catch (error) {
    // If there's a different error, log it but don't fail
    console.warn('[PDF_GENERATOR] Could not get sprint goal:', error.message);
    return null;
  }
};

/**
 * Converts an HTML element to image using html2canvas
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
 * Gets metrics for developers who worked in the sprint
 */
const getDevelopersMetricsForSprint = async (squadId, sprintId) => {
  if (!supabase || !squadId || !sprintId) {
    return [];
  }

  try {
    // Get sprint name
    const { data: sprint, error: sprintError } = await supabase
      .from('sprints')
      .select('sprint_name')
      .eq('id', sprintId)
      .single();

    if (sprintError) throw sprintError;
    const sprintName = sprint?.sprint_name;

    if (!sprintName) return [];

    // Get initiative_ids from squad
    const { data: initiatives, error: initiativesError } = await supabase
      .from('initiatives')
      .select('id')
      .eq('squad_id', squadId);

    if (initiativesError) throw initiativesError;
    const initiativeIds = (initiatives || []).map(i => i.id);

    if (initiativeIds.length === 0) return [];

    // Get unique assignee_ids from issues in the sprint
    const { data: issues, error: issuesError } = await supabase
      .from('issues')
      .select('assignee_id')
      .in('initiative_id', initiativeIds)
      .eq('current_sprint', sprintName)
      .not('assignee_id', 'is', null);

    if (issuesError) throw issuesError;

    const assigneeIds = [...new Set((issues || []).map(i => i.assignee_id).filter(Boolean))];

    if (assigneeIds.length === 0) return [];

    // Get developer information
    const { data: developers, error: devsError } = await supabase
      .from('developers')
      .select('id, display_name, email')
      .in('id', assigneeIds)
      .eq('active', true)
      .order('display_name', { ascending: true });

    if (devsError) throw devsError;

    // Get metrics for each developer
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
          console.warn(`[PDF_GENERATOR] Error getting metrics for developer ${dev.id}:`, error);
          return null;
        }
      })
    );

    return developersMetrics.filter(Boolean);
  } catch (error) {
    console.error('[PDF_GENERATOR] Error getting developer metrics:', error);
    return [];
  }
};

/**
 * Generates a PDF with the Project Metrics report
 */
export const generateProjectMetricsPDF = async ({
  squadName,
  sprintName,
  sprintGoal,
  chartElements, // Array of HTML elements for charts
  issues, // Array of formatted issues
  metricsData, // Metrics data for summary
  squadId, // Squad ID to get developer metrics
  sprintId // Sprint ID to get developer metrics
}) => {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - (margin * 2);
  let yPosition = margin;

  // Function to add a new page if necessary
  const checkPageBreak = (requiredHeight) => {
    if (yPosition + requiredHeight > pageHeight - margin) {
      doc.addPage();
      yPosition = margin;
      return true;
    }
    return false;
  };

  // COVER PAGE
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
  doc.setTextColor(100, 100, 100); // Gray
  doc.text(new Date().toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  }), pageWidth / 2, pageHeight / 2 + 35, { align: 'center' });

  // New page for content
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
        // Wait a bit for chart to render completely
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const imgData = await elementToImage(chartElement, {
          backgroundColor: '#0a0e17',
          scale: 2,
          width: chartElement.offsetWidth,
          height: chartElement.offsetHeight
        });
        
        // Calculate dimensions maintaining proportion
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
        console.error('[PDF_GENERATOR] Error converting chart to image:', error);
        doc.setTextColor(255, 100, 100);
        doc.setFontSize(10);
        doc.text(`Error generating chart ${i + 1}`, margin, yPosition);
        yPosition += 20;
      }
    }
  }

  // ISSUES TABLE
  if (issues && issues.length > 0) {
    console.log(`[PDF_GENERATOR] Generating table with ${issues.length} issues`);
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

    // Helper function to draw table headers
    const drawTableHeader = () => {
      // Top line of header
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.5);
      doc.line(margin, yPosition, margin + contentWidth, yPosition);
      
      doc.setTextColor(0, 0, 0); // Black
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
      
      // Bottom line of header
      yPosition += 8;
      doc.line(margin, yPosition, margin + contentWidth, yPosition);
      yPosition += 5;
    };

    // Draw initial headers
    drawTableHeader();

    // Table rows
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(0, 0, 0); // Negro
    
    issues.forEach((issue, index) => {
      // Log for debugging
      if (index === 0 || index === Math.floor(issues.length / 2) || index === issues.length - 1) {
        console.log(`[PDF_GENERATOR] Processing issue ${index + 1}/${issues.length}: ${issue.key}`);
      }
      
      // Calculate height needed for this row (may have multiple lines)
      const summaryLines = doc.splitTextToSize(issue.summary || '', colWidths.summary - 2);
      const assigneeLines = doc.splitTextToSize(issue.assignee || 'Unassigned', colWidths.assignee - 2);
      const maxLines = Math.max(summaryLines.length, assigneeLines.length, 1);
      const lineHeight = 4;
      const rowHeight = maxLines * lineHeight + 4;
      
      // Check if we need a new page (including space for header if necessary)
      if (yPosition + rowHeight + 10 > pageHeight - margin) {
        doc.addPage();
        yPosition = margin;
        // Redraw headers on new page
        drawTableHeader();
      }
      
      // Render each field with black text
      let currentY = yPosition + 5;
      
      // Type
      doc.setTextColor(0, 0, 0);
      doc.text(issue.issueType || 'Task', margin + 2, currentY);
      
      // Key
      doc.setTextColor(0, 0, 0);
      doc.text(issue.key || '', margin + 2 + colWidths.type, currentY);
      
      // Assignee (may have multiple lines)
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
      
      // Summary (may have multiple lines)
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
      
      // Separator line between rows
      yPosition += rowHeight;
      doc.setDrawColor(200, 200, 200); // Light gray for lines
      doc.setLineWidth(0.2);
      doc.line(margin, yPosition, margin + contentWidth, yPosition);
      yPosition += 2;
    });
  } else {
    // If no issues, show message
    checkPageBreak(20);
    doc.setTextColor(150, 150, 150);
    doc.setFontSize(10);
    doc.text('No Jira tickets found for the selected squad and sprint.', margin, yPosition);
  }

  // DEVELOPER METRICS
  if (squadId && sprintId) {
    try {
      console.log('[PDF_GENERATOR] Getting developer metrics...');
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
          
          // Check if we need a new page
          const sectionHeight = 80; // Estimated height per developer
          if (yPosition + sectionHeight > pageHeight - margin) {
            doc.addPage();
            yPosition = margin;
          }

          // Developer name
          doc.setTextColor(0, 0, 0);
          doc.setFontSize(12);
          doc.setFont('helvetica', 'bold');
          doc.text(developer.display_name || developer.email || 'Unknown Developer', margin, yPosition);
          yPosition += 8;

          // Main metrics
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

          // Status breakdown
          if (statusBreakdown && Object.keys(statusBreakdown).length > 0) {
            doc.setFontSize(9);
            doc.setFont('helvetica', 'bold');
            doc.text('Status Breakdown:', margin, yPosition);
            yPosition += 5;
            
            doc.setFont('helvetica', 'normal');
            const statusEntries = Object.entries(statusBreakdown).slice(0, 5); // Limit to 5 main statuses
            statusEntries.forEach(([status, data]) => {
              doc.text(`${status}: ${data.count} (${data.percentage}%)`, margin + 5, yPosition);
              yPosition += 4;
            });
          }

          yPosition += 5;
          
          // Separator line
          doc.setDrawColor(200, 200, 200);
          doc.setLineWidth(0.2);
          doc.line(margin, yPosition, margin + contentWidth, yPosition);
          yPosition += 5;
        });
      }
    } catch (error) {
      console.error('[PDF_GENERATOR] Error adding developer metrics:', error);
      // Continue without developer metrics if there's an error
    }
  }

  // Save the PDF
  const fileName = `Project_Metrics_${squadName?.replace(/\s+/g, '_') || 'Unknown'}_${sprintName?.replace(/\s+/g, '_') || 'Unknown'}_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(fileName);
};

