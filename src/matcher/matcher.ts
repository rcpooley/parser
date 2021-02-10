import { ComplexType, Section } from '../parser';
import Schema from '../schema';

export type Params = {
    schema: Schema;
    id: number;
    sections: Section[];
    index: number;
};

export type State = {
    sections: Section[];
};

export abstract class Matcher {
    private buffer: State | null | undefined;

    constructor(protected params: Params) {
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

    protected getParams(
        id: number,
        sections?: Section[],
        index?: number
    ): Params {
        return {
            schema: this.params.schema,
            id,
            sections: sections ?? this.params.sections,
            index: index ?? this.params.index,
        };
    }

    protected groupChildren(
        sections: Section[],
        length: number,
        type: ComplexType
    ): State {
        const newSections = sections.slice();
        const children = newSections.splice(this.params.index, length);
        newSections.splice(this.params.index, 0, {
            type,
            id: this.params.id,
            firstIDs: this.nextFirstIDs(children),
            children,
            length: children
                .map((section) => section.length)
                .reduce((a, b) => a + b, 0),
        });
        return {
            sections: newSections,
        };
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
