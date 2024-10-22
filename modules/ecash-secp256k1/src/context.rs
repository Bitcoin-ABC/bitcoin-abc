// SPDX-License-Identifier: CC0-1.0

use core::marker::PhantomData;
use core::mem::ManuallyDrop;
use core::ptr::NonNull;

#[cfg(feature = "alloc")]
pub use self::alloc_only::{All, SignOnly, VerifyOnly};
use crate::ffi::types::{c_uint, c_void, AlignedType};
use crate::ffi::{self, CPtr};
use crate::{Error, Secp256k1};

#[cfg(all(feature = "global-context", feature = "std"))]
/// Module implementing a singleton pattern for a global `Secp256k1` context.
pub mod global {

    use std::ops::Deref;
    use std::sync::Once;

    use crate::{All, Secp256k1};

    /// Proxy struct for global `SECP256K1` context.
    #[derive(Debug, Copy, Clone)]
    pub struct GlobalContext {
        __private: (),
    }

    /// A global static context to avoid repeatedly creating contexts.
    ///
    /// If `rand` and `std` feature is enabled, context will have been
    /// randomized using `thread_rng`.
    ///
    /// ```
    /// # #[cfg(all(feature = "global-context", feature = "rand",
    /// #           feature = "std"))] {
    /// use ecash_secp256k1::{PublicKey, SECP256K1};
    /// let _ = SECP256K1.generate_keypair(&mut rand::thread_rng());
    /// # }
    /// ```
    pub static SECP256K1: &GlobalContext = &GlobalContext { __private: () };

    impl Deref for GlobalContext {
        type Target = Secp256k1<All>;

        #[allow(unused_mut)] // Unused when `rand` + `std` is not enabled.
        fn deref(&self) -> &Self::Target {
            static ONCE: Once = Once::new();
            static mut CONTEXT: Option<Secp256k1<All>> = None;
            ONCE.call_once(|| unsafe {
                let mut ctx = Secp256k1::new();
                #[cfg(all(
                    not(target_arch = "wasm32"),
                    feature = "rand",
                    feature = "std",
                    not(feature = "global-context-less-secure")
                ))]
                {
                    ctx.randomize(&mut rand::thread_rng());
                }
                CONTEXT = Some(ctx);
            });
            unsafe { CONTEXT.as_ref().unwrap() }
        }
    }
}

/// A trait for all kinds of contexts that lets you define the exact flags and a
/// function to deallocate memory. It isn't possible to implement this for types
/// outside this crate.
///
/// # Safety
///
/// This trait is marked unsafe to allow unsafe implementations of `deallocate`.
pub unsafe trait Context: private::Sealed {
    /// Flags for the ffi.
    const FLAGS: c_uint;
    /// A constant description of the context.
    const DESCRIPTION: &'static str;
    /// A function to deallocate the memory when the context is dropped.
    ///
    /// # Safety
    ///
    /// `ptr` must be valid. Further safety constraints may be imposed by
    /// [`std::alloc::dealloc`].
    unsafe fn deallocate(ptr: *mut u8, size: usize);
}

/// Marker trait for indicating that an instance of [`Secp256k1`] can be used
/// for signing.
pub trait Signing: Context {}

/// Marker trait for indicating that an instance of [`Secp256k1`] can be used
/// for verification.
pub trait Verification: Context {}

/// Represents the set of capabilities needed for signing (preallocated memory).
#[derive(Copy, Clone, Debug, PartialEq, Eq, PartialOrd, Ord, Hash)]
pub struct SignOnlyPreallocated<'buf> {
    phantom: PhantomData<&'buf ()>,
}

/// Represents the set of capabilities needed for verification (preallocated
/// memory).
#[derive(Copy, Clone, Debug, PartialEq, Eq, PartialOrd, Ord, Hash)]
pub struct VerifyOnlyPreallocated<'buf> {
    phantom: PhantomData<&'buf ()>,
}

/// Represents the set of all capabilities (preallocated memory).
#[derive(Copy, Clone, Debug, PartialEq, Eq, PartialOrd, Ord, Hash)]
pub struct AllPreallocated<'buf> {
    phantom: PhantomData<&'buf ()>,
}

mod private {
    use super::*;
    pub trait Sealed {}

    impl<'buf> Sealed for AllPreallocated<'buf> {}
    impl<'buf> Sealed for VerifyOnlyPreallocated<'buf> {}
    impl<'buf> Sealed for SignOnlyPreallocated<'buf> {}
}

#[cfg(feature = "alloc")]
mod alloc_only {
    use core::marker::PhantomData;
    use core::ptr::NonNull;

