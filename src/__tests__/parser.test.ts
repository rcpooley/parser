import Parser, { Section } from '../parser';
import Schema from '../schema';
import Tokenizer from '../tokenizer';

class Tester {
    private parser: Parser;
    private tokenizer: Tokenizer;

    constructor(private schema: Schema, root: number) {
        this.parser = new Parser(schema, root);
        this.tokenizer = new Tokenizer([]);
    }

    expect(text: string, expected: any) {
        expect(
            this.cleanSection(
                this.parser.setTokens(this.tokenizer.setText(text))
            )
        ).toEqual(expected);
    }

    cleanSection(section: Section | null): any {
        if (section === null) return null;
        if (section.type === 'token') {
            return section.token.value;
        } else {
            return {
                type: section.type,
                id: section.id,
                children: section.children.map((sec) => this.cleanSection(sec)),
            };
        }
    }
}

function union(id: number, children: any[]) {
    return { type: 'union', id, children };
}

function group(id: number, children: any[]) {
    return { type: 'group', id, children };
}

describe('Parser', () => {
    test('union', () => {
        const schema = new Schema();
        const abc = schema.union('a', 'b', 'c');
        const tester = new Tester(schema, abc);
        tester.expect('a', union(abc, ['a']));
        tester.expect('b', union(abc, ['b']));
        tester.expect('c', union(abc, ['c']));
        tester.expect('d', null);
    });

    test('group', () => {
        const schema = new Schema();
        const abc = schema.group('a', 'b', 'c');
        const ab = schema.group('a', 'b');
        const aa = schema.group('a', 'a');
        const bb = schema.group('b', 'b');
        const any = schema.union(abc, ab, aa, bb);
        const root = schema.group(any, any);
        const tester = new Tester(schema, root);
        tester.expect('a b c a a', {
            type: 'group',
            id: root,
            children: [
                union(any, [group(abc, ['a', 'b', 'c'])]),
                union(any, [group(aa, ['a', 'a'])]),
            ],
        });
        tester.expect('a b a a', {
            type: 'group',
            id: root,
            children: [
                union(any, [group(ab, ['a', 'b'])]),
                union(any, [group(aa, ['a', 'a'])]),
            ],
        });
        tester.expect('b b a b c', {
            type: 'group',
            id: root,
            children: [
                union(any, [group(bb, ['b', 'b'])]),
                union(any, [group(abc, ['a', 'b', 'c'])]),
            ],
        });
    });

    test('complicated group', () => {
        const schema = new Schema();
        const abc = schema.group('a', 'b', 'c');
        const ab = schema.group('a', 'b');
        const cd = schema.group('c', 'd');
        const any = schema.union(abc, ab, cd);
        const root = schema.group(any, any);
        const tester = new Tester(schema, root);
        tester.expect(
            'a b c c d',
            group(root, [
                union(any, [group(abc, ['a', 'b', 'c'])]),
                union(any, [group(cd, ['c', 'd'])]),
            ])
        );
        tester.expect(
            'a b c d',
            group(root, [
                union(any, [group(ab, ['a', 'b'])]),
                union(any, [group(cd, ['c', 'd'])]),
            ])
        );
    });

    test('optional', () => {
        const schema = new Schema();
        const mayB = schema.optional('b');
        const root = schema.group('a', mayB, 'c');

        const tester = new Tester(schema, root);
        tester.expect('a b c', {
            type: 'group',
            id: root,
            children: [
                'a',
                { type: 'optional', id: mayB, children: ['b'] },
                'c',
            ],
        });
        tester.expect('a c', {
            type: 'group',
            id: root,
            children: ['a', { type: 'optional', id: mayB, children: [] }, 'c'],
        });
        tester.expect('a b b c', null);
    });
    /*
    test('recursive example', () => {
        const parser = new Parser(LangSchema.schema, LangSchema.baseType);
        const section = parser.setTokens(
            LangSchema.tokenizer.setText(`Union<string, Dict<hi, bye>>`)
        );
        expect(section).not.toBeNull();
        if (section === null) throw new Error();
        const type = LangSchema.parse(section);
        expect(type).toEqual({
            name: 'Union',
            children: [
                'string',
                {
                    name: 'Dict',
                    children: ['hi', 'bye'],
                },
            ],
        });
    });*/
});
