/**
 * Validation Script for DeliveryRoadmapData Module
 * Run this in browser console after loading index.html
 */

console.log('🧪 === DELIVERY ROADMAP DATA MODULE VALIDATION ===\n');

// Test 1: Module exists
console.log('Test 1: Module Exists');
try {
    if (typeof DeliveryRoadmapData === 'undefined') {
        throw new Error('DeliveryRoadmapData module not found');
    }
    console.log('✅ PASS: DeliveryRoadmapData module exists');
} catch (error) {
    console.error('❌ FAIL:', error.message);
}

// Test 2: Module Structure
console.log('\nTest 2: Module Structure');
const structure = {
    'SHEET_URLS': typeof DeliveryRoadmapData?.SHEET_URLS !== 'undefined',
    'MOCK_DATA': typeof DeliveryRoadmapData?.MOCK_DATA !== 'undefined',
    'parseCSV': typeof DeliveryRoadmapData?.parseCSV === 'function',
    'load': typeof DeliveryRoadmapData?.load === 'function'
};

Object.entries(structure).forEach(([key, exists]) => {
    console.log(`${exists ? '✅' : '❌'} ${key}: ${exists ? 'EXISTS' : 'MISSING'}`);
});

// Test 3: Sheet URLs (Delivery only - no Product)
console.log('\nTest 3: Sheet URLs (Delivery Roadmap Only)');
if (DeliveryRoadmapData?.SHEET_URLS) {
    const urls = DeliveryRoadmapData.SHEET_URLS;
    const tests = [
        ['project URL exists', !!urls.project],
        ['project URL has correct gid', urls.project?.includes('1503252593')],
        ['allocation URL exists', !!urls.allocation],
        ['allocation URL has correct gid', urls.allocation?.includes('1194298779')],
        ['NO productInitiatives URL', !urls.productInitiatives],
        ['NO productBugRelease URL', !urls.productBugRelease],
        ['URLs point to Delivery spreadsheet', urls.project?.includes('1L98AGoj2jd-oWuxBZ_W0nVFZpwd3zr38jVW5iGhc0s8')]
    ];
    
    tests.forEach(([test, result]) => {
        console.log(`${result ? '✅' : '❌'} ${test}`);
    });
}

// Test 4: Mock Data Structure
console.log('\nTest 4: Mock Data Structure');
if (DeliveryRoadmapData?.MOCK_DATA) {
    const mock = DeliveryRoadmapData.MOCK_DATA;
    const tests = [
        ['projects is array', Array.isArray(mock.projects)],
        ['projects has items', mock.projects?.length > 0],
        ['allocation is array', Array.isArray(mock.allocation)],
        ['allocation has items', mock.allocation?.length > 0],
        ['projects have squad', mock.projects?.every(p => p.squad)],
        ['projects have initiative', mock.projects?.every(p => p.initiative)],
        ['allocation has dev', mock.allocation?.every(a => a.dev)],
        ['allocation has percentage', mock.allocation?.every(a => a.percentage !== undefined)],
        ['NO product fields in projects', !mock.projects?.some(p => p.ba || p.designer || p.quarter)],
        ['NO product fields in allocation', !mock.allocation?.some(a => a.type || a.priority)]
    ];
    
    tests.forEach(([test, result]) => {
        console.log(`${result ? '✅' : '❌'} ${test}`);
    });
}

// Test 5: Parse CSV Function
console.log('\nTest 5: Parse CSV Function');
if (DeliveryRoadmapData?.parseCSV) {
    // Test project parsing
    const projectCSV = `Squad,Initiatives,Start,Current Status,Estimated Delivery,SPI,Team Allocation,Comments,Scope
Core Infrastructure,Test Project,2024-01-01,75,2024-06-30,1.1,3.0,Test comment,Test scope`;
    
    const projectResult = DeliveryRoadmapData.parseCSV(projectCSV, 'project');
    const projectTests = [
        ['parses project CSV', projectResult.length > 0],
        ['extracts squad', projectResult[0]?.squad === 'Core Infrastructure'],
        ['extracts initiative', projectResult[0]?.initiative === 'Test Project'],
        ['status is number', typeof projectResult[0]?.status === 'number'],
        ['status is 75', projectResult[0]?.status === 75],
        ['spi is number', typeof projectResult[0]?.spi === 'number']
    ];
    
    projectTests.forEach(([test, result]) => {
        console.log(`${result ? '✅' : '❌'} ${test}`);
    });
    
    // Test allocation parsing
    const allocationCSV = `Squad,Initiatives,Dev,Percentage
Core Infrastructure,Test Project,John Doe,85%`;
    
    const allocationResult = DeliveryRoadmapData.parseCSV(allocationCSV, 'allocation');
    const allocationTests = [
        ['parses allocation CSV', allocationResult.length > 0],
        ['extracts dev', allocationResult[0]?.dev === 'John Doe'],
        ['percentage is number', typeof allocationResult[0]?.percentage === 'number'],
        ['percentage is 85', allocationResult[0]?.percentage === 85]
    ];
    
    allocationTests.forEach(([test, result]) => {
        console.log(`${result ? '✅' : '❌'} ${test}`);
    });
}

// Test 6: Isolation Check
console.log('\nTest 6: Isolation Check (No Global Pollution)');
const isolationTests = [
    ['NO global MOCK_PROJECT_DATA', typeof window.MOCK_PROJECT_DATA === 'undefined'],
    ['NO global MOCK_ALLOCATION_DATA', typeof window.MOCK_ALLOCATION_DATA === 'undefined'],
    ['NO global SHEET_URLS', typeof window.SHEET_URLS === 'undefined'],
    ['Module is isolated', typeof DeliveryRoadmapData !== 'undefined']
];

isolationTests.forEach(([test, result]) => {
    console.log(`${result ? '✅' : '❌'} ${test}`);
});

// Test 7: Load Function Signature
console.log('\nTest 7: Load Function');
if (DeliveryRoadmapData?.load) {
    console.log('✅ Load function exists');
    console.log('   Type:', typeof DeliveryRoadmapData.load);
    console.log('   Is async:', DeliveryRoadmapData.load.constructor.name === 'AsyncFunction' || 
                               DeliveryRoadmapData.load.toString().includes('async'));
} else {
    console.log('❌ Load function missing');
}

console.log('\n✅ === VALIDATION COMPLETE ===');
console.log('💡 Tip: Run DeliveryRoadmapData.load(CORS_PROXY) to test data loading');

