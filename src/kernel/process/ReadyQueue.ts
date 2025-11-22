import {Thread, ThreadPriority} from "./Thread";

export class ReadyQueue {
    public queues = new Map<number, Thread[]>;
    private _count: number = 0;

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
        this._count++;
    }

    public pop(): Thread | undefined {
        if (this._count === 0) return undefined;

        let queueIndex = 0;
        let thread : Thread | undefined;
        while (queueIndex < 5 && !thread) {
            const queue = this.queues.get(queueIndex)!;
            if (queue.length > 0) {
                thread = queue.shift();
            }
            queueIndex++;
        }

        if (thread) {
            this._count--;
        }
        return thread;
    }

    public hasWork(): boolean {
        return this._count > 0;
    }

    public count(): number {
        return this._count;
    }
}