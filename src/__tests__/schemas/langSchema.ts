import { Section, TokenSection } from '../../parser';
import Schema from '../../schema';
import Tokenizer, { TAG_WORD } from '../../tokenizer';

const schema = new Schema();
const word = schema.tokenTag(TAG_WORD);
const operator = schema.union('+', '-', '*', '/');

const typeBuilder = schema.build();
const typeWithComma = schema.group(typeBuilder.id, ',');
const typeList = schema.group(schema.oneOrMore(typeWithComma), typeBuilder.id);
const genericType = schema.group(word, '<', typeList, '>');
const type = typeBuilder.union(genericType, word);

const valueBuilder = schema.build();
const dotIndexValue = schema.group(valueBuilder.id, '.', word);
const bracketIndexValue = schema.group(
    valueBuilder.id,
    '[',
    valueBuilder.id,
    ']'
);
// const operatorValue =

type GenericType = {
    name: string;
    children: Type[];
};
type Type = string | GenericType;

function parseType(section: Section): Type {
    assert(section.id, type);
    const impl = child(section, 0);
    if (impl.type === 'token') {
        assert(impl.id, word);
        return impl.token.value;
    } else {
        assert(impl.id, genericType);
        const name = token(child(impl, 0)).token.value;
        const children = parseTypeList(child(impl, 2));
        return {
            name,
            children,
        };
    }
}

function parseTypeList(section: Section): Type[] {
    assert(section.id, typeList);
    const types: Type[] = [];
    const repeat = child(section, 0);
    assert(repeat.type, 'oneOrMore');
    repeat.children.forEach((sec) => {
        assert(sec.id, typeWithComma);
        types.push(parseType(child(sec, 0)));
    });
    types.push(parseType(child(section, 1)));
    return types;
}

function child(section: Section, idx: number): Section {
    const child = section.children[idx];
    if (!child) throw new Error('Child not found');
    return child;
}

function token(section: Section): TokenSection {
    if (section.type !== 'token') {
        throw new Error('Not a token section');
    }
    return section;
}

function assert(a: any, b: any) {
    if (a !== b) {
        throw new Error(`${a} does not match ${b}`);
    }
}

export default {
    schema,
    tokenizer: new Tokenizer([]),
    baseType: type,
    parse: parseType,
};
