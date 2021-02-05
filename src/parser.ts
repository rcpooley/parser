import Match from './matcher';
import Schema from './schema';
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

export type ComplexType = 'group' | 'union' | 'repeat' | 'optional';

type ComplexSection = BaseSection & {
    type: ComplexType;
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

/*
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
*/
