import Match from '.';
import { RepeatType } from '../schema';
import { PartialGroupMatcher } from './group';
import { Matcher, MatcherAndSections, Params, State } from './matcher';

class PartialRepeatMatcher extends Matcher {
    private matcher: MatcherAndSections;
    private remainingMatcher: PartialRepeatMatcher | null;
    length: number;

    constructor(
        params: Params,
        state: State,
        private repeatID: number,
        private separatorID: number | null
    ) {
        super(params, state);
        let matcher: Matcher;
        if (separatorID !== null) {
            matcher = new PartialGroupMatcher(this.getParams(-1), state, [
                repeatID,
                separatorID,
            ]);
        } else {
            matcher = Match(this.getParams(repeatID), state);
        }
        this.matcher = new MatcherAndSections(matcher);
        this.remainingMatcher = null;
        this.length = 0;
    }

    protected nextImpl(): State | null {
        let sections = this.matcher.getSections();
        if (sections === null) {
            this.length = 0;
            return null;
        }
        if (this.remainingMatcher === null) {
            this.remainingMatcher = new PartialRepeatMatcher(
                this.params,
                {
                    sections,
                    index:
                        this.state.index + (this.separatorID === null ? 1 : 2),
                },
                this.repeatID,
                this.separatorID
            );
            if (!this.remainingMatcher.hasNext()) {
                this.remainingMatcher = null;
                this.matcher.next();
                this.length = 1;
                return { sections, index: this.state.index };
            }
        }
        if (!this.remainingMatcher.hasNext()) {
            this.remainingMatcher = null;
            this.matcher.next();
            return this.nextImpl();
        }
        sections = this.remainingMatcher.next().sections;
        this.length = this.remainingMatcher.length + 1;
        return {
            sections,
            index: this.state.index,
        };
    }
}

export default class RepeatMatcher extends Matcher {
    private matcher: PartialRepeatMatcher;
    private endMatcher: Matcher | null;
    private returnedEmpty: boolean;

    constructor(params: Params, state: State, private type: RepeatType) {
        super(params, state);
        this.matcher = new PartialRepeatMatcher(
            params,
            state,
            type.childID,
            type.separator?.id || null
        );
        this.endMatcher = null;
        this.returnedEmpty = false;
    }

    protected nextImpl(): State | null {
        const check = this.endMatcherNext();
        if (check !== null) {
            return check;
        }
        if (!this.matcher.hasNext()) {
            if (this.returnedEmpty || this.type.minElementCount > 0) {
                return null;
            }
            this.returnedEmpty = true;
            return this.groupChildren(this.state.sections, 0, 'repeat');
        }
        const sections = this.matcher.next().sections;
        // Guaranteed that matcher.length > 0

        if (this.type.separator === null) {
            return this.groupChildren(sections, this.matcher.length, 'repeat');
        } else if (this.type.separator.end === true) {
            // Separator required at end so don't need to match another child
            return this.groupChildren(
                sections,
                this.matcher.length * 2,
                'repeat'
            );
        } else {
            // Separator optional or required not at end so try to match another child
            this.endMatcher = Match(this.getParams(this.type.childID), {
                sections,
                index: this.state.index + this.matcher.length * 2,
            });
            const check = this.endMatcherNext();
            if (check !== null) {
                // Child found, safe to return for both options
                return check;
            }
            if (this.type.separator.end === 'optional') {
                return this.groupChildren(
                    sections,
                    this.matcher.length * 2,
                    'repeat'
                );
            } else {
                // Child not found, remove last separator from repeat
                return this.groupChildren(
                    sections,
                    this.matcher.length * 2 - 1,
                    'repeat'
                );
            }
        }
    }

    private endMatcherNext(): State | null {
        if (this.endMatcher !== null && this.endMatcher.hasNext()) {
            return this.groupChildren(
                this.endMatcher.next().sections,
                this.matcher.length * 2 + 1,
                'repeat'
            );
        }
        this.endMatcher = null;
        return null;
    }
}
