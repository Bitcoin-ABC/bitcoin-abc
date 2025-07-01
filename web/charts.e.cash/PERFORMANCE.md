# Performance Optimization Guide

## Recent Improvements

### 1. Date Range Filtering

-   **Default**: Shows only the last year of data for faster loading
-   **Options**: 1 month, 3 months, 6 months, 1 year, all time, or custom dates
-   **Benefit**: Reduces data transfer and processing time significantly

### 2. Batch API Endpoint

-   **New**: `/api/charts/batch` endpoint fetches multiple datasets in a single request
-   **Benefit**: Reduces API calls from 12+ to 2-3 calls, improving load times

### 3. Database Indexes

-   **Added**: Index on `DATE(to_timestamp(timestamp))` for efficient date-based queries
-   **Added**: Index on `price_usd` for faster price data retrieval
-   **Benefit**: Faster database queries, especially for date ranges

## Performance Tips

### For Users

1. **Start with 1 Year**: The default view shows the last year, which loads quickly
2. **Use Preset Ranges**: Choose from preset ranges (1m, 3m, 6m, 1y) for optimal performance
3. **Avoid "All Time"**: Loading 16+ years of data will be slow - use specific date ranges instead
4. **Custom Dates**: For historical analysis, use specific date ranges rather than loading everything

### For Developers

1. **Database**: Ensure the new indexes are created by running the schema migration
2. **Caching**: Consider implementing Redis caching for frequently accessed data
3. **Pagination**: For very large datasets, consider implementing pagination
4. **CDN**: Use a CDN for static assets to improve global performance

## Expected Performance

### Load Times (Approximate)

-   **1 Year**: 2-5 seconds
-   **6 Months**: 1-3 seconds
-   **3 Months**: 1-2 seconds
-   **1 Month**: < 1 second
-   **All Time**: 10-30 seconds (depending on data size)

### Factors Affecting Performance

1. **Data Size**: More historical data = longer load times
2. **Network**: Slower connections will take longer
3. **Server Load**: Production server performance may vary
4. **Browser**: Modern browsers handle large datasets better

## Troubleshooting

### If Loading is Still Slow

1. **Check Date Range**: Make sure you're not loading "All Time" unnecessarily
2. **Clear Browser Cache**: Hard refresh (Ctrl+F5) to clear cached data
3. **Try Different Browser**: Some browsers handle large datasets better
4. **Check Network**: Ensure stable internet connection

### For Developers

1. **Monitor API Response Times**: Check browser dev tools Network tab
2. **Database Performance**: Monitor query execution times
3. **Server Resources**: Check server CPU and memory usage
4. **Index Usage**: Verify database indexes are being used effectively