    use super::private;
    use crate::alloc::alloc;
    use crate::ffi::types::{c_uint, c_void};
    use crate::ffi::{self};
    use crate::{AlignedType, Context, Secp256k1, Signing, Verification};

    impl private::Sealed for SignOnly {}
    impl private::Sealed for All {}
    impl private::Sealed for VerifyOnly {}

    const ALIGN_TO: usize = core::mem::align_of::<AlignedType>();

    /// Represents the set of capabilities needed for signing.
    #[derive(Copy, Clone, Debug, PartialEq, Eq, PartialOrd, Ord, Hash)]
    pub enum SignOnly {}

    /// Represents the set of capabilities needed for verification.
    #[derive(Copy, Clone, Debug, PartialEq, Eq, PartialOrd, Ord, Hash)]
    pub enum VerifyOnly {}

    /// Represents the set of all capabilities.
    #[derive(Copy, Clone, Debug, PartialEq, Eq, PartialOrd, Ord, Hash)]
    pub enum All {}

    impl Signing for SignOnly {}
    impl Signing for All {}

    impl Verification for VerifyOnly {}
    impl Verification for All {}

    unsafe impl Context for SignOnly {
        const DESCRIPTION: &'static str = "signing only";
        const FLAGS: c_uint = ffi::SECP256K1_START_SIGN;

        unsafe fn deallocate(ptr: *mut u8, size: usize) {
            let layout =
                alloc::Layout::from_size_align(size, ALIGN_TO).unwrap();
            alloc::dealloc(ptr, layout);
        }
    }

    unsafe impl Context for VerifyOnly {
        const DESCRIPTION: &'static str = "verification only";
        const FLAGS: c_uint = ffi::SECP256K1_START_VERIFY;

        unsafe fn deallocate(ptr: *mut u8, size: usize) {
            let layout =
                alloc::Layout::from_size_align(size, ALIGN_TO).unwrap();
            alloc::dealloc(ptr, layout);
        }
    }

    unsafe impl Context for All {
        const DESCRIPTION: &'static str = "all capabilities";
        const FLAGS: c_uint = VerifyOnly::FLAGS | SignOnly::FLAGS;

        unsafe fn deallocate(ptr: *mut u8, size: usize) {
            let layout =
                alloc::Layout::from_size_align(size, ALIGN_TO).unwrap();
            alloc::dealloc(ptr, layout);
        }
    }

    impl<C: Context> Secp256k1<C> {
        /// Lets you create a context in a generic manner (sign/verify/all).
        ///
        /// If `rand` and `std` feature is enabled, context will have been
        /// randomized using `thread_rng`.
        /// If `rand` or `std` feature is not enabled please consider
        /// randomizing the context as follows:
        /// ```
        /// # #[cfg(all(feature = "rand", feature = "std"))] {
        /// # use ecash_secp256k1::Secp256k1;
        /// # use ecash_secp256k1::rand::{thread_rng, RngCore};
        /// let mut ctx = Secp256k1::new();
        /// # let mut rng = thread_rng();
        /// # let mut seed = [0u8; 32];
        /// # rng.fill_bytes(&mut seed);
        /// // let seed = <32 bytes of random data>
        /// ctx.seeded_randomize(&seed);
        /// # }
        /// ```
        #[cfg_attr(
            not(all(feature = "rand", feature = "std")),
            allow(clippy::let_and_return, unused_mut)
        )]
        pub fn gen_new() -> Secp256k1<C> {
            #[cfg(target_arch = "wasm32")]
            ffi::types::sanity_checks_for_wasm();

            let size =
                unsafe { ffi::secp256k1_context_preallocated_size(C::FLAGS) };
            let layout =
                alloc::Layout::from_size_align(size, ALIGN_TO).unwrap();
            let ptr = unsafe { alloc::alloc(layout) };
            let ptr = NonNull::new(ptr as *mut c_void)
                .unwrap_or_else(|| alloc::handle_alloc_error(layout));

            #[allow(unused_mut)]
            // ctx is not mutated under some feature combinations.
            let mut ctx: Secp256k1<C> = Secp256k1 {
                ctx: unsafe {
                    ffi::secp256k1_context_preallocated_create(ptr, C::FLAGS)
                },
                phantom: PhantomData,
            };

            #[cfg(all(
                not(target_arch = "wasm32"),
                feature = "rand",
                feature = "std",
                not(feature = "global-context-less-secure")
            ))]
            {
                ctx.randomize(&mut rand::thread_rng());
            }

            #[allow(clippy::let_and_return)] // as for unusted_mut
            ctx
        }
    }

    impl Secp256k1<All> {
        /// Creates a new Secp256k1 context with all capabilities.
        ///
        /// If `rand` and `std` feature is enabled, context will have been
        /// randomized using `thread_rng`.
        /// If `rand` or `std` feature is not enabled please consider
        /// randomizing the context (see
        /// docs for `Secp256k1::gen_new()`).
        pub fn new() -> Secp256k1<All> {
            Secp256k1::gen_new()
        }
    }

    impl Secp256k1<SignOnly> {
        /// Creates a new Secp256k1 context that can only be used for signing.
        ///
        /// If `rand` and `std` feature is enabled, context will have been
        /// randomized using `thread_rng`.
        /// If `rand` or `std` feature is not enabled please consider
        /// randomizing the context (see
        /// docs for `Secp256k1::gen_new()`).
        pub fn signing_only() -> Secp256k1<SignOnly> {
            Secp256k1::gen_new()
        }
    }

    impl Secp256k1<VerifyOnly> {
        /// Creates a new Secp256k1 context that can only be used for
        /// verification.
        ///
        /// If `rand` and `std` feature is enabled, context will have been
        /// randomized using `thread_rng`.
        /// If `rand` or `std` feature is not enabled please consider
        /// randomizing the context (see
        /// docs for `Secp256k1::gen_new()`).
        pub fn verification_only() -> Secp256k1<VerifyOnly> {
            Secp256k1::gen_new()
        }
    }

    impl Default for Secp256k1<All> {
        fn default() -> Self {
            Self::new()
        }
    }

    impl<C: Context> Clone for Secp256k1<C> {
        fn clone(&self) -> Secp256k1<C> {
            let size = unsafe {
                ffi::secp256k1_context_preallocated_clone_size(
                    self.ctx.as_ptr(),
                )
            };
            let layout =
                alloc::Layout::from_size_align(size, ALIGN_TO).unwrap();
            let ptr = unsafe { alloc::alloc(layout) };
            let ptr = NonNull::new(ptr as *mut c_void)
                .unwrap_or_else(|| alloc::handle_alloc_error(layout));

            Secp256k1 {
                ctx: unsafe {
                    ffi::secp256k1_context_preallocated_clone(
                        self.ctx.as_ptr(),
                        ptr,
                    )
                },
                phantom: PhantomData,
            }
        }
    }
}

