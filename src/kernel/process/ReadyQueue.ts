import {Thread, ThreadPriority} from "./Thread";

export class ReadyQueue {
    public queues = new Map<number, Thread[]>;
    public constructor() {
        this.queues.set(ThreadPriority.VeryHigh, []);
        this.queues.set(ThreadPriority.High, []);
        this.queues.set(ThreadPriority.Normal, []);
        this.queues.set(ThreadPriority.Low, []);
        this.queues.set(ThreadPriority.VeryLow, []);
    }

    public push(thread: Thread): void {
        const priority = thread.getPriority();
        const queue = this.queues.get(priority);
        if (!queue) error("Invalid priority!");
        queue.push(thread);
    }

    public shift(): Thread | null {
        let queueIndex = 0;
        let thread : Thread | null;
        while (queueIndex < 5 && !thread) {
            thread = this.queues.get(queueIndex).pop();
            queueIndex++;
        }
        return thread;
    }

    public toArray(): Thread[] {
        let result: Thread[] = [];
        this.queues.forEach((q: Thread[]): void => {
            result = [
                ...result,
                ...q,
            ]
        });
        return result;
    }
}