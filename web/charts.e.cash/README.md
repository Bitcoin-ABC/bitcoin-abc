# Charts.e.cash Frontend

A Next.js TypeScript application that provides a beautiful, responsive dashboard for eCash blockchain analytics using data directly from the PostgreSQL database.

## Features

### Charts & Analytics

-   **Daily Transaction Count**: Line chart showing daily transaction volume
-   **Daily Block Count**: Line chart showing daily block production
-   **Daily Average Block Size**: Line chart showing average block size in kB
-   **Date Range Selection**: Choose from preset ranges (1 month, 3 months, 6 months, 1 year, all time) or custom dates
-   **Optimized Performance**: Defaults to showing the last year of data for faster loading
-   **Indexing Range Display**: Shows the block height range being indexed

### Design & UX

-   **Dark Theme**: Matches eCash v2 design system with signature dark blue background
-   **Glassmorphism Cards**: Modern card design with backdrop blur effects
-   **Responsive Layout**: Optimized for desktop, tablet, and mobile devices
-   **Consistent Styling**: All charts use the same eCash blue accent color
-   **Professional Typography**: Clean, readable text with proper hierarchy

### Technical Features

-   **Database-driven**: Direct PostgreSQL database access for real-time data
-   **Date Range Filtering**: Optimized performance with configurable date ranges
-   **Batch API Loading**: Efficient data fetching with reduced database calls
-   **TypeScript**: Full type safety throughout the application
-   **Recharts**: High-performance React charting library
-   **Tailwind CSS**: Utility-first styling framework
-   **Next.js 14**: Modern React framework with App Router

## Prerequisites

-   Node.js 18+
-   PostgreSQL database with eCash blockchain data
-   Modern web browser

## Installation

1. Navigate to the frontend directory:

```bash
cd web/charts.e.cash
```

2. Install dependencies:

```bash
npm install
```

3. Configure the database connection:

Set the `NEXT_DB_CONNECTION_STRING` environment variable to your PostgreSQL database connection string. The database should contain the eCash blockchain data tables.

## Development

### Running in Development Mode

```bash
npm run dev
```

The application will be available at `http://localhost:3000`

### Date Range Selection

The application includes a date range selector that allows you to:

-   **Quick Selection**: Choose from preset ranges (1 month, 3 months, 6 months, 1 year, all time)
-   **Custom Range**: Set specific start and end dates
-   **Default Performance**: By default, shows the last year of data for optimal loading speed
-   **Real-time Updates**: All charts update automatically when you change the date range

### Building for Production

```bash
npm run build
```

### Running Production Build

```bash
npm start
```

### Linting

```bash
npm run lint
```

## Database Integration

The frontend connects directly to the PostgreSQL database through internal API routes:

-   `GET /api/charts/summary` - Summary data including block range
-   `GET /api/charts/batch` - Batch data for all chart types with date filtering
-   All data is fetched directly from the database using optimized SQL queries

## Design System

### Colors

-   **Background**: `#090916` (eCash dark blue)
-   **Accent**: `#01a0e0` (eCash blue)
-   **Text Primary**: `#ffffff` (white)
-   **Text Secondary**: `#cccccc` (light gray)
-   **Borders**: `rgba(255,255,255,0.14)` (14% white)

### Typography

-   **Headings**: Bold, white text
-   **Body**: Light gray text for secondary information
-   **Charts**: Consistent axis labels and tooltips

### Components

-   **Cards**: Glassmorphism with backdrop blur
-   **Charts**: Full-width responsive containers
-   **Loading States**: Spinner with eCash blue accent
-   **Error States**: Clean error messages with retry functionality

## Chart Configuration

### Line Charts

-   **Stroke Color**: `#01a0e0` (eCash blue)
-   **Stroke Width**: 2px
-   **Grid**: Subtle white lines with low opacity
-   **Tooltips**: Dark theme with proper styling
-   **Axis Labels**: Rotated -90° for Y-axis, positioned inside left

### Data Processing

-   **Complete Day Filtering**: Excludes today's incomplete data
-   **Incomplete Day Detection**: Heuristic-based filtering for first/last days
-   **Block Size Conversion**: Automatically converts bytes to kB for display
-   **Number Formatting**: K/M suffixes for large numbers

## Browser Support

-   Chrome 90+
-   Firefox 88+
-   Safari 14+
-   Edge 90+

## Performance

-   **Lazy Loading**: Charts load data on demand
-   **Optimized Rendering**: Efficient chart updates
-   **Responsive Images**: Optimized for different screen sizes
-   **Minimal Bundle**: Tree-shaking and code splitting

## Contributing

1. Follow the existing code style and patterns
2. Use TypeScript for all new code
3. Test on multiple screen sizes
4. Ensure charts remain responsive
5. Maintain the eCash design system

## Deployment

The application can be deployed to any platform that supports Next.js:

-   Vercel (recommended)
-   Netlify
-   AWS Amplify
-   Self-hosted servers

## Database Requirements

This frontend requires a PostgreSQL database with eCash blockchain data. The database should contain tables for daily statistics, coinbase data, claims, withdrawals, and other blockchain metrics.
