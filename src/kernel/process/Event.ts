export enum EventType {
    Key = "key",
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
    props: object,
}
//
// export abstract class BaseEvent {
//     public readonly type: EventType;
//     public readonly routingType;
//
//     constructor(type: EventType, routingType?: RoutingType) {
//         this.type = type;
//         this.routingType = routingType || RoutingType.Broadcast;
//     }
//
//     public toObject(): object {
//         return {};
//     }
// }
//
// export class KeyEvent extends BaseEvent {
//     public readonly keyId: number;
//     public readonly isHeld: boolean;
//
//     public constructor(key: number, isHeld: boolean) {
//         super(EventType.Key, RoutingType.Focused);
//         this.keyId = key;
//         this.isHeld = isHeld;
//     }
//
//     public toObject(): object {
//         return {
//             type: this.type,
//             keyId: this.keyId,
//             isHeld: this.isHeld,
//         }
//     }
// }
//
// export class CharEvent extends BaseEvent {
//     public readonly character: string;
//
//     public constructor(char: string) {
//         super(EventType.Char, RoutingType.Focused);
//         this.character = char;
//     }
//
//     public toObject(): object {
//         return {
//             type: this.type,
//             character: this.character,
//         }
//     }
// }
//
// export class ScreenResizeEvent extends BaseEvent {
//     public readonly x: number;
//     public readonly y: number;
//
//     constructor() {
//         super(EventType.ScreenResize);
//         [this.x, this.y] = term.getSize();
//     }
//
//     public toObject(): object {
//         return {
//             type: this.type,
//             x: this.x,
//             y: this.y,
//         }
//     }
// }
//
// export class TimerEvent extends BaseEvent {
//     public readonly id: number;
//
//     constructor(id: number) {
//         super(EventType.Timer, RoutingType.Timer);
//         this.id = id;
//     }
//
//     public toObject(): object {
//         return {
//             type: this.type,
//             id: this.id,
//         }
//     }
// }