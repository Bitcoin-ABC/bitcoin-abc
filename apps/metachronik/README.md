# MetaChronik, an analytics-focused indexer

A Node.js TypeScript application that indexes eCash blockchain data from Chronik into a PostgreSQL database for analytics and chart generation.

## Features

### Production-Ready Features

- **Real-time Block Processing**: WebSocket subscription to Chronik for instant block processing
- **Event-driven Reconciliation**: Automatic gap detection and reconciliation when blockchain gaps are detected
- **Missing Block Detection**: Identifies and processes any gaps in the blockchain data in real-time
- **Price Integration**: Automatic current price fetching for new days only
- **Comprehensive Token Tracking**: ALP and SLP token transaction counting by type
- **Advanced Analytics**: Agora volume, cachet claims, faucet claims, and more

### Database Indexing

- Daily transaction count aggregation
- Daily block count aggregation
- Daily average block size calculation
- Complete day filtering (excludes incomplete days)
- Real-time data from Chronik indexer
- Comprehensive blockchain metrics storage

## Architecture

- **Backend**: Node.js with TypeScript
- **Database**: PostgreSQL (NeonDB supported) for data storage
- **Indexer**: Chronik for blockchain data access
- **Scheduling**: Cron jobs for automated data collection
- **Purpose**: Database indexing service (no API endpoints)

## Prerequisites

- Node.js 18+
- PostgreSQL 12+ (or NeonDB)
- Access to a Chronik indexer server
- TypeScript knowledge

## Installation

1. Clone the repository and navigate to the metachronik directory:

```bash
cd apps/metachronik
```

2. Install dependencies:

```bash
pnpm install
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
# Must be 0 unless you bootstrap a full utxos snapshot at this height.
INITIAL_INDEX_START=0
```

5. Start the application:

```bash
# The application will automatically initialize the database on first startup
pnpm run dev
```

The application will:

- Create all necessary database tables automatically
- Set up indexes for optimal performance
- Use the DATABASE_URL from your .env file

## Development

### Building the Application

```bash
pnpm run build
```

### Running in Development Mode

```bash
pnpm run dev
```

### Running in Production

```bash
pnpm start
```

### Running Tests

```bash
pnpm test
```

### Linting

```bash
pnpm run lint
pnpm run lint:fix
```

### Indexing health & historic edge cases

```bash
pnpm check-indexing              # full UTXO / token invariant check
pnpm check-indexing -- --quick   # sampled reconcile (faster)
```