impl<'buf> Signing for SignOnlyPreallocated<'buf> {}
impl<'buf> Signing for AllPreallocated<'buf> {}

impl<'buf> Verification for VerifyOnlyPreallocated<'buf> {}
impl<'buf> Verification for AllPreallocated<'buf> {}

unsafe impl<'buf> Context for SignOnlyPreallocated<'buf> {
    const DESCRIPTION: &'static str = "signing only";
    const FLAGS: c_uint = ffi::SECP256K1_START_SIGN;

    unsafe fn deallocate(_ptr: *mut u8, _size: usize) {
        // Allocated by the user
    }
}

unsafe impl<'buf> Context for VerifyOnlyPreallocated<'buf> {
    const DESCRIPTION: &'static str = "verification only";
    const FLAGS: c_uint = ffi::SECP256K1_START_VERIFY;

    unsafe fn deallocate(_ptr: *mut u8, _size: usize) {
        // Allocated by the user.
    }
}

unsafe impl<'buf> Context for AllPreallocated<'buf> {
    const DESCRIPTION: &'static str = "all capabilities";
    const FLAGS: c_uint =
        SignOnlyPreallocated::FLAGS | VerifyOnlyPreallocated::FLAGS;

    unsafe fn deallocate(_ptr: *mut u8, _size: usize) {
        // Allocated by the user.
    }
}

/// Trait marking that a particular context object internally points to
/// memory that must outlive `'a`
///
/// # Safety
///
/// This trait is used internally to gate which context markers can safely
/// be used with the `preallocated_gen_new` function. Do not implement it
/// on your own structures.
pub unsafe trait PreallocatedContext<'a> {}

unsafe impl<'buf> PreallocatedContext<'buf> for AllPreallocated<'buf> {}
unsafe impl<'buf> PreallocatedContext<'buf> for SignOnlyPreallocated<'buf> {}
unsafe impl<'buf> PreallocatedContext<'buf> for VerifyOnlyPreallocated<'buf> {}

impl<'buf, C: Context + PreallocatedContext<'buf>> Secp256k1<C> {
    /// Lets you create a context with a preallocated buffer in a generic manner
    /// (sign/verify/all).
    pub fn preallocated_gen_new(
        buf: &'buf mut [AlignedType],
    ) -> Result<Secp256k1<C>, Error> {
        #[cfg(target_arch = "wasm32")]
        ffi::types::sanity_checks_for_wasm();

        if buf.len() < Self::preallocate_size_gen() {
            return Err(Error::NotEnoughMemory);
        }
        // Safe because buf is not null since it is not empty.
        let buf = unsafe {
            NonNull::new_unchecked(buf.as_mut_c_ptr() as *mut c_void)
        };

        Ok(Secp256k1 {
            ctx: unsafe {
                ffi::secp256k1_context_preallocated_create(
                    buf,
                    AllPreallocated::FLAGS,
                )
            },
            phantom: PhantomData,
        })
    }
}

