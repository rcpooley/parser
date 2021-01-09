import Schema, { GroupType, RepeatType, UnionType } from './schema';
import { Token, TokenDelta } from './tokenizer';

type BaseSection = {
    id: number;
    firstIDs: number[];
    length: number;
};

type TokenSection = BaseSection & {
    type: 'token';
    token: Token;
    length: 1;
};

type GroupSection = BaseSection & {
    type: 'group';
    children: Section[];
};

type UnionSection = BaseSection & {
    type: 'union';
    child: Section;
};

type RepeatSection = BaseSection & {
    type: 'repeat';
    children: Section[];
};

type Section = TokenSection | GroupSection | UnionSection | RepeatSection;

const NULL_ID = -1;

export default class Parser {
    constructor(private schema: Schema, private baseType: number) {}

    setTokens(tokens: Token[]): Section {
        const state = match(
            {
                schema: this.schema,
                id: this.baseType,
            },
            {
                sections: this.convertTokensToSections(tokens),
                index: 0,
                errors: 0,
            }
        );
        throw new Error('not implemented');
    }

    onChange(delta: TokenDelta): Section {
        throw new Error('not implemented');
    }

    private convertTokensToSections(tokens: Token[]): TokenSection[] {
        return tokens.map((token) => {
            const o = (id: number) => {
                const sec: TokenSection = {
                    type: 'token',
                    id,
                    token,
                    length: 1,
                    firstIDs: [],
                };
                return sec;
            };
            if (token.tag !== null) {
                const id = this.schema.tokenTagIDs.get(token.tag);
                if (id !== undefined) {
                    return o(id);
                }
            }
            const id = this.schema.stringIDs.get(token.value);
            if (id !== undefined) {
                return o(id);
            }
            // TODO mark token as error
            return o(NULL_ID);
        });
    }
}

type Params = {
    schema: Schema;
    id: number;
};

type State = {
    sections: Section[];
    index: number;
    errors: number;
};

/**
 * @returns state where sections[index].id === id, or null.
 * index will remain unchanged
 */
function match(params: Params, state: State): State | null {
    if (state.index >= state.sections.length) {
        return null;
    }

    const section = state.sections[state.index];
    const type = params.schema.getType(params.id);

    // Custom logic required for repeat to possibly merge two sections
    if (section.id === params.id && type.type !== 'repeat') {
        return state;
    }

    if (type.type === 'union') {
        const check = matchUnion(params, state, type);
        if (check !== null) return check;
    } else if (type.type === 'group') {
        const check = matchGroup(params, state, type);
        if (check !== null) return check;
    } else if (type.type === 'repeat') {
        const check = matchRepeat(params, state, type);
        if (check !== null) return check;
    }

    // Try breaking down
    const newSections = state.sections.slice();
    if (section.type === 'group' || section.type === 'repeat') {
        newSections.splice(state.index, 1, ...section.children);
    } else if (section.type === 'union') {
        newSections.splice(state.index, 1, section.child);
    } else {
        return null;
    }
    return match(params, {
        ...state,
        sections: newSections,
    });
}

function matchUnion(
    params: Params,
    state: State,
    type: UnionType
): State | null {
    const section = state.sections[state.index];

    if (type.childrenIDs.includes(section.id)) {
        const newSections = state.sections.slice();
        newSections[state.index] = {
            type: 'union',
            id: params.id,
            child: section,
            length: section.length,
            firstIDs: nextFirstIDs([section]),
        };
        return {
            ...state,
            sections: newSections,
        };
    }
    // TODO may be able to optimize this with intersection between type.childrenIDs and section.firstIDs
    for (let i = 0; i < type.childrenIDs.length; i++) {
        const check = match(
            {
                ...params,
                id: type.childrenIDs[i],
            },
            state
        );
        if (check !== null) {
            return matchUnion(params, check, type); // will be caught by first if statement
        }
    }

    return null;
}

function matchGroup(
    params: Params,
    state: State,
    type: GroupType
): State | null {
    let curState: State = state;
    let success = true;
    // TODO may be able to optimize this with intersection between type.childrenIDs and section.firstIDs
    for (let i = 0; i < type.childrenIDs.length; i++) {
        const nextState = match(
            {
                ...params,
                id: type.childrenIDs[i],
            },
            {
                ...curState,
                index: state.index + i,
            }
        );
        if (nextState === null) {
            success = false;
            break;
        } else {
            curState = nextState;
        }
    }
    if (success) {
        // Merge sections into group
        const newSections = curState.sections.slice();
        const children = newSections.splice(
            state.index,
            type.childrenIDs.length
        );
        newSections.splice(state.index, 0, {
            type: 'group',
            id: params.id,
            children,
            length: combinedLength(children),
            firstIDs: nextFirstIDs(children),
        });
        return {
            ...state,
            sections: newSections,
            errors: curState.errors,
        };
    }
    return null;
}

function matchRepeat(
    params: Params,
    state: State,
    type: RepeatType
): State | null {
    const section = state.sections[state.index];

    if (section.id === params.id) {
        if (section.type !== 'repeat') {
            throw new Error('not possible');
        }
        // Try to read another repeat
        const check = match(params, {
            ...state,
            index: state.index + 1,
        });

        if (check === null) {
            return state;
        }

        // Merge sections
        const newSections = state.sections.slice();
        const victim = newSections.splice(state.index + 1, 1)[0];
        if (victim.type !== 'repeat') {
            throw new Error('not possible');
        }
        newSections[state.index] = {
            type: 'repeat',
            id: params.id,
            firstIDs: section.firstIDs,
            children: section.children.concat(victim.children),
            length: section.length + victim.length,
        };
        return {
            ...state,
            sections: newSections,
            errors: check.errors,
        };
    }

    // Match as many children as possible
    let curState: State = state;
    let numChildren = 0;
    while (true) {
        const check = match(
            { ...params, id: type.childID },
            {
                ...curState,
                index: state.index + numChildren,
            }
        );
        if (check === null) {
            break;
        }
        numChildren++;
        curState = check;
    }
    if (numChildren === 0) {
        return null;
    }

    // Combine children
    const newSections = curState.sections.slice();
    const children = newSections.splice(state.index, numChildren);
    newSections.splice(state.index, 0, {
        type: 'repeat',
        id: params.id,
        children,
        firstIDs: nextFirstIDs(children),
        length: combinedLength(children),
    });

    // Try to match another repeat (will be caught by first if statement)
    return matchRepeat(
        params,
        {
            sections: newSections,
            index: state.index,
            errors: curState.errors,
        },
        type
    );
}

function nextFirstIDs(sections: Section[]): number[] {
    if (sections.length === 0) {
        return [];
    } else {
        const s = sections[0];
        return [s.id, ...s.firstIDs];
    }
}

function combinedLength(sections: Section[]): number {
    return sections.map((section) => section.length).reduce((a, b) => a + b, 0);
}
