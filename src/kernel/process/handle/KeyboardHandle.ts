import {IReadHandle} from "./IHandle";

export class KeyboardHandle implements IReadHandle {
    readChar(): string {
        // To add;
        return "HI!";
    }

    readByte(): number {
        // To add;
        return 0;
    }

    readNumber(): number {
        // To add;
        return 0;
    }

    readString(): string {
        // To add;
        return "HI!";
    }

    readLine(): string {
        // To add;
        return "HI!";
    }

    // Empty (Unavailable) methods
    isEmpty(): boolean {
        return true;
    }

    readAll(): string {
        return null;
    }

    readAllBytes(): number[] {
        return null;
    }

    readAllChars(): string[] {
        return null;
    }

    readAllLines(): string[] {
        return null;
    }

    readAllNumbers(): number[] {
        return null;
    }

    readAllStrings(): string[] {
        return null;
    }
}