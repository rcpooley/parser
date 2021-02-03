import Match from './matcher';
import Schema, { Type } from './schema';
import { Token, TokenDelta } from './tokenizer';

type BaseSection = {
    id: number;
    firstIDs: number[];
    children: Section[];
    length: number;
};

export type TokenSection = BaseSection & {
    type: 'token';
    token: Token;
    length: 1;
};

type ComplexSection = BaseSection & {
    type: 'group' | 'union' | 'oneOrMore' | 'repeat' | 'optional';
};

export type Section = TokenSection | ComplexSection;

const NULL_ID = Number.NaN;

export default class Parser {
    constructor(private schema: Schema, private baseType: number) {}

    setTokens(tokens: Token[]): Section | null {
        const matcher = Match(
            {
                schema: this.schema,
                id: this.baseType,
            },
            {
                sections: this.convertTokensToSections(tokens),
                index: 0,
            }
        );
        const state = matcher.nextOrNull();
        if (state === null) {
            return null;
        }
        if (state.sections.length === 0) {
            throw new Error('not possible');
        }
        return state.sections[0];
    }

    onChange(delta: TokenDelta): Section | null {
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
                    children: [],
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
    fakeTypes: Type[];
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
    const type = getType(params);

    // Custom logic required for repeat to possibly merge two sections
    if (section.id === params.id && type.type !== 'repeat') {
        return state;
    }

    if (type.type === 'union') {
        const check = matchUnion(params, state, type.childrenIDs);
        if (check !== null) return check;
    } else if (type.type === 'group') {
        const check = matchGroup(params, state, type.childrenIDs);
        if (check !== null) return check;
    } else if (type.type === 'oneOrMore') {
        const check = matchOneOrMore(params, state, type.childID);
        if (check !== null) return check;
    } else if (type.type === 'repeat') {
        return matchRepeat(params, state, type.childID);
    } else if (type.type === 'optional') {
        return matchOptional(params, state, type.childID);
    }

    // Try breaking down
    if (section.type === 'token') {
        return null;
    }
    const newSections = state.sections.slice();
    newSections.splice(state.index, 1, ...section.children);
    return match(params, {
        ...state,
        sections: newSections,
    });
}

function matchUnion(
    params: Params,
    state: State,
    childrenIDs: number[]
): State | null {
    // TODO may be able to optimize this with intersection between type.childrenIDs and section.firstIDs
    for (let i = 0; i < childrenIDs.length; i++) {
        const check = match(getParams(params, childrenIDs[i]), state);
        if (check !== null) {
            // return matchUnion(params, check, type); // will be caught by first if statement
            const newSections = check.sections.slice();
            const child = newSections[state.index];
            newSections[state.index] = {
                type: 'union',
                id: params.id,
                children: [child],
                length: child.length,
                firstIDs: nextFirstIDs([child]),
            };
            return {
                ...state,
                sections: newSections,
            };
        }
    }

    return null;
}

function matchGroup(
    params: Params,
    state: State,
    childrenIDs: number[]
): State | null {
    let curState: State = state;
    let success = true;
    // TODO may be able to optimize this with intersection between type.childrenIDs and section.firstIDs
    for (let i = 0; i < childrenIDs.length; i++) {
        const nextState = match(getParams(params, childrenIDs[i]), {
            ...curState,
            index: state.index + i,
        });
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
        const children = newSections.splice(state.index, childrenIDs.length);
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

function matchOneOrMore(
    params: Params,
    state: State,
    childID: number
): State | null {
    const section = state.sections[state.index];

    if (section.id === params.id) {
        if (section.type !== 'oneOrMore') {
            throw new Error('not possible');
        }
        // Try to read another oneOrMore
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
        if (victim.type !== 'oneOrMore') {
            throw new Error('not possible');
        }
        newSections[state.index] = {
            type: 'oneOrMore',
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
        const check = match(getParams(params, childID), {
            ...curState,
            index: state.index + numChildren,
        });
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
        type: 'oneOrMore',
        id: params.id,
        children,
        firstIDs: nextFirstIDs(children),
        length: combinedLength(children),
    });

    // Try to match another oneOrMore (will be caught by first if statement)
    return matchOneOrMore(
        params,
        {
            sections: newSections,
            index: state.index,
            errors: curState.errors,
        },
        childID
    );
}

function matchRepeat(params: Params, state: State, childID: number): State {
    // Create fake type
    const newParams = createFakeType(params, {
        type: 'oneOrMore',
        childID,
    });
    const oneOrMoreID = newParams.id;

    const check = matchOptional(
        getParams(newParams, NULL_ID),
        state,
        oneOrMoreID
    );
    const section = check.sections[state.index];
    const child = section.children[0]; // oneOrMore | undefined
    if (!child) {
        check.sections[state.index] = {
            type: 'repeat',
            id: params.id,
            firstIDs: [],
            children: [],
            length: 0,
        };
    } else {
        check.sections[state.index] = {
            ...child,
            type: 'repeat',
            id: params.id,
        };
    }

    return check;
}

function matchOptional(params: Params, state: State, childID: number): State {
    const check = match(getParams(params, childID), state);
    let newSections;
    if (check === null) {
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
            firstIDs: nextFirstIDs(children),
            children,
            length: combinedLength(children),
        });
    }
    return {
        ...state,
        sections: newSections,
    };
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

function getParams(params: Params, id: number): Params {
    return {
        schema: params.schema,
        id,
        fakeTypes: params.fakeTypes,
    };
}

function createFakeType(params: Params, fakeType: Type): Params {
    const newFakeTypes = params.fakeTypes.slice();
    newFakeTypes.push(fakeType);
    return {
        schema: params.schema,
        id: -newFakeTypes.length,
        fakeTypes: newFakeTypes,
    };
}

function getType(params: Params): Type {
    if (params.id < 0) {
        const type = params.fakeTypes[-params.id - 1];
        if (!type) {
            throw new Error('Invalid fake ID');
        }
        return type;
    } else {
        return params.schema.getType(params.id);
    }
}
