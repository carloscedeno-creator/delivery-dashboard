/**
 * Validation Script for ProductRoadmapData Module
 * Run this in browser console to validate the module is properly isolated
 */

(function() {
    console.log('🧪 Testing ProductRoadmapData Module Isolation...\n');

    // Test 1: Module exists and has correct structure
    console.log('Test 1: Module Structure');
    const hasSheetUrls = typeof ProductRoadmapData !== 'undefined' && 
                         ProductRoadmapData.SHEET_URLS !== undefined;
    const hasMockData = typeof ProductRoadmapData !== 'undefined' && 
                       ProductRoadmapData.MOCK_DATA !== undefined;
    const hasParseCSV = typeof ProductRoadmapData !== 'undefined' && 
                       typeof ProductRoadmapData.parseCSV === 'function';
    const hasLoad = typeof ProductRoadmapData !== 'undefined' && 
                   typeof ProductRoadmapData.load === 'function';
    
    console.log('  ✓ SHEET_URLS exists:', hasSheetUrls);
    console.log('  ✓ MOCK_DATA exists:', hasMockData);
    console.log('  ✓ parseCSV function exists:', hasParseCSV);
    console.log('  ✓ load function exists:', hasLoad);
    
    // Test 2: Sheet URLs are correct (Product only)
    console.log('\nTest 2: Sheet URLs (Product Roadmap only)');
    if (ProductRoadmapData && ProductRoadmapData.SHEET_URLS) {
        const urls = ProductRoadmapData.SHEET_URLS;
        const hasInitiativesUrl = urls.initiatives && urls.initiatives.includes('933125518');
        const hasBugReleaseUrl = urls.bugRelease && urls.bugRelease.includes('1707343419');
        const noDeliveryUrls = !urls.project && !urls.allocation;
        
        console.log('  ✓ Initiatives URL correct:', hasInitiativesUrl);
        console.log('  ✓ Bug Release URL correct:', hasBugReleaseUrl);
        console.log('  ✓ No Delivery URLs mixed:', noDeliveryUrls);
    }
    
    // Test 3: Mock data structure
    console.log('\nTest 3: Mock Data Structure');
    if (ProductRoadmapData && ProductRoadmapData.MOCK_DATA) {
        const mock = ProductRoadmapData.MOCK_DATA;
        const hasInitiatives = Array.isArray(mock.initiatives) && mock.initiatives.length > 0;
        const hasBugRelease = Array.isArray(mock.bugRelease) && mock.bugRelease.length > 0;
        const initiativesHaveFields = mock.initiatives.every(i => i.initiative && (i.ba !== undefined || i.designer !== undefined));
        const bugReleaseHasFields = mock.bugRelease.every(b => b.type || b.initiative);
        
        console.log('  ✓ Initiatives array exists:', hasInitiatives, `(${mock.initiatives.length} items)`);
        console.log('  ✓ Bug Release array exists:', hasBugRelease, `(${mock.bugRelease.length} items)`);
        console.log('  ✓ Initiatives have required fields:', initiativesHaveFields);
        console.log('  ✓ Bug Release has required fields:', bugReleaseHasFields);
    }
    
    // Test 4: Parse CSV function
    console.log('\nTest 4: Parse CSV Function');
    if (ProductRoadmapData && ProductRoadmapData.parseCSV) {
        const testCSVInitiatives = `Initiative,BA,Designer,Team,Quarter,Status,Effort (days),Completion (%)
Test Initiative,Sarah Johnson,Mike Chen,Mobile,Q1 2024,Done,45,100`;
        
        const resultInitiatives = ProductRoadmapData.parseCSV(testCSVInitiatives, 'initiatives');
        const parsedInit = resultInitiatives.length > 0 && resultInitiatives[0].initiative === 'Test Initiative';
        const effortIsNumber = resultInitiatives.length > 0 && typeof resultInitiatives[0].effort === 'number';
        const completionIsNumber = resultInitiatives.length > 0 && typeof resultInitiatives[0].completion === 'number';
        
        console.log('  ✓ Can parse Initiatives CSV:', parsedInit);
        console.log('  ✓ Effort is numeric:', effortIsNumber);
        console.log('  ✓ Completion is numeric:', completionIsNumber);
        
        const testCSVBugRelease = `Type,Priority,Release,Initiative,Status
Bug,High,v2.1.0,Mobile App Redesign,Open`;
        
        const resultBugRelease = ProductRoadmapData.parseCSV(testCSVBugRelease, 'bugRelease');
        const parsedBug = resultBugRelease.length > 0 && resultBugRelease[0].type === 'Bug';
        
        console.log('  ✓ Can parse Bug Release CSV:', parsedBug);
        console.log('  ✓ Parsed results:', { initiatives: resultInitiatives, bugRelease: resultBugRelease });
    }
    
    // Test 5: Isolation check - no global pollution
    console.log('\nTest 5: Isolation Check');
    const noGlobalPollution = typeof MOCK_PRODUCT_INITIATIVES === 'undefined' && 
                             typeof MOCK_PRODUCT_BUG_RELEASE === 'undefined' &&
                             typeof PRODUCT_SHEET_URLS === 'undefined';
    console.log('  ✓ No global variables leaked:', noGlobalPollution);
    
    // Test 6: Verify separation from Delivery module
    console.log('\nTest 6: Separation from Delivery Module');
    const deliveryExists = typeof DeliveryRoadmapData !== 'undefined';
    const productHasNoDeliveryData = ProductRoadmapData && 
                                    !ProductRoadmapData.SHEET_URLS.project &&
                                    !ProductRoadmapData.MOCK_DATA.projects;
    const deliveryHasNoProductData = DeliveryRoadmapData &&
                                    !DeliveryRoadmapData.SHEET_URLS.initiatives &&
                                    !DeliveryRoadmapData.MOCK_DATA.initiatives;
    
    console.log('  ✓ Delivery module exists:', deliveryExists);
    console.log('  ✓ Product has no Delivery data:', productHasNoDeliveryData);
    console.log('  ✓ Delivery has no Product data:', deliveryHasNoProductData);
    
    console.log('\n✅ Product Module Isolation Tests Complete!');
})();

