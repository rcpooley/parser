import { ComplexType, Section } from '../parser';
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

    protected groupChildren(
        sections: Section[],
        length: number,
        type: ComplexType
    ): State {
        const children = sections.splice(this.state.index, length);
        sections.splice(this.state.index, 0, {
            type,
            id: this.params.id,
            firstIDs: this.nextFirstIDs(children),
            children,
            length: this.combinedLength(children),
        });
        return {
            sections,
            index: this.state.index,
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

export class MatcherAndSections {
    private sections: Section[] | null;

    constructor(private matcher: Matcher) {
        this.sections = null;
    }

    getSections(): Section[] | null {
        if (this.sections === null) {
            this.sections = this.matcher.nextOrNull()?.sections || null;
        }
        return this.sections;
    }

    next() {
        this.sections = null;
    }
}
