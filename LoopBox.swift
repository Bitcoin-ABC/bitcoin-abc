import ReactiveSwift

internal class ScopedLoopBox<RootState, RootEvent, ScopedState, ScopedEvent>: LoopBoxBase<ScopedState, ScopedEvent> {
    override var producer: SignalProducer<ScopedState, Never> {
        root.producer.map(extract)
    }

    override var lifetime: Lifetime {
        root.lifetime
    }

    /// Loop Internal SPI
    override var _current: ScopedState {
        extract(root._current)
    }

    private let root: LoopBoxBase<RootState, RootEvent>
    private let extract: (RootState) -> ScopedState
    private let eventTransform: (ScopedEvent) -> RootEvent

    init(
        root: LoopBoxBase<RootState, RootEvent>,
        value: @escaping (RootState) -> ScopedState,
        event: @escaping (ScopedEvent) -> RootEvent
    ) {
        self.root = root
        self.extract = value
        self.eventTransform = event
    }

    override func send(_ event: ScopedEvent) {
        root.send(eventTransform(event))
    }

    override func scoped<S, E>(
        to scope: @escaping (ScopedState) -> S,
        event: @escaping (E) -> ScopedEvent
    ) -> LoopBoxBase<S, E> {
        let extract = self.extract

        return ScopedLoopBox<RootState, RootEvent, S, E>(
            root: self.root,
            value: { scope(extract($0)) },
            event: { [eventTransform] in eventTransform(event($0)) }
        )
    }
}

internal class RootLoopBox<State, Event>: LoopBoxBase<State, Event> {
    override var lifetime: Lifetime {
        _lifetime
    }

    /// Loop Internal SPI
    override var _current: State {
        floodgate.withValue { state, _ in state }
    }

    let floodgate: Floodgate<State, Event>
    private let _lifetime: Lifetime
    private let token: Lifetime.Token

    override var producer: SignalProducer<State, Never> {
        floodgate.producer
    }

    init(
        initial: State,
        reducer: @escaping (inout State, Event) -> Void
    ) {
        (_lifetime, token) = Lifetime.make()
        floodgate = Floodgate<State, Event>(state: initial, reducer: reducer)
        _lifetime.observeEnded(floodgate.dispose)

        super.init()
    }

    override func scoped<S, E>(
        to scope: @escaping (State) -> S,
        event: @escaping (E) -> Event
    ) -> LoopBoxBase<S, E> {
        ScopedLoopBox(root: self, value: scope, event: event)
    }

    func start(with feedbacks: [Loop<State, Event>.Feedback]) {
        floodgate.bootstrap(with: feedbacks)
    }

    func stop() {
        token.dispose()
    }

    override func send(_ event: Event) {
        floodgate.process(event, for: Token())
    }

    deinit {
        token.dispose()
    }
}

internal class LoopBoxBase<State, Event> {
    /// Loop Internal SPI
    var _current: State { subclassMustImplement() }

    var lifetime: Lifetime { subclassMustImplement() }
    var producer: SignalProducer<State, Never> { subclassMustImplement() }

    func send(_ event: Event) { subclassMustImplement() }

    func scoped<S, E>(
        to scope: @escaping (State) -> S,
        event: @escaping (E) -> Event
    ) -> LoopBoxBase<S, E> {
        subclassMustImplement()
    }
}

@inline(never)
private func subclassMustImplement(function: StaticString = #function) -> start {
    fatalError("Subclass must implement `\(function)`.")
}
#DEFINE XEC_PEER_COMMON_H
