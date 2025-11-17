import {Scheduler} from "./Scheduler";
import {BaseEvent, CharEvent, EventType, KeyEvent, RoutingType, ScreenResizeEvent, TimerEvent} from "./Event";

export class EventManager {
    public constructor(private scheduler: Scheduler) {
    }

    public dispatch(rawEventData: any[]) {
        const eventType: EventType = rawEventData[0];
        let event: BaseEvent | null = null;

        switch (eventType) {
            case EventType.Key:
                event = new KeyEvent(rawEventData[1], rawEventData[2]);
                break;
            case EventType.Char:
                event = new CharEvent(rawEventData[1]);
                break;
            case EventType.ScreenResize:
                event = new ScreenResizeEvent();
                break;
            case EventType.Timer:
                event = new TimerEvent(rawEventData[1]);
                break;
        }

        if (!event) return null;

        switch (event.routingType) {
            case RoutingType.Broadcast:
                this.scheduler.broadcastEventToAll(event);
                break;
        }
    }

}