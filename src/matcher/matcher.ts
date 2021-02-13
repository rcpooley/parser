import { ComplexType, Section } from '../parser';
import Schema from '../schema';
import { getErrorRange } from '../util';

export type Params = {
    schema: Schema;
    id: number;
    sections: Section[];
    index: number;
};

export type State = {
    sections: Section[];
};

type WrongTokenException = {
    type: 'wrongToken';
    expectedID: number;
};

type NoTokenException = {
    type: 'noToken';
    expectedID: number;
};

type RepeatMinimumElements = {
    type: 'repeatMinimumElements';
};

export type MatchException =
    | WrongTokenException
    | NoTokenException
    | RepeatMinimumElements;

export type MatchError = {
    sections: Section[];
    errorStart: number;
    errorEnd: number;
    exception: MatchException;
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
        let tokenIndex;
        if (children.length > 0) {
            const s = children[0];
            nextFirstIDs = [s.id, ...s.firstIDs];
            tokenIndex = s.tokenIndex;
        } else if (this.params.index > 0) {
            const previous = sections[this.params.index - 1];
            tokenIndex = previous.tokenIndex + previous.length;
        } else {
            tokenIndex = 0;
        }
        newSections.splice(this.params.index, 0, {
            type,
            id: this.params.id,
            firstIDs: nextFirstIDs,
            children,
            tokenIndex,
            length: children
                .map((section) => section.length)
                .reduce((a, b) => a + b, 0),
        });
        return {
            sections: newSections,
        };
    }

    protected setError(error: MatchError) {
        if (this.error !== null) {
            if (this.error.exception.type === 'noToken') return;
            if (error.exception.type === 'noToken') {
                this.error = error;
                return;
            }
            const curRange = getErrorRange(this.error);
            const newRange = getErrorRange(error);
            if (newRange[1] <= curRange[1]) return;
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
