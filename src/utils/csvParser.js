export const parseCSV = (text, type) => {
    const rows = [];
    let currentRow = [];
    let currentVal = '';
    let inQuotes = false;

    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        const nextChar = text[i + 1];

        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            currentRow.push(currentVal.trim());
            currentVal = '';
        } else if ((char === '\n' || char === '\r') && !inQuotes) {
            if (char === '\r' && nextChar === '\n') i++;
            if (currentRow.length > 0 || currentVal) {
                currentRow.push(currentVal.trim());
                rows.push(currentRow);
            }
            currentRow = [];
            currentVal = '';
        } else {
            currentVal += char;
        }
    }
    if (currentRow.length > 0 || currentVal) {
        currentRow.push(currentVal.trim());
        rows.push(currentRow);
    }

    // Filter out empty rows
    const nonEmptyRows = rows.filter(row => row.some(cell => cell.trim() !== ''));

    if (nonEmptyRows.length === 0) {
        console.warn(`[${type.toUpperCase()}] No data found in CSV`);
        return [];
    }

    // Find the header row (first row with non-empty cells)
    const headers = nonEmptyRows[0].map(h => h.trim()); // Trim whitespace from headers
    console.log(`[${type.toUpperCase()}] Headers found:`, headers);

    return nonEmptyRows.slice(1).map(values => {
        const entry = {};
        headers.forEach((h, i) => {
            let val = values[i]?.replace(/^"|"$/g, '').trim();

            // Parse numeric values based on type
            if (type === 'project') {
                if (h === 'Current Status') val = parseFloat(val) || 0;
                if (h === 'SPI') val = parseFloat(val) || 0;
                if (h === 'Team Allocation') val = parseFloat(val) || 0;
            } else if (type === 'allocation') {
                if (h === 'Percentage') val = parseFloat(val.replace('%', '')) || 0;
            } else if (type === 'productInitiatives') {
                if (h === 'Effort (days)') val = parseFloat(val) || 0;
                if (h === 'Completion (%)') val = parseFloat(val) || 0;
            }

            // Delivery roadmap fields
            if (h === 'Squad') entry.squad = val;
            if (h === 'Initiatives') entry.initiative = val;
            if (h === 'Start') entry.start = val;
            if (h === 'Current Status') entry.status = val;
            if (h === 'Estimated Delivery') entry.delivery = val;
            if (h === 'SPI') entry.spi = val;
            if (h === 'Team Allocation') entry.allocation = val;
            if (h === 'Comments') entry.comments = val;
            if (h === 'Scope') entry.scope = val;
            if (h === 'Dev') entry.dev = val;
            if (h === 'Percentage') entry.percentage = val;

            // Product roadmap fields
            if (h === 'Initiative') entry.initiative = val;
            if (h === 'BA') entry.ba = val;
            if (h === 'Designer') entry.designer = val;
            if (h === 'Team') entry.team = val;
            if (h === 'Quarter') entry.quarter = val;
            if (h === 'Status') entry.status = val;
            if (h === 'Effort (days)') entry.effort = val;
            if (h === 'Completion (%)') entry.completion = val;
            if (h === 'Start Date') entry.startDate = val;
            if (h === 'Expected Date') entry.expectedDate = val;

            // Bug/Release fields
            if (h === 'Type') entry.type = val;
            if (h === 'Priority') entry.priority = val;
            if (h === 'Release') entry.release = val;
        });
        return entry;
    }).filter(entry => {
        // Filter based on type
        if (type === 'project' || type === 'allocation') {
            return entry.squad && entry.initiative;
        } else if (type === 'productInitiatives') {
            return entry.initiative;
        } else if (type === 'productBugRelease') {
            return entry.initiative || entry.type;
        }
        return true;
    });
};
