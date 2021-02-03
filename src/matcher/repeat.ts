import { Matcher, Params, State } from './matcher';

class PartialRepeatMatcher extends Matcher {
    constructor(params: Params, state: State, childID: number) {
        super(params, state);
    }

    protected nextImpl(): State | null {
        throw new Error('Method not implemented.');
    }
}

export default class RepeatMatcher extends Matcher {
    constructor(params: Params, state: State, childID: number) {
        super(params, state);
    }

    protected nextImpl(): State | null {
        throw new Error('Method not implemented.');
    }
}
