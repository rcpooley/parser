import GroupMatcher from './group';
import { Matcher, Params, State } from './matcher';
import OptionalMatcher from './optional';
import SimpleMatcher from './simple';
import UnionMatcher from './union';

class NullMatcher extends Matcher {
    protected nextImpl(): State | null {
        return null;
    }
}

export default function Match(params: Params, state: State): Matcher {
    const nullMatcher = new NullMatcher(params, state);
    if (state.index >= state.sections.length) {
        return nullMatcher;
    }

    const type = params.schema.getType(params.id);

    switch (type.type) {
        case 'string':
        case 'tokenTag':
            return new SimpleMatcher(params, state);
        case 'union':
            return new UnionMatcher(params, state, type.childrenIDs);
        case 'group':
            return new GroupMatcher(params, state, type.childrenIDs);
        case 'optional':
            return new OptionalMatcher(params, state, type.childID);
    }

    return nullMatcher;
}
