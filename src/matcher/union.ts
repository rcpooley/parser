import Match from '.';
import { Matcher, Params, State } from './matcher';

export default class UnionMatcher extends Matcher {
    private matchers: Matcher[];
    private childIndex: number;
    private loadedAllMatchers: boolean;

    constructor(params: Params, private childrenIDs: number[]) {
        super(params);
        this.matchers = [];
        this.childIndex = 0;
        this.loadedAllMatchers = false;
    }

    nextImpl(): State | null {
        const matcher = this.nextMatcher();
        if (matcher === null) {
            return null;
        }
        const next = matcher.next();
        return this.groupChildren(next.sections, 1, 'union');
    }

    private nextMatcher(): Matcher | null {
        const { childrenIDs } = this;
        if (!this.loadedAllMatchers) {
            if (this.childIndex < childrenIDs.length) {
                const matcher = Match(
                    this.getParams(childrenIDs[this.childIndex++])
                );
                if (!matcher.hasNext()) {
                    return this.nextMatcher();
                }
                this.matchers.push(matcher);
                return matcher;
            } else {
                this.childIndex = 0;
                this.loadedAllMatchers = true;
            }
        }
        while (this.matchers.length > 0) {
            while (this.childIndex < this.matchers.length) {
                const matcher = this.matchers[this.childIndex];
                if (matcher.hasNext()) {
                    this.childIndex++;
                    return matcher;
                }
                this.matchers.splice(this.childIndex, 1);
            }
            this.childIndex = 0;
        }
        return null;
    }
}
