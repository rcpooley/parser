import GroupMatcher from './group';
import { Matcher, MatchError, Params } from './matcher';
import OptionalMatcher from './optional';
import RepeatMatcher from './repeat';
import SimpleMatcher from './simple';
import UnionMatcher from './union';

export default function Match(params: Params): Matcher | MatchError {
    if (params.index >= params.sections.length) {
        return {
            sections: params.sections,
            errorStart: params.index,
            errorEnd: params.index,
            exception: {
                type: 'noToken',
                expectedID: params.id,
            },
        };
    }

    const type = params.schema.getType(params.id);
    let matcher;
    switch (type.type) {
        case 'string':
        case 'tokenTag':
            matcher = new SimpleMatcher(params);
            break;
        case 'union':
            matcher = new UnionMatcher(params, type.childrenIDs);
            break;
        case 'group':
            matcher = new GroupMatcher(params, type.childrenIDs);
            break;
        case 'repeat':
            matcher = new RepeatMatcher(params, type);
            break;
        case 'optional':
            matcher = new OptionalMatcher(params, type.childID);
            break;
    }

    if (!matcher.hasNext()) {
        return matcher.getError();
    }

    return matcher;
}
