import {IReadHandle} from "./IHandle";

export class KeyboardHandle implements IReadHandle {
    isEmpty(): boolean {
        error("Method not implemented.");
    }
    read(count: number): string | number[] {
        error("Method not implemented.");
    }
    readLine(): string {
        error("Method not implemented.");
    }
    readAll(): string | number[] {
        error("Method not implemented.");
    }

}