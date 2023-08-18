// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

//! Module for [`Pause`] and [`PauseNotify`].

use abc_rust_error::Result;
use chronik_util::log;
use thiserror::Error;
use tokio::{runtime::Runtime, sync::watch};

use crate::pause::PauseNotifyError::*;

/// Allows blocking the thread until resumed by [`PauseNotify`].
#[derive(Debug)]
pub struct Pause {
    pause_recv: watch::Receiver<PauseMsg>,
}

/// Handle to pause/resume indexing any updates from the node.
/// This will fill up the validation interface queue, so use with caution.
#[derive(Debug)]
pub struct PauseNotify {
    pause_send: watch::Sender<PauseMsg>,
    is_pause_allowed: bool,
}

/// Enum to pause/resume Chronik indexing.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
enum PauseMsg {
    /// Pause Chronik indexing.
    Pause,
    /// Resume Chronik indexing.
    Resume,
}

/// Errors for [`PauseNotify`].
#[derive(Debug, Eq, Error, PartialEq)]
pub enum PauseNotifyError {
    /// Pause not allowed by config
    #[error(
        "403: Pause is not allowed on this node; enable with \
         -chronikallowpause"
    )]
    PauseNotAllowed,

    /// Failed notifying pause
    #[error("500: Failed notifying pause")]
    NotifyFailed,
}

impl Pause {
    /// Create a new [`Pause`] and [`PauseNotify`] pair, where `Pause` can be
    /// used to block the thread until resumed by this `PauseNotify`.
    pub fn new_pair(is_pause_allowed: bool) -> (Pause, PauseNotify) {
        let (pause_send, pause_recv) = watch::channel(PauseMsg::Resume);
        (
            Pause { pause_recv },
            PauseNotify {
                pause_send,
                is_pause_allowed,
            },
        )
    }

    /// If we are paused, block until resumed by our corresponding
    /// [`PauseNotify`]. Otherwise, do nothing.
    pub fn block_if_paused(&self, runtime: &Runtime) {
        if *self.pause_recv.borrow() == PauseMsg::Pause {
            log!(
                "Chronik is paused, resume by calling /resume. To disallow \
                 pausing on this node, remove the -chronikallowpause arg.\n"
            );
            let mut pause_recv = self.pause_recv.clone();
            // Ignore RecvError here, this only means PauseNotify has been
            // dropped, which in this case we treat as a "resume".
            let _ = runtime
                .block_on(pause_recv.wait_for(|&msg| msg == PauseMsg::Resume));
        }
    }
}

impl PauseNotify {
    /// Pause the corresponding [`Pause`], such that the next time
    /// `Pause::block_if_paused` is called, it will block the thread.
    /// If it is already paused, this does nothing.
    pub fn pause(&self) -> Result<()> {
        self.send(PauseMsg::Pause)
    }

    /// Resume the corresponding [`Pause`], any pending `Pause::block_if_paused`
    /// will immediately resume. If already resumed, this does nothing.
    pub fn resume(&self) -> Result<()> {
        self.send(PauseMsg::Resume)
    }

    fn send(&self, msg: PauseMsg) -> Result<()> {
        if !self.is_pause_allowed {
            return Err(PauseNotAllowed.into());
        }
        self.pause_send.send(msg).map(|_| NotifyFailed)?;
        Ok(())
    }
}