impl<'buf> Secp256k1<AllPreallocated<'buf>> {
    /// Creates a new Secp256k1 context with all capabilities.
    pub fn preallocated_new(
        buf: &'buf mut [AlignedType],
    ) -> Result<Secp256k1<AllPreallocated<'buf>>, Error> {
        Secp256k1::preallocated_gen_new(buf)
    }

    /// Uses the ffi `secp256k1_context_preallocated_size` to check the memory
    /// size needed for a context.
    pub fn preallocate_size() -> usize {
        Self::preallocate_size_gen()
    }

    /// Creates a context from a raw context.
    ///
    /// The returned [`core::mem::ManuallyDrop`] context will never deallocate
    /// the memory pointed to by `raw_ctx` nor destroy the context. This may
    /// lead to memory leaks. `ManuallyDrop::drop`
    /// (or [`core::ptr::drop_in_place`]) will only destroy the context; the
    /// caller is required to free the memory.
    ///
    /// # Safety
    ///
    /// This is highly unsafe due to a number of conditions that aren't checked,
    /// specifically:
    ///
    /// * `raw_ctx` must be a valid pointer (live, aligned...) to memory that
    ///   was initialized by `secp256k1_context_preallocated_create` (either
    ///   called directly or from this library by one of the context creation
    ///   methods - all of which call it internally).
    /// * The version of `libsecp256k1` used to create `raw_ctx` must be
    ///   **exactly the one linked into this library**.
    /// * The lifetime of the `raw_ctx` pointer must outlive `'buf`.
    /// * `raw_ctx` must point to writable memory (cannot be
    ///   `ffi::secp256k1_context_no_precomp`).
    pub unsafe fn from_raw_all(
        raw_ctx: NonNull<ffi::Context>,
    ) -> ManuallyDrop<Secp256k1<AllPreallocated<'buf>>> {
        ManuallyDrop::new(Secp256k1 {
            ctx: raw_ctx,
            phantom: PhantomData,
        })
    }
}

impl<'buf> Secp256k1<SignOnlyPreallocated<'buf>> {
    /// Creates a new Secp256k1 context that can only be used for signing.
    pub fn preallocated_signing_only(
        buf: &'buf mut [AlignedType],
    ) -> Result<Secp256k1<SignOnlyPreallocated<'buf>>, Error> {
        Secp256k1::preallocated_gen_new(buf)
    }

    /// Uses the ffi `secp256k1_context_preallocated_size` to check the memory
    /// size needed for the context.
    #[inline]
    pub fn preallocate_signing_size() -> usize {
        Self::preallocate_size_gen()
    }

    /// Creates a context from a raw context that can only be used for signing.
    ///
    /// # Safety
    ///
    /// Please see [`Secp256k1::from_raw_all`] for full documentation and safety
    /// requirements.
    pub unsafe fn from_raw_signing_only(
        raw_ctx: NonNull<ffi::Context>,
    ) -> ManuallyDrop<Secp256k1<SignOnlyPreallocated<'buf>>> {
        ManuallyDrop::new(Secp256k1 {
            ctx: raw_ctx,
            phantom: PhantomData,
        })
    }
}

impl<'buf> Secp256k1<VerifyOnlyPreallocated<'buf>> {
    /// Creates a new Secp256k1 context that can only be used for verification
    pub fn preallocated_verification_only(
        buf: &'buf mut [AlignedType],
    ) -> Result<Secp256k1<VerifyOnlyPreallocated<'buf>>, Error> {
        Secp256k1::preallocated_gen_new(buf)
    }

    /// Uses the ffi `secp256k1_context_preallocated_size` to check the memory
    /// size needed for the context.
    #[inline]
    pub fn preallocate_verification_size() -> usize {
        Self::preallocate_size_gen()
    }

    /// Creates a context from a raw context that can only be used for
    /// verification.
    ///
    /// # Safety
    ///
    /// Please see [`Secp256k1::from_raw_all`] for full documentation and safety
    /// requirements.
    pub unsafe fn from_raw_verification_only(
        raw_ctx: NonNull<ffi::Context>,
    ) -> ManuallyDrop<Secp256k1<VerifyOnlyPreallocated<'buf>>> {
        ManuallyDrop::new(Secp256k1 {
            ctx: raw_ctx,
            phantom: PhantomData,
        })
    }
}
