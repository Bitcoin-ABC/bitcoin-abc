// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

//! Tracking of Chronik async tasks for cooperative shutdown.

use std::{future::Future, sync::Arc, time::Duration};

use chronik_util::log;
use tokio::sync::watch;
use tokio_util::task::TaskTracker;

/// Shared registry of Chronik HTTP/Electrum tasks.
///
/// Spawned work is tracked so [`ChronikTasks::shutdown`] can cancel it and
/// await completion (with a timeout) instead of relying on
/// [`tokio::runtime::Runtime::shutdown_timeout`].
pub struct ChronikTasks {
    cancel_tx: watch::Sender<bool>,
    tracker: TaskTracker,
}

impl ChronikTasks {
    /// Create a new empty task registry (not cancelled).
    pub fn new() -> Arc<Self> {
        let (cancel_tx, _) = watch::channel(false);
        Arc::new(Self {
            cancel_tx,
            tracker: TaskTracker::new(),
        })
    }

    /// Subscribe to the cancellation signal. Becomes `true` on shutdown.
    pub fn cancel_receiver(&self) -> watch::Receiver<bool> {
        self.cancel_tx.subscribe()
    }

    /// Request cooperative cancellation of all tasks.
    pub fn request_cancel(&self) {
        // `send_replace` updates the watched value even when no receiver
        // exists yet. That way a server that subscribes after interrupt still
        // observes cancellation.
        self.cancel_tx.send_replace(true);
    }

    /// Spawn `future` on the current tokio runtime and track it for shutdown.
    pub fn spawn<F>(&self, future: F)
    where
        F: Future<Output = ()> + Send + 'static,
    {
        // Drop the JoinHandle: TaskTracker keeps the task until the future
        // exits, without retaining handles for the process lifetime.
        let _handle = self.tracker.spawn(future);
    }

    /// Cancel tracked tasks and wait up to `timeout` for them to finish.
    ///
    /// On timeout, logs and returns; the caller should tear down the runtime
    /// so any stragglers are aborted.
    pub async fn shutdown(&self, timeout: Duration) {
        self.request_cancel();
        // Allow wait() to complete once the tracker is empty. Closing does not
        // block new spawns; any that race in are still counted until they exit
        // (or the runtime is shut down after a timeout).
        self.tracker.close();
        if tokio::time::timeout(timeout, self.tracker.wait())
            .await
            .is_err()
        {
            log!(
                "Chronik: timed out waiting for async tasks; aborting \
                 remaining\n"
            );
        }
    }
}

impl std::fmt::Debug for ChronikTasks {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "ChronikTasks {{ .. }}")
    }
}

/// Wait until [`ChronikTasks::request_cancel`] has been called (or the sender
/// is dropped).
pub async fn wait_until_cancelled(mut cancel_rx: watch::Receiver<bool>) {
    loop {
        if *cancel_rx.borrow_and_update() {
            return;
        }
        if cancel_rx.changed().await.is_err() {
            return;
        }
    }
}
