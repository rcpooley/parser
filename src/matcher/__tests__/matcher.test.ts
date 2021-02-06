import Schema from '../../schema';
import Tester from './tester';

describe('Union', () => {
    test('simple', () => {
        const schema = new Schema();
        const abc = schema.union('a', 'b', 'c');
        const t = new Tester(schema, abc);
        const _abc = t.wrap(abc);
        t.expect('a', [_abc('a')]);
        t.expect('b', [_abc('b')]);
        t.expect('c', [_abc('c')]);
        t.expect('a a', [_abc('a'), 'a']);
    });

    test('ambiguous', () => {
        const schema = new Schema();
        const bb = schema.group('b', 'b');
        const root = schema.union(bb, 'b');
        const t = new Tester(schema, root);

        const _bb = t.wrap(bb);
        const _root = t.wrap(root);

        const BB = _bb('b', 'b');

        t.expect('b', [_root('b')]);
        t.expect('b b', [_root(BB)], [_root('b'), 'b']);
        t.expect('b b b', [_root(BB), 'b'], [_root('b'), 'b', 'b']);
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

        const _abc = t.wrap(abc);
        const _ab = t.wrap(ab);
        const _bc = t.wrap(bc);
        const _any = t.wrap(any);
        const _r = t.wrap(root);

        const ABC = _any(_abc('a', 'b', 'c'));
        const AB = _any(_ab('a', 'b'));
        const BC = _any(_bc('b', 'c'));
        const A = _any('a');
        const B = _any('b');
        const C = _any('c');

        t.expect('a', [_r(A)], [_r(), 'a']);
        t.expect('a b', [_r(AB)], [_r(A, B)], [_r(), 'a', 'b']);
        t.expect(
            'a b c',
            [_r(ABC)],
            [_r(AB, C)],
            [_r(A, BC)],
            [_r(A, B, C)],
            [_r(), 'a', 'b', 'c']
        );
        t.expect(
            'a b b c',
            [_r(AB, BC)],
            [_r(AB, B, C)],
            [_r(A, B, BC)],
            [_r(A, B, B, C)],
            [_r(), 'a', 'b', 'b', 'c']
        );
    });

    test('separator required at end', () => {
        const schema = new Schema();
        const elm = schema.union('a', 'b');
        const root = schema.repeat(elm, {
            separator: ',',
            separatorAtEnd: true,
        });
        const t = new Tester(schema, root);

        const _elm = t.wrap(elm);
        const _r = t.wrap(root);

        const A = _elm('a');
        const B = _elm('b');

        t.expect('a,a,', [_r(A, ',', A, ',')], [_r(), 'a', ',', 'a', ',']);
        t.expect(
            'a,b,a',
            [_r(A, ',', B, ','), 'a'],
            [_r(), 'a', ',', 'b', ',', 'a']
        );
        t.expect('a,', [_r(A, ',')], [_r(), 'a', ',']);
        t.expect('a', [t.section(root, []), 'a']);
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

        const _r = t.wrap(root);

        t.expect('a,a', [_r('a', ',', 'a')]);
        t.expect('a,a,', [_r('a', ',', 'a'), ',']);
        t.expect('a,', [_r('a'), ',']);
        t.expect('a,a,b', [_r('a', ',', 'a'), ',', 'b']);
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

        const _r = t.wrap(root);

        t.expect('a,a', [_r('a', ',', 'a')]);
        t.expect('a,a,', [_r('a', ',', 'a', ',')]);
        t.expect('a,', [_r('a', ',')]);
        t.expect('a,a,b', [_r('a', ',', 'a', ','), 'b']);
    });
});
