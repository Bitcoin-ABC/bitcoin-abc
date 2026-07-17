# Performance Optimization Guide

Some notes from lessons learned during initial indexing.

## Batching model

Indexing is **serial by batch**: fetch one tx-budget batch from Chronik, save it,
then build the next. Blocks _within_ a batch are still loaded in parallel via
`Promise.all`. Holding many full batches in heap OOM'd around ~400k blocks as
tx density grew, so true multi-batch concurrency was removed.

## Optimal Configuration for Railway $5 Hobby Plan

**Hardware Specs:**

- **RAM:** 8GB
- **vCPU:** 8 cores
- **Storage:** SSD

### Recommended Settings

```bash
# Optimal indexing configuration for Railway $5 hobby plan
TARGET_TX_COUNT_PER_BATCH=30000
```

### Performance Characteristics

**Memory Usage:**

- **RSS:** 2.0-2.3GB (25-29% of available RAM)
- **Heap:** 783MB-1.1GB (10-14% of available RAM)
- **Stable:** No memory crashes or out-of-memory errors

**Speed Optimization:**

- **Transaction-count based batching** prevents memory spikes on large blocks
- **30K transactions per batch** reduces API overhead
- **500 block limit** enforced to respect Chronik API constraints

### Configuration Limits

**Tested Limits (DO NOT EXCEED):**

- ❌ `TARGET_TX_COUNT_PER_BATCH=35000` - Can cause out-of-memory errors on 8GB hosts

**Safe Range:**

- ✅ `TARGET_TX_COUNT_PER_BATCH=25000-30000` on ~8GB RAM
- Local Chronik + large heap (e.g. 16GB Node) can push higher (e.g. 75K)

Note even with these settings, did see some occasional crashes. Best to have a higher-spec server or a lot of time on your hands.

### Implementation Details

**Transaction-Count Based Batching:**

- Batches blocks by total transaction count rather than block count
- Prevents memory spikes when processing blocks with many transactions
- Automatically enforces 500-block limit per batch (Chronik API constraint)
- Processes one batch at a time to bound peak heap

**Memory Management:**

- Aggressive garbage collection after each batch
- Immediate database saves to free memory
- Memory monitoring and logging

### Environment Variables

```bash
# Required for optimal performance
NODE_OPTIONS='--max-old-space-size=4096'

# Optimal indexing settings
TARGET_TX_COUNT_PER_BATCH=30000

# Other recommended settings
LOG_LEVEL=info
CRON_SCHEDULE=0 */6 * * *
```

### Monitoring

**Key Metrics to Watch:**

- **RSS Memory:** Should stay under 3GB for safety
- **Heap Memory:** Should stay under 2GB for safety
- **API Errors:** Watch for rate limiting or connection issues
- **Processing Speed:** Monitor blocks processed per minute

**Warning Signs:**

- RSS memory approaching 3.5GB
- Frequent API errors or timeouts
- Process crashes or restarts

### Troubleshooting

**If experiencing crashes:**

1. Reduce `TARGET_TX_COUNT_PER_BATCH` by 5000
2. Monitor memory usage for 15-20 minutes
3. Gradually increase settings if stable

**If experiencing slow performance:**

1. Ensure `NODE_OPTIONS='--max-old-space-size=4096'` is set
2. Check database connection pool settings
3. Verify Chronik server availability and latency
4. Monitor for API rate limiting

### Production Deployment

Production deployment is handled by Bitcoin ABC CI/CD pipeline. The performance optimizations documented here are applicable to any deployment environment with similar hardware specifications (8GB RAM, 8 vCPU).

---

## Previous Optimization History

### Initial Implementation

- **Problem:** Fixed block-size batching caused memory crashes on large blocks
- **Solution:** Implemented transaction-count based batching
- **Result:** Stable memory usage, no more crashes

### Parallel batches (removed)

- Early tuning used many concurrent in-flight batches for throughput on remote Chronik.
- That held multiple full batches in heap at once and was retired in favor of
  serial batch fetch+save with a tunable `TARGET_TX_COUNT_PER_BATCH`.

### Key Learnings

- **Memory is not the only bottleneck:** API rate limiting and connection limits matter
- **Transaction count matters more than block count:** Large blocks with few transactions are fast
- **Conservative settings are better:** Stable performance beats maximum speed
- **Monitoring is crucial:** Memory logs help identify optimal settings
