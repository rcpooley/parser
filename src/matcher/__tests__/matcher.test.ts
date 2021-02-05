import Match from '..';
import { convertTokensToSections, Section } from '../../parser';
import Schema from '../../schema';
import Tokenizer from '../../tokenizer';
import { Params } from '../matcher';

class Tester {
    private params: Params;
    private tokenizer: Tokenizer;

    constructor(private schema: Schema, id: number) {
        this.params = { schema, id };
        this.tokenizer = new Tokenizer([]);
    }

    expect(text: string, matches: Array<Array<Section | string>>) {
        const tokens = this.tokenizer.setText(text);
        const sections = convertTokensToSections(this.params.schema, tokens);
        const matcher = Match(this.params, { sections, index: 0 });
        matches.forEach((expectedSections) => {
            expect(matcher.hasNext()).toBeTruthy();
            const state = matcher.next();
            expect(state.index).toBe(0);
            expect(this.clean(state.sections)).toEqual(
                this.clean(this.convertSections(expectedSections))
            );
        });
        expect(matcher.hasNext()).toBeFalsy();
    }

    private clean(sections: Section[]): any {
        return sections.map((section) => {
            const o: any = {
                type: section.type,
                id: section.id,
                firstIDs: section.firstIDs,
                children: this.clean(section.children),
                length: section.length,
            };
            if (section.type === 'token') {
                o.token = section.token.value;
            }
            return o;
        });
    }

    section(id: number, children: Array<Section | string>): Section {
        const sections = this.convertSections(children);
        const type = this.schema.getType(id);
        if (type.type === 'string' || type.type === 'tokenTag') {
            throw new Error('Invalid call to section()');
        }
        return {
            type: type.type,
            id,
            firstIDs: this.getFirstIDs(sections),
            children: sections,
            length: this.getLength(sections),
        };
    }

    private convertSections(sections: Array<Section | string>): Section[] {
        const position: any = null;
        return sections.map((section) => {
            if (typeof section === 'string') {
                const id = this.schema.stringIDs.get(section);
                if (id === undefined) {
                    throw new Error(`ID not found for string ${section}`);
                }
                return {
                    type: 'token',
                    token: {
                        value: section,
                        position,
                        tag: null,
                    },
                    length: 1,
                    id,
                    firstIDs: [],
                    children: [],
                };
            } else {
                return section;
            }
        });
    }

    private getFirstIDs(children: Section[]): number[] {
        if (children.length === 0) return [];
        const section = children[0];
        return [section.id, ...this.getFirstIDs(section.children)];
    }

    private getLength(children: Section[]): number {
        let len = 0;
        children.forEach((child) => {
            len += child.length;
        });
        return len;
    }
}

describe('Union', () => {
    test('simple', () => {
        const schema = new Schema();
        const abc = schema.union('a', 'b', 'c');
        const t = new Tester(schema, abc);
        t.expect('a', [[t.section(abc, ['a'])]]);
        t.expect('b', [[t.section(abc, ['b'])]]);
        t.expect('c', [[t.section(abc, ['c'])]]);
        t.expect('a a', [[t.section(abc, ['a']), 'a']]);
    });

    test('ambiguous', () => {
        const schema = new Schema();
        const bb = schema.group('b', 'b');
        const root = schema.union(bb, 'b');
        const t = new Tester(schema, root);

        const bbSec = t.section(bb, ['b', 'b']);

        t.expect('b', [[t.section(root, ['b'])]]);
        t.expect('b b', [
            [t.section(root, [bbSec])],
            [t.section(root, ['b']), 'b'],
        ]);
        t.expect('b b b', [
            [t.section(root, [bbSec]), 'b'],
            [t.section(root, ['b']), 'b', 'b'],
        ]);
    });
});

describe('Repeat', () => {
    test('ambiguous', () => {
        const schema = new Schema();
        const abc = schema.group('a', 'b', 'c');
        const ab = schema.group('a', 'b');
        const bc = schema.group('b', 'c');
        const any = schema.union(abc, ab, bc, 'a', 'b', 'c');
        const root = schema.repeat(any);
        const t = new Tester(schema, root);

        const abcSec = t.section(any, [t.section(abc, ['a', 'b', 'c'])]);
        const abSec = t.section(any, [t.section(ab, ['a', 'b'])]);
        const bcSec = t.section(any, [t.section(bc, ['b', 'c'])]);
        const aSec = t.section(any, ['a']);
        const bSec = t.section(any, ['b']);
        const cSec = t.section(any, ['c']);

        t.expect('a', [[t.section(root, [aSec])], [t.section(root, []), 'a']]);
        t.expect('a b', [
            [t.section(root, [abSec])],
            [t.section(root, [aSec, bSec])],
            [t.section(root, []), 'a', 'b'],
        ]);
        t.expect('a b c', [
            [t.section(root, [abcSec])],
            [t.section(root, [abSec, cSec])],
            [t.section(root, [aSec, bcSec])],
            [t.section(root, [aSec, bSec, cSec])],
            [t.section(root, []), 'a', 'b', 'c'],
        ]);
        t.expect('a b b c', [
            [t.section(root, [abSec, bcSec])],
            [t.section(root, [abSec, bSec, cSec])],
            [t.section(root, [aSec, bSec, bcSec])],
            [t.section(root, [aSec, bSec, bSec, cSec])],
            [t.section(root, []), 'a', 'b', 'b', 'c'],
        ]);
    });

    test('separator required at end', () => {
        const schema = new Schema();
        const elm = schema.union('a', 'b');
        const root = schema.repeat(elm, {
            separator: ',',
            separatorAtEnd: true,
        });
        const t = new Tester(schema, root);

        const A = t.section(elm, ['a']);
        const B = t.section(elm, ['b']);

        t.expect('a,a,', [
            [t.section(root, [A, ',', A, ','])],
            [t.section(root, []), 'a', ',', 'a', ','],
        ]);
        t.expect('a,b,a', [
            [t.section(root, [A, ',', B, ',']), 'a'],
            [t.section(root, []), 'a', ',', 'b', ',', 'a'],
        ]);
        t.expect('a,', [
            [t.section(root, [A, ','])],
            [t.section(root, []), 'a', ','],
        ]);
        t.expect('a', [[t.section(root, []), 'a']]);
    });

    test('separator required not at end', () => {
        const schema = new Schema();
        schema.string('b');
        const root = schema.repeat('a', {
            separator: ',',
            separatorAtEnd: false,
            minElementCount: 1,
        });
        const t = new Tester(schema, root);

        t.expect('a,a', [[t.section(root, ['a', ',', 'a'])]]);
        t.expect('a,a,', [[t.section(root, ['a', ',', 'a']), ',']]);
        t.expect('a,', [[t.section(root, ['a']), ',']]);
        t.expect('a,a,b', [[t.section(root, ['a', ',', 'a']), ',', 'b']]);
    });

    test('separator optional at end', () => {
        const schema = new Schema();
        schema.string('b');
        const root = schema.repeat('a', {
            separator: ',',
            separatorAtEnd: 'optional',
            minElementCount: 1,
        });
        const t = new Tester(schema, root);

        t.expect('a,a', [[t.section(root, ['a', ',', 'a'])]]);
        t.expect('a,a,', [[t.section(root, ['a', ',', 'a', ','])]]);
        t.expect('a,', [[t.section(root, ['a', ','])]]);
        t.expect('a,a,b', [[t.section(root, ['a', ',', 'a', ',']), 'b']]);
    });
});
