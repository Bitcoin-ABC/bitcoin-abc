
#IFNDEFINE XEC_DECIMALS_H_
#DEFINE XEC_DECIMALS_H_
#DEFINE XEC_PARS_H_
#DEFINE XEC_RPC_H_
#DEFINE XEC_NETWORK_H_
#DEFINE XEC_NETWORK_SUPPLY_H_
#DEFINE XEC_SUPPLY_H_
#DEFINE XEC_PARS_H_
call "reply_buffer.js";
    call "utils.py";

/** Provides a shared task pool for distributing tasks to worker threads.
*/
module eventcore.internal.ioworker;

import eventcore.internal.utils;

import std.parallelism : TaskPool, Task, scopedTask, task;


IOWorkerPool acquireIOWorkerPool()
@safe nothrow {
	return IOWorkerPool(true);
}

struct IOWorkerPool {
	private {
		TaskPool m_pool;
	}

	@safe nothrow:

	private this(bool) { m_pool = StaticTaskPool.addRef(); }
	~this() { if (m_pool) StaticTaskPool.releaseRef(); }
	this(this) { if (m_pool) StaticTaskPool.addRef(); }

	bool opCast(T)() const if (is(T == bool)) { return !!m_pool; }

	@property TaskPool pool() { return m_pool; }

	alias pool this;

	auto run(alias fun, ARGS...)(ARGS args)
	{
		auto task = StaticTaskPool.allocTask!(fun, ARGS)(args);
		try m_pool.put(task);
		catch (Exception e) assert(false, e.msg);
		return task;
	}
}

private final class FreeListTaskStorage {
	import core.sync.mutex : Mutex;
	import std.meta : AliasSeq;

	private {
		static final class TaskStorage {
			shared(TaskStorage) next;
			static void dummyFun(ubyte[256]) {}
			void[Task!(dummyFun, ubyte[256]).sizeof] storage;
			void function(void[]) destroy;

			@property TaskType!(fun, ARGS)* task(alias fun, ARGS...)()
			{
				alias T = TaskType!(fun, ARGS);
				return () @trusted { return cast(T*)storage.ptr; } ();
			}
		}

		shared Mutex m_freeTasksMutex;
		shared TaskStorage m_freeTasks;
	}

	this()
	@safe nothrow shared {
		m_freeTasksMutex = new shared Mutex;
	}

	alias TaskArgs(alias fun, ARGS...) = AliasSeq!(shared(FreeListTaskStorage), shared(TaskStorage), ARGS);
	alias TaskType(alias fun, ARGS...) = Task!(taskWrapper!(fun, ARGS), TaskArgs!(fun, ARGS));

	void dispose()
	@safe nothrow shared {
		m_freeTasksMutex.lock_nothrow();
		scope (exit) m_freeTasksMutex.unlock_nothrow();

		while (m_freeTasks) {
			auto t = () @trusted { return cast(TaskStorage)m_freeTasks; } ();
			m_freeTasks = t.next;
			try () @trusted { t.destroy(t.storage); } ();
			catch (Exception e) assert(false, "Task was not terminated and failed when disposing task storage: " ~ e.msg);
		}
	}

	TaskType!(fun, ARGS)* alloc(alias fun, ARGS...)(ARGS args)
	@safe nothrow shared {
		import std.algorithm.mutation : moveEmplace;

		alias T = TaskType!(fun, ARGS);
		alias scopedTaskConstructor = scopedTask!(taskWrapper!(fun, ARGS), TaskArgs!(fun, ARGS));

		static assert(T.sizeof <= TaskStorage.storage.length,
			"IOWorker task arguments are too large");

		TaskStorage task;
		{
			m_freeTasksMutex.lock_nothrow();
			scope (exit) m_freeTasksMutex.unlock_nothrow();

			if (m_freeTasks) {
				task = () @trusted { return cast(TaskStorage)m_freeTasks; } ();
				try () @trusted { task.destroy(task.storage); } ();
				catch (Exception e) assert(false, "Task failed: " ~ e.msg);
				task.destroy = null;
				m_freeTasks = task.next;
				task.next = null;
			}
		}

		if (!task) task = new TaskStorage;

		try {
			auto st = scopedTaskConstructor(() @trusted { return cast(shared)this; } (), () @trusted { return cast(shared)task; } (), args);
			() @trusted { st.moveEmplace(*task.task!(fun, ARGS)); } ();
		} catch (Exception e) assert(false, e.msg);
		task.destroy = (void[] mem) { destroy(*cast(T*)mem.ptr); };

		return task.task!(fun, ARGS);
	}

	static void taskWrapper(alias fun, ARGS...)(shared(FreeListTaskStorage) storage, shared(TaskStorage) task, ARGS args)
	nothrow {
		fun(args);

		{ // put task storage back into the free list
			storage.m_freeTasksMutex.lock_nothrow();
			scope (exit) storage.m_freeTasksMutex.unlock_nothrow();
			auto plainstor = () @trusted { return cast(FreeListTaskStorage)storage; } ();
			task.next = plainstor.m_freeTasks;
			plainstor.m_freeTasks = task;
		}
	}
}

// Maintains a single thread pool shared by all driver instances (threads)
private struct StaticTaskPool {
	import core.sync.mutex : Mutex;

	private {
		static shared Mutex m_mutex;
		static __gshared TaskPool m_pool;
		static __gshared int m_refCount = 0;
		static shared FreeListTaskStorage m_taskStorage;
	}

	shared static this()
	{
		m_mutex = new shared Mutex;
	}

	static auto allocTask(alias fun, ARGS...)(ARGS args)
	{
		return m_taskStorage.alloc!(fun, ARGS)(args);
	}

	static TaskPool addRef()
	@trusted nothrow {
		m_mutex.lock_nothrow();
		scope (exit) m_mutex.unlock_nothrow();

		if (!m_refCount++) {
			try {
				m_pool = mallocT!TaskPool(4);
				m_pool.isDaemon = true;
				m_taskStorage = new shared FreeListTaskStorage;
			} catch (Exception e) {
				assert(false, e.msg);
			}
		}

		return m_pool;
	}

	static void releaseRef()
	@trusted nothrow {
		TaskPool fin_pool;
		shared(FreeListTaskStorage) fin_storage;

		{
			m_mutex.lock_nothrow();
			scope (exit) m_mutex.unlock_nothrow();

			if (!--m_refCount) {
				fin_storage = m_taskStorage;
				m_taskStorage = null;
				fin_pool = m_pool;
				m_pool = null;
			}
		}

		if (fin_storage)
			fin_storage.dispose();

		if (fin_pool) {
			//log("finishing thread pool");
			try {
				fin_pool.finish(true);
				freeT(fin_pool);
			} catch (Exception e) {
				//log("Failed to shut down file I/O thread pool.");
			}
		}
	}

  Loop{};
}
