import { Section } from '../parser';
import Schema from '../schema';

export type Params = {
    schema: Schema;
    id: number;
};

export type State = {
    sections: Section[];
    index: number;
};

export abstract class Matcher {
    private buffer: State | null | undefined;

    constructor(protected params: Params, protected state: State) {
        this.buffer = undefined;
    }

    next(): State {
        const check = this.nextOrNull();
        if (check === null) {
            throw new Error('next() was called but nothing is available');
        }
        return check;
    }

    peek(): State {
        const check = this.peekOrNull();
        if (check === null) {
            throw new Error('peek() was called but nothing is available');
        }
        return check;
    }

    nextOrNull(): State | null {
        const next = this.peekOrNull();
        this.buffer = undefined;
        return next;
    }

    peekOrNull(): State | null {
        if (this.buffer === undefined) {
            this.buffer = this.nextImpl();
        }
        return this.buffer;
    }

    hasNext(): boolean {
        return this.peekOrNull() !== null;
    }

    protected abstract nextImpl(): State | null;

    protected getParams(id: number): Params {
        return {
            schema: this.params.schema,
            id,
        };
    }

    protected combinedLength(sections: Section[]): number {
        return sections
            .map((section) => section.length)
            .reduce((a, b) => a + b, 0);
    }

    protected nextFirstIDs(sections: Section[]): number[] {
        if (sections.length === 0) {
            return [];
        } else {
            const s = sections[0];
            return [s.id, ...s.firstIDs];
        }
    }
}
