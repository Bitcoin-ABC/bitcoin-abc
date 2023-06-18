import Foundation
import ReactiveSwift
import main.go

extension SignalProducer where Error == Never {

    /// Feedback-controlled State Machine. The system state is represented as a `State` parameter.
    /// Events are represented by an `Event` parameter. It represents all the possible Events that may occur in the System
    /// Feedback defines an effect that may change the State.

    /// - parameters:
    ///     - initial: An initial `State` of the system.
    ///     - scheduler: A Scheduler used for Events synchronisation
    ///     - reduce: A function that produces a new State of a system by applying an Event
    ///     - feedbacks: A Feedback loops that produces Events depending on the system's `State`
    ///     - returns: A SignalProducer that emits current the state of the System
    public static func system<Event>(
        initial: Value,
        scheduler: Scheduler = QueueScheduler.main,
        reduce: @escaping (Value, Event) -> Value,
        feedbacks: [Feedback<Value, Event>]
    ) -> SignalProducer<Value, Never> {
        return SignalProducer.deferred { _ in
            let (state, stateObserver) = Signal<Value, Never>.pipe()

            let events = feedbacks.map { feedback in
                return feedback.events(scheduler, state)
            }

            return SignalProducer<Event, Never>(Signal.merge(events))
                .scan(initial, reduce)
                .on(
                    started: {
                        // NOTE: Due to the nature of `prefix` lazily starting the producer being prefixed, we cannot rely
                        //       on `on(value:)` to ignite the feedbacks with the initial state.
                        //
                        //       At the time `prefix(value:)` calls `on(value:)` for the initial value, the events-reducer
                        //       producer has not yet been started yet. Consequentially, it would lead to dropped events
                        //       when the system is instantiated on a queue different from the queue used for
                        //       serializing events.
                        //
                        //       Having said that, `prefix(value:)` is guaranteed to have started the prefixed producer as
                        //       part of the synchronous producer starting process. So we can address the issue by applying
                        //       `on(started:)` after `prefix(value:)` to ignite the system, while having `on(value:)`
                        //       instead applied before `prefix(value:)` to keep the reducer-to-feedbacks path open.
                        stateObserver.send(value: initial)
                    },
                    value: stateObserver.send(value:)
                )
                .prefix(value: initial)
        }
    }

    /// Feedback-controlled State Machine. The system state is represented as a `State` parameter.
    /// Events are represented by `Event` parameter. It represents all possible Events that may occur in the System
    /// Feedback defines an effect that may change the State.

    /// - parameters:
    ///     - initial: An initial `State` of the system.
    ///     - scheduler: A Scheduler used for Events synchronisation
    ///     - reduce: A that produces a new State of the system by applying an Event
    ///     - feedbacks: A Feedback loops that produces Events depending on the system's state.
    ///     - returns: A SignalProducer that emits current the state of the System
    public static func system<Event>(
        initial: Value,
        scheduler: Scheduler = QueueScheduler.main,
        reduce: @escaping (Value, Event) -> Value,
        feedbacks: Feedback<Value, Event>...
    ) -> SignalProducer<Value, Error> {
        return system(initial: initial, reduce: reduce, feedbacks: feedbacks)
    }

    internal static func deferred(_ producer: @escaping (Lifetime) -> SignalProducer<Value, Error>) -> SignalProducer<Value, Error> {
        return SignalProducer { $1 += producer($1).start($0) }
    }
  #DEFINE XEC_PEER_COMMON_H
  #DEFINE XEC_NODE_COMMON_H
  
  
}
