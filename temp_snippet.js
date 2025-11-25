            const SHEET_URLS = {
                project: 'https://docs.google.com/spreadsheets/d/1L98AGoj2jd-oWuxBZ_W0nVFZpwd3zr38jVW5iGhc0s8/export?format=csv&gid=1503252593',
                allocation: 'https://docs.google.com/spreadsheets/d/1L98AGoj2jd-oWuxBZ_W0nVFZpwd3zr38jVW5iGhc0s8/export?format=csv&gid=1194298779'
            };

            // Multiple CORS Proxies with fallback
            const CORS_PROXIES = [
                'https://corsproxy.io/?',
                'https://api.allorigins.win/raw?url=',
                'https://api.codetabs.com/v1/proxy?quest=',
                '' // Try direct access as last resort
            ];

            // Mock Data for Fallback
            const MOCK_PROJECT_DATA = [
                { squad: 'Core Infrastructure', initiative: 'Cloud Migration', start: '2024-01-01', status: 85, delivery: '2024-06-30', spi: 1.1, allocation: 4.5, comments: 'Ahead of schedule', scope: 'Migrate legacy systems to AWS', dev: 'Luis Mays', percentage: 100 },
                { squad: 'Core Infrastructure', initiative: 'Database Optimization', start: '2024-02-15', status: 45, delivery: '2024-08-15', spi: 0.9, allocation: 3.0, comments: 'Slight delays due to complexity', scope: 'Optimize SQL queries', dev: 'Mauricio Leal', percentage: 80 },
                { squad: 'Integration', initiative: 'API Gateway V2', start: '2024-03-01', status: 30, delivery: '2024-09-30', spi: 0.95, allocation: 4.0, comments: 'On track', scope: 'New API Gateway implementation', dev: 'Arslan Arif', percentage: 100 },
                { squad: 'Product Growth', initiative: 'User Onboarding Flow', start: '2024-04-01', status: 15, delivery: '2024-07-31', spi: 0.7, allocation: 2.5, comments: 'Resource constraints', scope: 'Revamp onboarding experience', dev: 'Abdel Beltran', percentage: 50 },
                { squad: 'Mobile', initiative: 'iOS App Redesign', start: '2024-01-15', status: 95, delivery: '2024-05-15', spi: 1.2, allocation: 5.0, comments: 'Ready for release', scope: 'Complete UI overhaul', dev: 'Himani', percentage: 100 }
            ];

            const MOCK_ALLOCATION_DATA = [
                { squad: 'Core Infrastructure', initiative: 'Cloud Migration', dev: 'Luis Mays', percentage: 100 },
                { squad: 'Core Infrastructure', initiative: 'Database Optimization', dev: 'Mauricio Leal', percentage: 80 },
                { squad: 'Integration', initiative: 'API Gateway V2', dev: 'Arslan Arif', percentage: 100 },
                { squad: 'Product Growth', initiative: 'User Onboarding Flow', dev: 'Abdel Beltran', percentage: 50 },
                { squad: 'Mobile', initiative: 'iOS App Redesign', dev: 'Himani', percentage: 100 }
            ];

            const parseCSV = (text, type) => {
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

                const headers = rows[0];
                return rows.slice(1).map(values => {
                    const entry = {};
                    headers.forEach((h, i) => {
                        let val = values[i]?.replace(/^"|"$/g, '').trim();
                        if (type === 'project') {
                            if (h === 'Current Status') val = parseFloat(val) || 0;
                            if (h === 'SPI') val = parseFloat(val) || 0;
                            if (h === 'Team Allocation') val = parseFloat(val) || 0;
                        } else if (type === 'allocation') {
                            if (h === 'Percentage') val = parseFloat(val.replace('%', '')) || 0;
                        }
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
                    });
                    return entry;
                }).filter(entry => entry.squad && entry.initiative);
            };
