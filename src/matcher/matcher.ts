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

export type MatchError = {
    sections: Section[];
    errorStart: number;
    errorEnd: number;
    expectedID?: number;
    comment?: string;
};

export abstract class Matcher {
    private buffer: State | null | undefined;
    protected returnedAtLeastOne: boolean;
    private error: MatchError | null;

    constructor(protected params: Params) {
        this.buffer = undefined;
        this.returnedAtLeastOne = false;
        this.error = null;
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
            if (this.buffer !== null) {
                this.returnedAtLeastOne = true;
            }
        }
        return this.buffer;
    }

    hasNext(): boolean {
        return this.peekOrNull() !== null;
    }

    getError(): MatchError {
        if (this.error === null) {
            throw new Error('Called getError() but no error is available');
        }
        return this.error;
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
        let nextFirstIDs: number[] = [];
        if (children.length > 0) {
            const s = children[0];
            nextFirstIDs = [s.id, ...s.firstIDs];
        }
        newSections.splice(this.params.index, 0, {
            type,
            id: this.params.id,
            firstIDs: nextFirstIDs,
            children,
            length: children
                .map((section) => section.length)
                .reduce((a, b) => a + b, 0),
        });
        return {
            sections: newSections,
        };
    }

    protected setError(error: MatchError) {
        if (this.error !== null && error.token !== null) {
            if (this.error.token === null) return;
            const pNew = error.token.position;
            const pOld = this.error.token.position;
            if (
                pNew.line < pOld.line ||
                (pNew.line === pOld.line && pNew.column <= pOld.column)
            )
                return;
        }
        this.error = error;
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
