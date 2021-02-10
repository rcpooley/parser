import Match from '.';
import { Matcher, Params, State } from './matcher';

export default class OptionalMatcher extends Matcher {
    private matcher: Matcher;
    private returnedEmptyOptional: boolean;

    constructor(params: Params, childID: number) {
        super(params);
        this.matcher = Match(this.getParams(childID));
        this.returnedEmptyOptional = false;
    }

    protected nextImpl(): State | null {
        if (this.returnedEmptyOptional) {
            return null;
        }
        const check = this.matcher.nextOrNull();
        if (check === null) {
            this.returnedEmptyOptional = true;
            return this.groupChildren(this.params.sections, 0, 'optional');
        } else {
            return this.groupChildren(check.sections, 1, 'optional');
        }
    }
}
