export enum EventType {
    Key = "key",
    KeyUp = "key_up",
    Char = "char",
    ScreenResize = "screen_resize",
    Timer = "timer",
    RemoteEvent = "remote_event",
}

export enum RoutingType {
    Broadcast = "broadcast",
    Focused = "focused",

    // Automatic
    Timer = "timer",
    Remote = "remote",
}

export interface IEvent {
    type: EventType,
    routingType: RoutingType,
    props: any,
}