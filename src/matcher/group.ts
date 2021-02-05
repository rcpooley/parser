import Match from '.';
import { Section } from '../parser';
import { Matcher, Params, State } from './matcher';

/**
 * Returned state is not wrapped in group
 */
export class PartialGroupMatcher extends Matcher {
    private firstChildMatcher: Matcher;
    private firstSections: Section[] | null;
    private remainingChildrenIDs: number[];
    private remainingMatcher: Matcher | null;

    constructor(params: Params, state: State, childrenIDs: number[]) {
        super(params, state);
        this.firstChildMatcher = Match(
            this.getParams(childrenIDs[0]),
            this.state
        );
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
                index: this.state.index,
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
                index: this.state.index,
            };
        }
        return null;
    }

    private getRemainingMatcher(sections: Section[]): Matcher {
        if (this.remainingMatcher === null) {
            this.remainingMatcher = new PartialGroupMatcher(
                this.getParams(-1),
                {
                    sections,
                    index: this.state.index + 1,
                },
                this.remainingChildrenIDs
            );
        }
        return this.remainingMatcher;
    }

    private nextFirstSections(): Section[] | null {
        this.remainingMatcher = null;
        return this.firstChildMatcher.nextOrNull()?.sections || null;
    }
}

export default class GroupMatcher extends Matcher {
    private matcher: Matcher;

    constructor(params: Params, state: State, private childrenIDs: number[]) {
        super(params, state);
        this.matcher = new PartialGroupMatcher(params, state, childrenIDs);
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
