# DeliveryRoadmapData Module - Validation Checklist

## ✅ Isolation Tests

### 1. Module Structure
- [ ] `DeliveryRoadmapData` object exists
- [ ] `DeliveryRoadmapData.SHEET_URLS` exists
- [ ] `DeliveryRoadmapData.MOCK_DATA` exists
- [ ] `DeliveryRoadmapData.parseCSV` is a function
- [ ] `DeliveryRoadmapData.load` is a function

### 2. Sheet URLs (Delivery Roadmap Only)
- [ ] `SHEET_URLS.project` contains gid=1503252593
- [ ] `SHEET_URLS.allocation` contains gid=1194298779
- [ ] NO `productInitiatives` URL
- [ ] NO `productBugRelease` URL
- [ ] URLs point to correct Google Sheet (spreadsheetId: 1L98AGoj2jd-oWuxBZ_W0nVFZpwd3zr38jVW5iGhc0s8)

### 3. Mock Data Structure
- [ ] `MOCK_DATA.projects` is an array
- [ ] `MOCK_DATA.allocation` is an array
- [ ] Projects have: squad, initiative, start, status, delivery, spi, allocation, comments, scope
- [ ] Allocation has: squad, initiative, dev, percentage
- [ ] NO product-related fields in mock data

### 4. Parse CSV Function
- [ ] Parses 'project' type correctly
- [ ] Parses 'allocation' type correctly
- [ ] Handles numeric conversions (status, spi, allocation, percentage)
- [ ] Filters entries without squad/initiative
- [ ] Handles quoted values correctly
- [ ] Handles empty values correctly

### 5. Load Function
- [ ] Fetches from correct URLs
- [ ] Uses CORS proxy
- [ ] Returns { projects, allocation }
- [ ] Falls back to mock data on error
- [ ] Falls back to mock data if parsed data is empty
- [ ] Logs with [DELIVERY] prefix

### 6. Isolation Check
- [ ] NO global `MOCK_PROJECT_DATA` variable
- [ ] NO global `MOCK_ALLOCATION_DATA` variable  
- [ ] NO global `SHEET_URLS` variable
- [ ] Module doesn't leak to global scope
- [ ] Module doesn't depend on Product Roadmap

## 🔍 Manual Testing Steps

1. Open browser console on index.html
2. Check `DeliveryRoadmapData` exists
3. Verify structure: `Object.keys(DeliveryRoadmapData)`
4. Test parseCSV with sample data
5. Test load function (may need to mock fetch)

## 📝 Expected Behavior

- Module should be completely self-contained
- All Delivery Roadmap data should be inside the module
- No mixing with Product Roadmap
- Clean API: `DeliveryRoadmapData.load(CORS_PROXY)`

