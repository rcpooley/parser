import GroupMatcher from './group';
import { Matcher, Params, State } from './matcher';
import OptionalMatcher from './optional';
import RepeatMatcher from './repeat';
import SimpleMatcher from './simple';
import UnionMatcher from './union';

class NullMatcher extends Matcher {
    protected nextImpl(): State | null {
        return null;
    }
}

export default function Match(params: Params): Matcher {
    const nullMatcher = new NullMatcher(params);
    if (params.index >= params.sections.length) {
        return nullMatcher;
    }

    const type = params.schema.getType(params.id);

    switch (type.type) {
        case 'string':
        case 'tokenTag':
            return new SimpleMatcher(params);
        case 'union':
            return new UnionMatcher(params, type.childrenIDs);
        case 'group':
            return new GroupMatcher(params, type.childrenIDs);
        case 'repeat':
            return new RepeatMatcher(params, type);
        case 'optional':
            return new OptionalMatcher(params, type.childID);
    }

    return nullMatcher;
}
