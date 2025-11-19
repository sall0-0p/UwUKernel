export enum EventType {
    Key = "key",
    KeyUp = "key_up",
    Char = "char",
    ScreenResize = "term_resize",
    Timer = "timer",
}

export enum RoutingType {
    Broadcast = "broadcast",
    Focused = "focused",

    // Automatic
    Timer = "timer",
}

export interface IEvent {
    type: EventType,
    routingType: RoutingType,
    props: any,
}