# MetaChronik, an analytics-focused indexer

A Node.js TypeScript application that indexes eCash blockchain data from Chronik into a PostgreSQL database for analytics and chart generation.

## Features

### Production-Ready Features

-   **Real-time Block Processing**: WebSocket subscription to Chronik for instant block processing
-   **Automatic Reconciliation**: Daily checks for missing blocks and data integrity
-   **Missing Block Detection**: Identifies and processes any gaps in the blockchain data
-   **Price Integration**: Automatic current price fetching for new days only
-   **Comprehensive Token Tracking**: ALP and SLP token transaction counting by type
-   **Advanced Analytics**: Agora volume, cachet claims, faucet claims, and more

### Database Indexing

-   Daily transaction count aggregation
-   Daily block count aggregation
-   Daily average block size calculation
-   Complete day filtering (excludes incomplete days)
-   Real-time data from Chronik indexer
-   Comprehensive blockchain metrics storage

## Architecture

-   **Backend**: Node.js with TypeScript
-   **Database**: PostgreSQL (NeonDB supported) for data storage
-   **Indexer**: Chronik for blockchain data access
-   **Scheduling**: Cron jobs for automated data collection
-   **Purpose**: Database indexing service (no API endpoints)

## Prerequisites

-   Node.js 18+
-   PostgreSQL 12+ (or NeonDB)
-   Access to a Chronik indexer server
-   TypeScript knowledge

## Installation

1. Clone the repository and navigate to the metachronik directory:

```bash
cd apps/metachronik
```

2. Install dependencies:

```bash
npm install
```

3. Copy the environment example file:

```bash
cp env.example .env
```

4. Configure your environment variables in `.env`:

```env
# Server Configuration
NODE_ENV=development
LOG_LEVEL=info

# Database Connection String (NeonDB/Postgres)
DATABASE_URL=postgresql://user:password@host:port/dbname?sslmode=require

# Chronik Configuration
# NB chronik urls must be agora-indexed
CHRONIK_URLS=https://chronik-native2.fabien.cash,https://chronik-native3.fabien.cash,https://chronik.pay2stay.com/xec2,https://chronik-native1.fabien.cash,https://chronik1.alitayin.com,https://chronik2.alitayin.com
CHRONIK_STRATEGY=closestFirst

# Cron Schedule (every 6 hours)
CRON_SCHEDULE=0 */6 * * *

# Initial Indexing Configuration
INITIAL_INDEX_START=850000
```

5. Start the application:

```bash
# The application will automatically initialize the database on first startup
npm run dev
```

The application will:

-   Create all necessary database tables automatically
-   Set up indexes for optimal performance
-   Use the DATABASE_URL from your .env file

## Development

### Building the Application

```bash
npm run build
```

### Running in Development Mode

```bash
npm run dev
```

### Running in Production

```bash
npm start
```

### Running Tests

```bash
npm test
```

### Linting

```bash
npm run lint
npm run lint:fix
```

## Usage

This application is a database indexing service that runs continuously in the background. It does not expose any API endpoints. The indexed data is consumed directly by the frontend application which has its own database connection.

### Running the Indexer

The indexer runs as a background service that:

-   Continuously monitors the blockchain for new blocks
-   Processes blocks in real-time via WebSocket
-   Runs scheduled data collection every 6 hours
-   Performs daily reconciliation at 2 AM
-   Maintains data integrity and fills any gaps

## Data Collection

The application automatically collects data from the Chronik indexer using multiple methods:

1. **Real-time Processing**: WebSocket subscription for instant block processing
2. **Scheduled Collection**: Cron jobs every 6 hours for bulk data collection
3. **Daily Reconciliation**: Automatic daily checks for missing blocks and data integrity

### Data Collected

-   **Block Data**: Height, hash, timestamp, transaction count, block size
-   **Token Transactions**: ALP and SLP token counts by type (standard, fungible, mint vault, NFT1 group/child)
-   **Genesis Transactions**: Token genesis transaction counts by type
-   **Rewards**: Miner, staking, and IFP rewards in satoshis
-   **Special Transactions**: Cachet claims, Cashtab faucet claims, Binance withdrawals
-   **Agora Volume**: Trading volume from XECX and FIRMA exchanges
-   **Price Data**: Current USD prices for XEC from CoinGecko (new days only, past days require manual updates)

## Database Schema

The application uses a comprehensive schema with two main tables:

-   `blocks` - Detailed block information including all transaction types, rewards, and special metrics
-   `days` - Daily aggregated data for efficient chart generation and price storage

## Configuration

### Environment Variables

| Variable              | Description                       | Default       |
| --------------------- | --------------------------------- | ------------- |
| `PORT`                | Server port                       | 3001          |
| `NODE_ENV`            | Environment mode                  | development   |
| `LOG_LEVEL`           | Logging level                     | info          |
| `DATABASE_URL`        | NeonDB/Postgres connection string | (required)    |
| `CHRONIK_URLS`        | Comma-separated Chronik URLs      | (required)    |
| `CHRONIK_STRATEGY`    | Connection strategy               | closestFirst  |
| `CRON_SCHEDULE`       | Data collection schedule          | 0 _/6 _ \* \* |
| `INITIAL_INDEX_START` | Initial block height for indexing | 850000        |

### Chronik Connection Strategy

-   `closestFirst`: Selects the Chronik server with the lowest latency
-   `asOrdered`: Uses Chronik servers in the order provided

## Frontend

The frontend is a Next.js application located in `web/charts.e.cash/` that provides:

-   Dark theme matching eCash v2 design
-   Responsive charts using Recharts
-   Real-time data updates
-   Direct database connection (no API dependency)
-   Indexing range display
-   Complete day filtering for accurate data visualization

## Wishlist

We intend to add more data to this indexer. The main goal of this product is the database and not the pace of indexing. If some interesting information takes a long, long time to derive...we may still want that information.

[] Token supply by blockheight
[] Token holders by blockheight
[] Token holder balances by blockheight
[] LOKAD tx count
[] Agora tx count
[] Total number of addresses
[] Monthly Active Users (e.g., active addresses by blockheight; say, any address with a transaction in the the last month)
[] Monthly Active Tokens by blockheight (tokenId with any tx in the last month)
[] Monthly Active LokadIds
[] Cash Fusions (daily)
[] Cash Fusions (cumulative)
[] Cash fusion utxo count
[] utxo count (so we can get % fused stat)
