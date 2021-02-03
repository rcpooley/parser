import Match from '.';
import { Matcher, Params, State } from './matcher';

export default class OptionalMatcher extends Matcher {
    private matcher: Matcher;
    private returnedEmptyOptional: boolean;

    constructor(params: Params, state: State, childID: number) {
        super(params, state);
        this.matcher = Match(this.getParams(childID), state);
        this.returnedEmptyOptional = false;
    }

    protected nextImpl(): State | null {
        const { params, state } = this;
        if (this.returnedEmptyOptional) {
            return null;
        }
        const check = this.matcher.nextOrNull();
        let newSections;
        if (check === null) {
            this.returnedEmptyOptional = true;
            newSections = state.sections.slice();
            newSections.splice(state.index, 0, {
                type: 'optional',
                id: params.id,
                firstIDs: [],
                children: [],
                length: 0,
            });
        } else {
            newSections = check.sections.slice();
            const children = newSections.splice(state.index, 1);
            newSections.splice(state.index, 0, {
                type: 'optional',
                id: params.id,
                firstIDs: this.nextFirstIDs(children),
                children,
                length: this.combinedLength(children),
            });
        }
        return {
            sections: newSections,
            index: state.index,
        };
    }
}
