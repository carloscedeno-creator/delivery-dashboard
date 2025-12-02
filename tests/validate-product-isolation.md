# Product Roadmap Data Module - Isolation Validation Checklist

## Purpose
This document provides a manual checklist to verify that the `ProductRoadmapData` module is completely isolated from the `DeliveryRoadmapData` module and follows the same isolation principles.

## Pre-Validation Steps

1. Open `index.html` in a browser
2. Open browser DevTools (F12)
3. Go to the Console tab

## Validation Checklist

### ✅ Module Structure
- [ ] `ProductRoadmapData` object exists globally
- [ ] Has `SHEET_URLS` property with `initiatives` and `bugRelease` URLs
- [ ] Has `MOCK_DATA` property with `initiatives` and `bugRelease` arrays
- [ ] Has `parseCSV` function
- [ ] Has `load` function

### ✅ Sheet URLs (Product Only)
- [ ] `SHEET_URLS.initiatives` contains Google Sheets URL with gid=933125518
- [ ] `SHEET_URLS.bugRelease` contains Google Sheets URL with gid=1707343419
- [ ] Does NOT have `project` or `allocation` URLs (those belong to Delivery)
- [ ] URLs are different from Delivery module URLs

### ✅ Mock Data Structure
- [ ] `MOCK_DATA.initiatives` is an array with at least 2 items
- [ ] Each initiative has: `initiative`, `ba`, `designer`, `team`, `quarter`, `status`, `effort`, `completion`
- [ ] `MOCK_DATA.bugRelease` is an array with at least 2 items
- [ ] Each bug/release has: `type`, `priority`, `release`, `initiative`, `status`
- [ ] Does NOT have `projects` or `allocation` arrays (those belong to Delivery)

### ✅ Parse CSV Function
- [ ] Can parse Initiatives CSV format correctly
- [ ] Parses numeric fields (`effort`, `completion`) as numbers
- [ ] Can parse Bug Release CSV format correctly
- [ ] Returns filtered arrays (removes null entries)
- [ ] Uses `this` correctly within the module

### ✅ Load Function
- [ ] Uses `this.SHEET_URLS` (not external URLs)
- [ ] Uses `this.MOCK_DATA` (not external mock data)
- [ ] Uses `this.parseCSV` (not external parse function)
- [ ] Returns object with `initiatives` and `bugRelease` properties
- [ ] Falls back to mock data on error
- [ ] Logs with `[PRODUCT]` prefix for debugging

### ✅ Isolation Checks
- [ ] No global variables like `MOCK_PRODUCT_INITIATIVES` or `PRODUCT_SHEET_URLS` exist
- [ ] Module does not access `DeliveryRoadmapData` internals
- [ ] Delivery module does not access `ProductRoadmapData` internals
- [ ] Both modules can coexist without conflicts

### ✅ Data Separation
- [ ] Product module URLs are completely different from Delivery module URLs
- [ ] Product mock data structure is different from Delivery mock data structure
- [ ] CSV parsing logic is specific to Product data fields
- [ ] No shared constants or helper functions (except CORS_PROXY)

## Quick Validation Script

Run this in the browser console:

```javascript
// Copy and paste tests/validate-product-module.js into console
```

## Expected Results

All tests should pass ✅, indicating:
- Module is properly structured
- Data sources are correct (Product Google Sheets)
- Mock data is available
- Complete isolation from Delivery module
- No global variable pollution

## Notes

- The `CORS_PROXY` constant is intentionally shared between modules (it's a configuration, not data)
- Each module should be independently testable
- Changes to one module should never affect the other

