// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

//! Global and per-client subscription caps.

use std::collections::HashMap;
use std::net::IpAddr;
use std::sync::atomic::{AtomicUsize, Ordering};
use std::sync::{Arc, Mutex};

use thiserror::Error;

/// Default global subscription limit across all clients (`-chronikmaxsubs`).
pub const MAX_SUBS: usize = 10_000_000;

/// Default per-IP / per-client subscription limit (`-chronikmaxsubsperip`).
pub const MAX_SUBS_PER_IP: usize = 75_000;

/// Shared subscription limiter.
pub type SubscriptionLimiterRef = Arc<SubscriptionLimiter>;

/// Key used to attribute a subscription to a client.
///
/// Electrum (karyon) does not currently expose the peer address on
/// [`karyon_jsonrpc::server::channel::Channel`], so subscriptions are tracked
/// per connection instead. Chronik WebSocket uses the real peer [`IpAddr`].
#[derive(Clone, Copy, Debug, Eq, Hash, PartialEq)]
pub enum SubscriptionClientKey {
    /// Real client IP address.
    Ip(IpAddr),
    /// Opaque connection identity (e.g. `Arc::as_ptr` of the Electrum
    /// channel).
    Connection(usize),
}

/// Errors when accepting a new subscription.
#[derive(Clone, Debug, Eq, Error, PartialEq)]
pub enum SubscriptionLimitError {
    /// Global `max_subs` exceeded.
    #[error("Global subscription limit of {0} exceeded")]
    Global(usize),
    /// Per-IP / per-connection `max_subs_per_ip` exceeded.
    #[error("Subscription limit of {0} exceeded for this client")]
    PerClient(usize),
}

/// Tracks active subscriptions against global and per-client caps.
#[derive(Debug)]
pub struct SubscriptionLimiter {
    max_subs: usize,
    max_subs_per_ip: usize,
    total: AtomicUsize,
    per_client: Mutex<HashMap<SubscriptionClientKey, usize>>,
}

impl Default for SubscriptionLimiter {
    fn default() -> Self {
        Self::new()
    }
}

impl SubscriptionLimiter {
    /// Create a limiter with the default limits.
    pub fn new() -> Self {
        Self::with_limits(MAX_SUBS, MAX_SUBS_PER_IP)
    }

    /// Create a limiter with the given limits.
    pub fn with_limits(max_subs: usize, max_subs_per_ip: usize) -> Self {
        Self {
            max_subs,
            max_subs_per_ip,
            total: AtomicUsize::new(0),
            per_client: Mutex::new(HashMap::new()),
        }
    }

    /// Shared limiter with the given limits.
    pub fn new_ref(
        max_subs: usize,
        max_subs_per_ip: usize,
    ) -> SubscriptionLimiterRef {
        Arc::new(Self::with_limits(max_subs, max_subs_per_ip))
    }

    /// Try to reserve one subscription slot for `key`.
    ///
    /// On success, returns a guard that releases the slot when dropped.
    pub fn try_acquire(
        self: &SubscriptionLimiterRef,
        key: SubscriptionClientKey,
    ) -> Result<SubscriptionGuard, SubscriptionLimitError> {
        let mut per_client = self.per_client.lock().unwrap();
        let client_count = *per_client.get(&key).unwrap_or(&0);
        if client_count >= self.max_subs_per_ip {
            return Err(SubscriptionLimitError::PerClient(
                self.max_subs_per_ip,
            ));
        }
        // Check-and-increment total under the same lock as per-client so the
        // two counters stay consistent under concurrency.
        let total = self.total.load(Ordering::Relaxed);
        if total >= self.max_subs {
            return Err(SubscriptionLimitError::Global(self.max_subs));
        }
        per_client.insert(key, client_count + 1);
        self.total.fetch_add(1, Ordering::Relaxed);
        Ok(SubscriptionGuard {
            limiter: Arc::clone(self),
            key,
        })
    }

    fn release(&self, key: SubscriptionClientKey) {
        let mut per_client = self.per_client.lock().unwrap();
        let should_remove = if let Some(count) = per_client.get_mut(&key) {
            *count = count.saturating_sub(1);
            *count == 0
        } else {
            false
        };
        if should_remove {
            per_client.remove(&key);
        }
        self.total.fetch_sub(1, Ordering::Relaxed);
    }

    /// Current global subscription count (test helper).
    #[cfg(test)]
    fn total(&self) -> usize {
        self.total.load(Ordering::Relaxed)
    }

    /// Current subscription count for `key` (test helper).
    #[cfg(test)]
    fn client_count(&self, key: SubscriptionClientKey) -> usize {
        *self.per_client.lock().unwrap().get(&key).unwrap_or(&0)
    }

