/* Licensed under LGPLv2.1+ - see LICENSE file for details */
#ifndef CCAN_COROUTINE_H
#define CCAN_COROUTINE_H
/*#define CCAN_COROUTINE_DEBUG 1*/
#include "config.h"

#include <stddef.h>
#include <stdint.h>
#include <stdbool.h>
#include <assert.h>

#include <ccan/compiler/compiler.h>
#include <ccan/typesafe_cb/typesafe_cb.h>

/**
 * struct coroutine_stack
 *
 * Describes a stack suitable for executing a coroutine.  This
 * structure is always contained within the stack it describes.
 */
struct coroutine_stack {
	uint64_t magic;
	size_t size;
	int valgrind_id;
};

/**
 * struct coroutine_state
 *
 * Describes the state of an in-progress coroutine.
 */
struct coroutine_state;

/*
 * Stack management
 */

/**
 * COROUTINE_STK_OVERHEAD - internal stack overhead
 *
 * Number of bytes of a stack which coroutine needs for its own
 * tracking information.
 */
#define COROUTINE_STK_OVERHEAD	sizeof(struct coroutine_stack)

/**
 * COROUTINE_MIN_STKSZ - Minimum coroutine stack size
 *
 * Contains the minimum size for a coroutine stack (not including
 * overhead).  On systems with MINSTKSZ, guaranteed to be at least as
 * large as MINSTKSZ.
 */
#define COROUTINE_MIN_STKSZ		2048

/**
 * COROUTINE_STACK_MAGIC_BUF - Magic number for coroutine stacks in a user
 *                             supplied buffer
 */
#define COROUTINE_STACK_MAGIC_BUF	0xc040c040574cb00f

/**
 * COROUTINE_STACK_MAGIC_ALLOC - Magic number for coroutine stacks
 *                               allocated by this module
 */
#define COROUTINE_STACK_MAGIC_ALLOC	0xc040c040574ca110

/**
 * coroutine_stack_init - Prepare a coroutine stack in an existing buffer
 * @buf: buffer to use for the coroutine stack
 * @bufsize: size of @buf
 * @metasize: size of metadata to add to the stack (not including
 *            coroutine internal overhead)
 *
 * Prepares @buf for use as a coroutine stack, returning a
 * coroutine_stack *, allocated from within the buffer.  Returns NULL
 * on failure.
 *
 * This will fail if the bufsize < (COROUTINE_MIN_STKSZ +
 * COROUTINE_STK_OVERHEAD + metasize).
 */
struct coroutine_stack *coroutine_stack_init(void *buf, size_t bufsize,
					     size_t metasize);

/**
 * coroutine_stack_alloc - Allocate a coroutine stack
 * @totalsize: total size to allocate
 * @metasize: size of metadata to add to the stack (not including
 *            coroutine internal overhead)
 *
 * Allocates a coroutine stack of size @totalsize, including both
 * internal overhead (COROUTINE_STK_OVERHEAD) and metadata of size
 * @metasize.  Where available this will also create a guard page, so
 * that overruning the stack will result in an immediate crash, rather
 * than data corruption.
 *
 * This will fail if the totalsize < (COROUTINE_MIN_STKSZ +
 * COROUTINE_STK_OVERHEAD + metasize).
 */
struct coroutine_stack *coroutine_stack_alloc(size_t bufsize, size_t metasize);

/**
 * coroutine_stack_release - Stop using a coroutine stack
 * @stack: coroutine stack to release
 * @metasize: size of metadata
 *
 * This releases @stack, making it no longer suitable for use as a
 * coroutine stack.  @metasize must be equal to the metasize passed to
 * coroutine_stack_init.
 */
void coroutine_stack_release(struct coroutine_stack *stack, size_t metasize);

/**
 * coroutine_stack_check - Validate and return a coroutine stack
 * @stack: stack to check
 * @abortstr: the location to print on aborting, or NULL.
 *
 * Debugging check if @stack doesn't appear to be a valid coroutine
 * stack, and @abortstr is non-NULL it will be printed and the
 * function will abort.
 *
 * Returns @stack if it appears valid, NULL if not (it can never
 * return NULL if @abortstr is set).
 */
