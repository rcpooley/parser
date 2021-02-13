import Match from '.';
import { Section } from '../parser';
import { Matcher, MatchError, Params, State } from './matcher';

/**
 * Returned state is not wrapped in group
 */
export class PartialGroupMatcher extends Matcher {
    private firstChildMatcher: Matcher | MatchError;
    private firstSections: Section[] | null;
    private remainingChildrenIDs: number[];
    private remainingMatcher: Matcher | null;

    constructor(params: Params, childrenIDs: number[]) {
        super(params);
        this.firstChildMatcher = Match(this.getParams(childrenIDs[0]));
        if (!(this.firstChildMatcher instanceof Matcher)) {
            this.setError(this.firstChildMatcher);
        }
        this.firstSections = null;
        this.remainingChildrenIDs = childrenIDs.slice(1);
        this.remainingMatcher = null;
    }

    protected nextImpl(): State | null {
        if (this.firstSections === null) {
            this.firstSections = this.nextFirstSections();
            if (this.firstSections === null) {
                return null;
            }
        }
        if (this.remainingChildrenIDs.length === 0) {
            const { firstSections } = this;
            this.firstSections = null; // So next time we will load new sections
            return {
                sections: firstSections,
            };
        }
        while (this.firstSections !== null) {
            const matcher = this.getRemainingMatcher(this.firstSections);
            if (!matcher.hasNext()) {
                this.firstSections = this.nextFirstSections();
                continue;
            }
            return {
                sections: matcher.next().sections,
            };
        }
        return null;
    }

    private getRemainingMatcher(sections: Section[]): Matcher {
        if (this.remainingMatcher === null) {
            this.remainingMatcher = new PartialGroupMatcher(
                this.getParams(-1, sections, this.params.index + 1),
                this.remainingChildrenIDs
            );
            if (!this.remainingMatcher.hasNext()) {
                this.setError(this.remainingMatcher.getError());
            }
        }
        return this.remainingMatcher;
    }

    private nextFirstSections(): Section[] | null {
        this.remainingMatcher = null;
        if (this.firstChildMatcher instanceof Matcher) {
            return this.firstChildMatcher.nextOrNull()?.sections || null;
        } else {
            return null;
        }
    }
}

export default class GroupMatcher extends Matcher {
    private matcher: Matcher;

    constructor(params: Params, private childrenIDs: number[]) {
        super(params);
        this.matcher = new PartialGroupMatcher(params, childrenIDs);
        if (!this.matcher.hasNext()) {
            this.setError(this.matcher.getError());
        }
    }

    protected nextImpl(): State | null {
        const partial = this.matcher.nextOrNull();
        if (partial === null) {
            return null;
        }
        return this.groupChildren(
            partial.sections,
            this.childrenIDs.length,
            'group'
        );
    }
}
