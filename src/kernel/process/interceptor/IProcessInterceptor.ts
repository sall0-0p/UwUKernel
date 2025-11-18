import {IEvent} from "../Event";
import {Scheduler} from "../Scheduler";

/**
 * Interceptor that is added to a process to intercept events before they reach event queue.
 */
export interface IProcessInterceptor {
    /**
     * Called when event arrives to the interceptor.
     * Return `true` if event should be consumed (it will not reach the process eventQueue).
     * @param event - event that was intercepted.
     * @param scheduler - injected scheduler.
     */
    onEvent(event: IEvent, scheduler: Scheduler): boolean;
}