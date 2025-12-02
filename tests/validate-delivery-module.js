/**
 * Validation Script for DeliveryRoadmapData Module
 * Run this in browser console to validate the module is properly isolated
 */

(function() {
    console.log('🧪 Testing DeliveryRoadmapData Module Isolation...\n');

    // Test 1: Module exists and has correct structure
    console.log('Test 1: Module Structure');
    const hasSheetUrls = typeof DeliveryRoadmapData !== 'undefined' && 
                         DeliveryRoadmapData.SHEET_URLS !== undefined;
    const hasMockData = typeof DeliveryRoadmapData !== 'undefined' && 
                       DeliveryRoadmapData.MOCK_DATA !== undefined;
    const hasParseCSV = typeof DeliveryRoadmapData !== 'undefined' && 
                       typeof DeliveryRoadmapData.parseCSV === 'function';
    const hasLoad = typeof DeliveryRoadmapData !== 'undefined' && 
                   typeof DeliveryRoadmapData.load === 'function';
    
    console.log('  ✓ SHEET_URLS exists:', hasSheetUrls);
    console.log('  ✓ MOCK_DATA exists:', hasMockData);
    console.log('  ✓ parseCSV function exists:', hasParseCSV);
    console.log('  ✓ load function exists:', hasLoad);
    
    // Test 2: Sheet URLs are correct (Delivery only)
    console.log('\nTest 2: Sheet URLs (Delivery Roadmap only)');
    if (DeliveryRoadmapData && DeliveryRoadmapData.SHEET_URLS) {
        const urls = DeliveryRoadmapData.SHEET_URLS;
        const hasProjectUrl = urls.project && urls.project.includes('1503252593');
        const hasAllocationUrl = urls.allocation && urls.allocation.includes('1194298779');
        const noProductUrls = !urls.productInitiatives && !urls.productBugRelease;
        
        console.log('  ✓ Project URL correct:', hasProjectUrl);
        console.log('  ✓ Allocation URL correct:', hasAllocationUrl);
        console.log('  ✓ No Product URLs mixed:', noProductUrls);
    }
    
    // Test 3: Mock data structure
    console.log('\nTest 3: Mock Data Structure');
    if (DeliveryRoadmapData && DeliveryRoadmapData.MOCK_DATA) {
        const mock = DeliveryRoadmapData.MOCK_DATA;
        const hasProjects = Array.isArray(mock.projects) && mock.projects.length > 0;
        const hasAllocation = Array.isArray(mock.allocation) && mock.allocation.length > 0;
        const projectsHaveSquad = mock.projects.every(p => p.squad && p.initiative);
        const allocationHasDev = mock.allocation.every(a => a.dev && a.percentage !== undefined);
        
        console.log('  ✓ Projects array exists:', hasProjects, `(${mock.projects.length} items)`);
        console.log('  ✓ Allocation array exists:', hasAllocation, `(${mock.allocation.length} items)`);
        console.log('  ✓ Projects have squad/initiative:', projectsHaveSquad);
        console.log('  ✓ Allocation has dev/percentage:', allocationHasDev);
    }
    
    // Test 4: Parse CSV function
    console.log('\nTest 4: Parse CSV Function');
    if (DeliveryRoadmapData && DeliveryRoadmapData.parseCSV) {
        const testCSV = `Squad,Initiatives,Start,Current Status,Estimated Delivery,SPI,Team Allocation,Comments,Scope
Core Infrastructure,Test Project,2024-01-01,50,2024-06-30,1.0,2.5,Test comment,Test scope`;
        
        const result = DeliveryRoadmapData.parseCSV(testCSV, 'project');
        const parsed = result.length > 0 && result[0].squad === 'Core Infrastructure';
        const statusIsNumber = result.length > 0 && typeof result[0].status === 'number';
        
        console.log('  ✓ Can parse CSV:', parsed);
        console.log('  ✓ Status is numeric:', statusIsNumber);
        console.log('  ✓ Parsed result:', result);
    }
    
    // Test 5: Isolation check - no global pollution
    console.log('\nTest 5: Isolation Check');
    const noGlobalPollution = typeof MOCK_PROJECT_DATA === 'undefined' && 
                             typeof MOCK_ALLOCATION_DATA === 'undefined' &&
                             typeof SHEET_URLS === 'undefined';
    console.log('  ✓ No global variables leaked:', noGlobalPollution);
    
    console.log('\n✅ Module Isolation Tests Complete!');
})();