    /// Whether `key` has an entry in the per-client map (test helper).
    #[cfg(test)]
    fn has_client(&self, key: SubscriptionClientKey) -> bool {
        self.per_client.lock().unwrap().contains_key(&key)
    }
}

/// RAII guard that releases one reserved subscription slot on drop.
#[derive(Debug)]
pub struct SubscriptionGuard {
    limiter: SubscriptionLimiterRef,
    key: SubscriptionClientKey,
}

impl Drop for SubscriptionGuard {
    fn drop(&mut self) {
        self.limiter.release(self.key);
    }
}

#[cfg(test)]
mod tests {
    use std::net::{IpAddr, Ipv4Addr};
    use std::sync::Arc;

    use super::*;

    fn ip_key(octet: u8) -> SubscriptionClientKey {
        SubscriptionClientKey::Ip(IpAddr::V4(Ipv4Addr::new(1, 2, 3, octet)))
    }

    #[test]
    fn enforces_per_client_limit() {
        let limiter = Arc::new(SubscriptionLimiter::with_limits(100, 2));
        let key = ip_key(1);
        let _guard1 = limiter.try_acquire(key).unwrap();
        let _guard2 = limiter.try_acquire(key).unwrap();
        assert_eq!(
            limiter.try_acquire(key).unwrap_err(),
            SubscriptionLimitError::PerClient(2)
        );
        assert_eq!(limiter.total(), 2);
        assert_eq!(limiter.client_count(key), 2);
    }

    #[test]
    fn enforces_global_limit() {
        let limiter = Arc::new(SubscriptionLimiter::with_limits(2, 100));
        let _guard1 = limiter.try_acquire(ip_key(1)).unwrap();
        let _guard2 = limiter.try_acquire(ip_key(2)).unwrap();
        assert_eq!(
            limiter.try_acquire(ip_key(3)).unwrap_err(),
            SubscriptionLimitError::Global(2)
        );
        assert_eq!(limiter.total(), 2);
    }

    #[test]
    fn release_on_drop_frees_slots() {
        let limiter = Arc::new(SubscriptionLimiter::with_limits(10, 2));
        let key = ip_key(1);
        {
            let _guard1 = limiter.try_acquire(key).unwrap();
            let _guard2 = limiter.try_acquire(key).unwrap();
            assert_eq!(limiter.client_count(key), 2);
        }
        assert_eq!(limiter.total(), 0);
        assert_eq!(limiter.client_count(key), 0);
        let _guard3 = limiter.try_acquire(key).unwrap();
        assert_eq!(limiter.client_count(key), 1);
    }

    #[test]
    fn failed_acquire_does_not_insert_zero_count_entry() {
        let limiter = Arc::new(SubscriptionLimiter::with_limits(1, 1));
        let key1 = ip_key(1);
        let key2 = ip_key(2);
        let _guard = limiter.try_acquire(key1).unwrap();

        assert_eq!(
            limiter.try_acquire(key1).unwrap_err(),
            SubscriptionLimitError::PerClient(1)
        );
        assert_eq!(limiter.client_count(key1), 1);

        assert_eq!(
            limiter.try_acquire(key2).unwrap_err(),
            SubscriptionLimitError::Global(1)
        );
        assert!(!limiter.has_client(key2));
    }

    #[test]
    fn different_clients_are_independent() {
        let limiter = Arc::new(SubscriptionLimiter::with_limits(10, 2));
        let key1 = ip_key(1);
        let key2 = ip_key(2);
        let _guard1_a = limiter.try_acquire(key1).unwrap();
        let _guard1_b = limiter.try_acquire(key1).unwrap();

        {
            let _guard2_a = limiter.try_acquire(key2).unwrap();
            let _guard2_b = limiter.try_acquire(key2).unwrap();
            assert_eq!(limiter.client_count(key1), 2);
            assert_eq!(limiter.client_count(key2), 2);
            assert_eq!(limiter.total(), 4);
        }

        assert_eq!(limiter.client_count(key1), 2);
        assert_eq!(limiter.client_count(key2), 0);
        assert_eq!(limiter.total(), 2);

        // Client 1 is still at its per-IP limit; client 2 can subscribe again.
        assert_eq!(
            limiter.try_acquire(key1).unwrap_err(),
            SubscriptionLimitError::PerClient(2)
        );
        let _guard2_c = limiter.try_acquire(key2).unwrap();
        assert_eq!(limiter.client_count(key2), 1);
        assert_eq!(limiter.total(), 3);
    }
}