Bitcoin has a few pre-standard quirks (duplicate coinbase txids, empty-script
outputs) that need special handling when indexing from genesis. See
**[scripts/README.md — Historic edge cases](./scripts/README.md#historic-edge-cases)**
for symptoms, fixes, and repair commands (`repair-known-drift`,
`repair-empty-script-utxos`).

## Usage

This application is a database indexing service that runs continuously in the background. It does not expose any API endpoints. The indexed data is consumed directly by the frontend application which has its own database connection.

### Running the Indexer

The indexer runs as a background service that:

- Continuously monitors the blockchain for new blocks
- Processes blocks in real-time via WebSocket
- Runs scheduled data collection every 6 hours
- Automatically detects and reconciles gaps when they occur
- Maintains data integrity through event-driven reconciliation

## Data Collection

The application automatically collects data from the Chronik indexer using multiple methods:

1. **Real-time Processing**: WebSocket subscription for instant block processing
2. **Scheduled Collection**: Cron jobs every 6 hours for bulk data collection
3. **Event-driven Reconciliation**: Automatic gap detection and reconciliation when blockchain gaps are detected

### Reconciliation Process

Event-driven reconciliation:

- **Normal Operation**: Blocks arrive via WebSocket and should always be exactly 1 height higher than the previous block
- **Gap Detection**: If a block arrives that's not exactly 1 height higher, the system detects a gap
- **Automatic Reconciliation**: When a gap is detected, the system automatically reconciles missing blocks from the highest height in the database to the current chain tip

### Data Collected

- **Block Data**: Height, hash, timestamp, transaction count, block size
- **Token Transactions**: ALP and SLP token counts by type (standard, fungible, mint vault, NFT1 group/child)
- **Genesis Transactions**: Token genesis transaction counts by type
- **Rewards**: Miner, staking, and IFP rewards in satoshis
- **Special Transactions**: Cachet claims, Cashtab faucet claims, Binance withdrawals
- **Agora Volume**: Trading volume from XECX and FIRMA exchanges
- **Price Data**: Current USD prices for XEC from CoinGecko (new days only, past days require manual updates)

## Database Schema

The application uses a comprehensive schema:

- `blocks` — Detailed block information including all transaction types, rewards, and special metrics
- `days` — Daily aggregated data for efficient chart generation and price storage
- `day_addresses` — Staging table for true daily address deduplication (pruned after aggregation)
- `addresses` — Permanent table tracking every unique address: first seen, last activity, miner/staker status
- Materialized views — Pre-computed cumulative data (agora volume, tokens created, claims, fusion, addresses, miners/stakers)

## Configuration

### Environment Variables

| Variable                    | Description                                    | Default       |
| --------------------------- | ---------------------------------------------- | ------------- |
| `LOG_LEVEL`                 | Logging level                                  | info          |
| `DATABASE_URL`              | NeonDB/Postgres connection string              | (required)    |
| `CHRONIK_URLS`              | Comma-separated Chronik URLs                   | (required)    |
| `CHRONIK_STRATEGY`          | Connection strategy                            | closestFirst  |
| `CRON_SCHEDULE`             | Data collection schedule                       | 0 _/6 _ \* \* |
| `INITIAL_INDEX_START`       | Start height (must be 0 without utxo snapshot) | 0             |
| `TARGET_TX_COUNT_PER_BATCH` | Tx budget per Chronik fetch/save batch         | 30000         |

### Chronik Connection Strategy

- `closestFirst`: Selects the Chronik server with the lowest latency
- `asOrdered`: Uses Chronik servers in the order provided

## Frontend

The frontend is a Next.js application located in `web/charts.e.cash/` that provides:

- Dark theme matching eCash v2 design
- Responsive charts using Recharts
- Real-time data updates
- Direct database connection (no API dependency)
- Indexing range display
- Complete day filtering for accurate data visualization

## Wishlist

We intend to add more data to this indexer. The main goal of this product is the database and not the pace of indexing. If some interesting information takes a long, long time to derive...we may still want that information.

### Network Adoption & Activity

- [x] Daily Active Addresses (unique senders per day)
- [x] Daily Active Addresses — sent or received
- [x] New Addresses per Day (first-seen tracking)
- [x] Cumulative Unique Addresses
- [ ] Monthly Active Addresses (rolling 30-day unique senders)
- [x] New vs Returning Addresses breakdown
- [ ] Transaction Size Distribution (bucket tx output values)
- [ ] UTXO Set Size Over Time (track creates/destroys per block)
- [ ] Total number of addresses

### Token Economy

- [ ] Token supply by blockheight
- [ ] Token holders by blockheight
- [ ] Token holder balances by blockheight
- [ ] Top Tokens by Tx Volume (per-token tx count tracking)
- [ ] Token Holder Count Over Time (snapshot holder count per token per day)
- [ ] Token Velocity (transfer volume / circulating supply)
- [ ] Active Tokens per Day (distinct token IDs in txs per day)
- [ ] Monthly Active Tokens by blockheight (tokenId with any tx in the last month)

### Agora DEX Analytics

- [x] Unique Agora Traders per Day (P2PKH only, true daily dedup)
- [ ] Agora tx count
- [ ] Average/Median Trade Size (store individual trade amounts)
- [ ] Active Listings Over Time (track listing creation/fulfillment)

### Privacy (CashFusion)

- [x] Cash Fusions (daily)
- [x] Cash Fusions (cumulative)
- [ ] Cash fusion utxo count
- [ ] utxo count (so we can get % fused stat)
- [ ] Average Fusion Participants (count inputs per fusion tx)

### Protocol / LOKAD Usage

- [x] LOKAD tx count
- [ ] Monthly Active LokadIds
- [ ] OP_RETURN Usage by LOKAD ID (parse LOKAD prefix, stacked area chart)
- [ ] Payload Size Distribution (track OP_RETURN byte sizes)

### Economic / On-Chain Analysis

- [ ] HODL Waves (UTXO age band distribution — requires full UTXO-set tracking with creation timestamps)
- [ ] Coin Days Destroyed (sum of UTXO*age * value for each spent input — requires input creation height)
- [ ] Realized Cap (each UTXO's value \* price when it last moved)
- [ ] Supply Distribution (address balance bands: 1-10 XEC, 10K-100K, 1M+, etc.)
- [ ] Dormancy Flow (average coin dormancy \* spend volume)

### Mining & Consensus

- [x] Daily Unique Miners (addresses receiving mining rewards)
- [x] Daily Unique Stakers (addresses receiving staking rewards)
- [x] Cumulative Miners, Stakers, and Both (addresses that have received both)
- [ ] Estimated Hashrate (derive from difficulty + block times)
- [ ] Block Time Distribution (histogram of actual vs expected 10-min targets)
- [ ] Mining Pool Distribution (parse coinbase scriptsig for pool identifiers, stacked area)
- [ ] Staking Reward Growth (separate chart for staking ecosystem — data already indexed)