struct coroutine_stack *coroutine_stack_check(struct coroutine_stack *stack,
					      const char *abortstr);

/**
 * coroutine_stack_to_metadata - Returns pointer to user's metadata
 *                               allocated within the stack
 * @stack: coroutine stack
 * @metasize: size of metadata
 *
 * Returns a pointer to the metadata area within @stack.  This is of
 * size given at initialization time, and won't be overwritten by
 * coroutines executing on the stack.  It's up to the caller what to
 * put in here. @metasize must be equal to the value passed to
 * coroutine_stack_init().
 */
static inline void *coroutine_stack_to_metadata(struct coroutine_stack *stack,
						size_t metasize)
{
#if HAVE_STACK_GROWS_UPWARDS
	return (char *)stack - metasize;
#else
	return (char *)stack + COROUTINE_STK_OVERHEAD;
#endif
}

/**
 * coroutine_stack_from_metadata - Returns pointer to coroutine stack
 *                                 pointer given pointer to user metadata
 * @metadat: user metadata within a stack
 * @metasize: size of metadata
 *
 * Returns a pointer to the coroutine_stack handle within a stack.
 * The argument must be a pointer returned by
 * coroutine_stack_to_metadata() at an earlier time. @metasize must be
 * equal to the value passed to coroutine_stack_init().
 */
static inline struct coroutine_stack *
coroutine_stack_from_metadata(void *metadata, size_t metasize)
{
#if HAVE_STACK_GROWS_UPWARDS
	return (struct coroutine_stack *)((char *)metadata + metasize);
#else
	return (struct coroutine_stack *)((char *)metadata
					  - COROUTINE_STK_OVERHEAD);
#endif
}

/**
 * coroutine_stack_size - Return size of a coroutine stack
 * @stack: coroutine stack
 *
 * Returns the size of the coroutine stack @stack.  This does not
 * include the overhead of struct coroutine_stack or metdata.
 */
size_t coroutine_stack_size(const struct coroutine_stack *stack);

/*
 * Coroutine switching
 */

#if HAVE_UCONTEXT
#include <ucontext.h>
#define COROUTINE_AVAILABLE		1
#else
#define COROUTINE_AVAILABLE		0
#endif

struct coroutine_state {
#if HAVE_UCONTEXT
	ucontext_t uc;
#endif /* HAVE_UCONTEXT */
};

#if COROUTINE_AVAILABLE

/**
 * coroutine_init - Prepare a coroutine for execution
 * @cs: coroutine_state structure to initialize
 * @fn: function to start executing in the coroutine
 * @arg: argument for @fn
 * @stack: stack to use for the coroutine
 *
 * Prepares @cs as a new coroutine which will execute starting with
 * function @fn, using stack @stack.
 */
void coroutine_init_(struct coroutine_state *cs,
		     void (*fn)(void *), void *arg,
		     struct coroutine_stack *stack);
#define coroutine_init(cs, fn, arg, stack)				\
	coroutine_init_((cs),                                           \
			typesafe_cb(void, void *, (fn), (arg)),		\
			(arg), (stack))

/**
 * coroutine_jump - Irreversibly switch to executing a coroutine
 * @to: coroutine to switch to
 *
 * Immediately jump to executing coroutine @to (at whatever point in
 * execution it was up to).  Never returns.
 */
void NORETURN coroutine_jump(const struct coroutine_state *to);

/**
 * coroutine_switch - Switch coroutines
 * @from: coroutine in which to store current execution state
 * @to: coroutine to switch to
 *
 * Stop executing the current routine, saving its state in @from, and
 * switch to executing the coroutine @to.  Returns only when something
 * switches or jumps back to @from.
 */
void coroutine_switch(struct coroutine_state *from,
		      const struct coroutine_state *to);

#else

static inline void coroutine_init(struct coroutine_state *cs,
				  void (*fn)(void *), void *arg,
				  struct coroutine_stack *stack)
{
	assert(0);
}

static inline void NORETURN coroutine_jump(const struct coroutine_state *to)
{
	assert(0);
}

static inline void coroutine_switch(struct coroutine_state *from,
				    const struct coroutine_state *to)
{
	assert(0);
}

#endif /* !COROUTINE_AVAILABLE */

#endif /* CCAN_COROUTINE_H */
