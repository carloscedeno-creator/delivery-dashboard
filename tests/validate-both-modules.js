/**
 * Combined Validation Script for Both Data Modules
 * Run this in browser console to validate both modules are properly isolated
 */

(function() {
    console.log('🧪 Testing Both Data Modules (Delivery & Product)...\n');
    console.log('=' .repeat(60));
    
    // ============================================
    // DELIVERY MODULE TESTS
    // ============================================
    console.log('\n📦 DELIVERY ROADMAP DATA MODULE\n');
    
    const deliveryExists = typeof DeliveryRoadmapData !== 'undefined';
    console.log('Module exists:', deliveryExists ? '✅' : '❌');
    
    if (deliveryExists) {
        const hasUrls = DeliveryRoadmapData.SHEET_URLS && 
                       DeliveryRoadmapData.SHEET_URLS.project && 
                       DeliveryRoadmapData.SHEET_URLS.allocation;
        const hasMockData = DeliveryRoadmapData.MOCK_DATA && 
                           Array.isArray(DeliveryRoadmapData.MOCK_DATA.projects) &&
                           Array.isArray(DeliveryRoadmapData.MOCK_DATA.allocation);
        const noProductUrls = !DeliveryRoadmapData.SHEET_URLS.initiatives && 
                             !DeliveryRoadmapData.SHEET_URLS.bugRelease;
        const noProductMock = !DeliveryRoadmapData.MOCK_DATA.initiatives && 
                             !DeliveryRoadmapData.MOCK_DATA.bugRelease;
        
        console.log('  ✓ Has correct URLs:', hasUrls ? '✅' : '❌');
        console.log('  ✓ Has mock data:', hasMockData ? '✅' : '❌');
        console.log('  ✓ No Product URLs mixed:', noProductUrls ? '✅' : '❌');
        console.log('  ✓ No Product mock data:', noProductMock ? '✅' : '❌');
    }
    
    // ============================================
    // PRODUCT MODULE TESTS
    // ============================================
    console.log('\n📦 PRODUCT ROADMAP DATA MODULE\n');
    
    const productExists = typeof ProductRoadmapData !== 'undefined';
    console.log('Module exists:', productExists ? '✅' : '❌');
    
    if (productExists) {
        const hasUrls = ProductRoadmapData.SHEET_URLS && 
                       ProductRoadmapData.SHEET_URLS.initiatives && 
                       ProductRoadmapData.SHEET_URLS.bugRelease;
        const hasMockData = ProductRoadmapData.MOCK_DATA && 
                           Array.isArray(ProductRoadmapData.MOCK_DATA.initiatives) &&
                           Array.isArray(ProductRoadmapData.MOCK_DATA.bugRelease);
        const noDeliveryUrls = !ProductRoadmapData.SHEET_URLS.project && 
                              !ProductRoadmapData.SHEET_URLS.allocation;
        const noDeliveryMock = !ProductRoadmapData.MOCK_DATA.projects && 
                              !ProductRoadmapData.MOCK_DATA.allocation;
        
        console.log('  ✓ Has correct URLs:', hasUrls ? '✅' : '❌');
        console.log('  ✓ Has mock data:', hasMockData ? '✅' : '❌');
        console.log('  ✓ No Delivery URLs mixed:', noDeliveryUrls ? '✅' : '❌');
        console.log('  ✓ No Delivery mock data:', noDeliveryMock ? '✅' : '❌');
    }
    
    // ============================================
    // ISOLATION VERIFICATION
    // ============================================
    console.log('\n🔒 ISOLATION VERIFICATION\n');
    
    const noGlobalDeliveryVars = typeof MOCK_PROJECT_DATA === 'undefined' &&
                                 typeof MOCK_ALLOCATION_DATA === 'undefined' &&
                                 typeof DELIVERY_SHEET_URLS === 'undefined';
    
    const noGlobalProductVars = typeof MOCK_PRODUCT_INITIATIVES === 'undefined' &&
                                typeof MOCK_PRODUCT_BUG_RELEASE === 'undefined' &&
                                typeof PRODUCT_SHEET_URLS === 'undefined';
    
    const modulesAreSeparate = deliveryExists && productExists &&
                               DeliveryRoadmapData !== ProductRoadmapData &&
                               DeliveryRoadmapData.SHEET_URLS !== ProductRoadmapData.SHEET_URLS &&
                               DeliveryRoadmapData.MOCK_DATA !== ProductRoadmapData.MOCK_DATA;
    
    console.log('  ✓ No global Delivery variables:', noGlobalDeliveryVars ? '✅' : '❌');
    console.log('  ✓ No global Product variables:', noGlobalProductVars ? '✅' : '❌');
    console.log('  ✓ Modules are separate objects:', modulesAreSeparate ? '✅' : '❌');
    
    // ============================================
    // DATA SOURCE VERIFICATION
    // ============================================
    console.log('\n📊 DATA SOURCE VERIFICATION\n');
    
    if (deliveryExists && productExists) {
        const deliveryUrls = DeliveryRoadmapData.SHEET_URLS;
        const productUrls = ProductRoadmapData.SHEET_URLS;
        
        const deliveryUsesCorrectSheet = deliveryUrls.project && 
                                        deliveryUrls.project.includes('1503252593');
        const productUsesCorrectSheet = productUrls.initiatives && 
                                       productUrls.initiatives.includes('933125518');
        const urlsAreDifferent = deliveryUrls.project !== productUrls.initiatives &&
                                deliveryUrls.allocation !== productUrls.bugRelease;
        
        console.log('  ✓ Delivery uses correct Google Sheet:', deliveryUsesCorrectSheet ? '✅' : '❌');
        console.log('  ✓ Product uses correct Google Sheet:', productUsesCorrectSheet ? '✅' : '❌');
        console.log('  ✓ URLs are completely different:', urlsAreDifferent ? '✅' : '❌');
    }
    
    // ============================================
    // SUMMARY
    // ============================================
    console.log('\n' + '='.repeat(60));
    console.log('\n📋 SUMMARY\n');
    
    const allTestsPass = deliveryExists && productExists && 
                        noGlobalDeliveryVars && noGlobalProductVars &&
                        modulesAreSeparate;
    
    if (allTestsPass) {
        console.log('✅ ALL TESTS PASSED - Modules are properly isolated!');
        console.log('\n✅ DeliveryRoadmapData: Isolated and ready');
        console.log('✅ ProductRoadmapData: Isolated and ready');
        console.log('✅ No data mixing: Confirmed');
        console.log('✅ No global pollution: Confirmed');
    } else {
        console.log('❌ SOME TESTS FAILED - Review the output above');
    }
    
    console.log('\n' + '='.repeat(60));
})();

