import Match from '.';
import { RepeatType } from '../schema';
import { Matcher, MatcherAndSections, Params, State } from './matcher';

class PartialRepeatMatcher extends Matcher {
    private matcher: MatcherAndSections;
    private remainingMatcher: PartialRepeatMatcher | null;
    private nextMatchSeparator: boolean;
    length: number;
    separatorAtEnd: boolean;

    constructor(
        params: Params,
        private type: RepeatType,
        private matchSeparator: boolean
    ) {
        super(params);
        let matcher: Matcher;
        if (matchSeparator) {
            if (type.separator === null) {
                throw new Error('not possible');
            }
            matcher = Match(this.getParams(type.separator.id));
            this.nextMatchSeparator = false;
        } else {
            matcher = Match(this.getParams(type.childID));
            this.nextMatchSeparator = type.separator !== null;
        }
        this.matcher = new MatcherAndSections(matcher);
        this.remainingMatcher = null;
        this.length = 0;
        this.separatorAtEnd = false;
    }

    protected nextImpl(): State | null {
        let sections = this.matcher.getSections();
        // Make sure we matched at least one child (to fix repeat of optional infinite)
        if (sections === null || sections[this.params.index].length === 0) {
            this.length = 0;
            this.separatorAtEnd = false;
            return null;
        }
        if (this.remainingMatcher === null) {
            this.remainingMatcher = new PartialRepeatMatcher(
                this.getParams(-1, sections, this.params.index + 1),
                this.type,
                this.nextMatchSeparator
            );
            if (!this.remainingMatcher.hasNext()) {
                this.remainingMatcher = null;
                this.matcher.next();
                if (
                    this.type.separator !== null &&
                    this.type.separator.end !== 'optional' &&
                    this.type.separator.end !== this.matchSeparator
                ) {
                    return this.nextImpl();
                }
                this.length = 1;
                this.separatorAtEnd = this.matchSeparator;
                return { sections };
            }
        }
        if (!this.remainingMatcher.hasNext()) {
            this.remainingMatcher = null;
            this.matcher.next();
            return this.nextImpl();
        }
        sections = this.remainingMatcher.next().sections;
        this.length = this.remainingMatcher.length + 1;
        this.separatorAtEnd = this.remainingMatcher.separatorAtEnd;
        return {
            sections,
        };
    }
}

export default class RepeatMatcher extends Matcher {
    private matcher: PartialRepeatMatcher;
    private returnedAny: boolean;

    constructor(params: Params, private type: RepeatType) {
        super(params);
        this.matcher = new PartialRepeatMatcher(params, type, false);
        this.returnedAny = false;
    }

    protected nextImpl(): State | null {
        if (!this.matcher.hasNext()) {
            if (this.returnedAny || this.type.minElementCount > 0) {
                return null;
            }
            this.returnedAny = true;
            return this.groupChildren(this.params.sections, 0, 'repeat');
        }
        // Guaranteed that matcher.length > 0
        const sections = this.matcher.next().sections;
        let numElements = this.matcher.length;
        if (this.type.separator !== null) {
            numElements = Math.floor((numElements + 1) / 2);
        }
        if (numElements < this.type.minElementCount) {
            return this.nextImpl();
        }
        this.returnedAny = true;
        return this.groupChildren(sections, this.matcher.length, 'repeat');
    }
}
