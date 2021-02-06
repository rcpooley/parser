import Schema from '../../schema';
import Tester from './tester';

describe('Matcher', () => {
    test('simple union', () => {
        const schema = new Schema();
        const abc = schema.union('a', 'b', 'c');
        const t = new Tester(schema, abc);
        const _abc = t.wrap(abc);
        t.expect('a', [_abc('a')]);
        t.expect('b', [_abc('b')]);
        t.expect('c', [_abc('c')]);
        t.expect('a a', [_abc('a'), 'a']);
    });

    test('ambiguous union', () => {
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

    test('ambiguous repeat', () => {
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

        t.expect('a', [_r(A)]);
        t.expect('a b', [_r(AB)], [_r(A, B)]);
        t.expect('a b c', [_r(ABC)], [_r(AB, C)], [_r(A, BC)], [_r(A, B, C)]);
        t.expect(
            'a b b c',
            [_r(AB, BC)],
            [_r(AB, B, C)],
            [_r(A, B, BC)],
            [_r(A, B, B, C)]
        );
    });

    test('repeat - separator required at end', () => {
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

        t.expect('a,a,', [_r(A, ',', A, ',')]);
        t.expect('a,b,a', [_r(A, ',', B, ','), 'a']);
        t.expect('a,', [_r(A, ',')]);
        t.expect('a', [t.section(root, []), 'a']);
    });

    test('repeat - separator required not at end', () => {
        const schema = new Schema();
        schema.string('b');
        const root = schema.repeat('a', {
            separator: ',',
            separatorAtEnd: false,
        });
        const t = new Tester(schema, root);

        const _r = t.wrap(root);

        t.expect('a,a', [_r('a', ',', 'a')]);
        t.expect('a,a,', [_r('a', ',', 'a'), ',']);
        t.expect('a,', [_r('a'), ',']);
        t.expect('a,a,b', [_r('a', ',', 'a'), ',', 'b']);
    });

    test('repeat - separator optional at end', () => {
        const schema = new Schema();
        schema.string('b');
        const root = schema.repeat('a', {
            separator: ',',
            separatorAtEnd: 'optional',
        });
        const t = new Tester(schema, root);

        const _r = t.wrap(root);

        t.expect('a,a', [_r('a', ',', 'a')]);
        t.expect('a,a,', [_r('a', ',', 'a', ',')]);
        t.expect('a,', [_r('a', ',')]);
        t.expect('a,a,b', [_r('a', ',', 'a', ','), 'b']);
        t.expect('a', [_r('a')]);
    });

    test('empty repeat', () => {
        const schema = new Schema();
        schema.string('b');
        const root = schema.repeat('a');
        const t = new Tester(schema, root);
        const _r = t.wrap(root);

        t.expect('a', [_r('a')]);
        t.expect('b', [_r(), 'b']);
    });

    test('empty repeat in group', () => {
        const schema = new Schema();
        const rep = schema.repeat('a');
        const root = schema.group('x', rep, 'y');
        const t = new Tester(schema, root);
        const _rep = t.wrap(rep);
        const _r = t.wrap(root);

        t.expect('x a a y', [_r('x', _rep('a', 'a'), 'y')]);
        t.expect('x a y', [_r('x', _rep('a'), 'y')]);
        t.expect('x y', [_r('x', _rep(), 'y')]);
    });

    test('optional repeat', () => {
        const schema = new Schema();
        const mayB = schema.optional('b');
        const root = schema.repeat(mayB);
        const t = new Tester(schema, root);
        const _mayB = t.wrap(mayB);
        const _r = t.wrap(root);

        t.expect('b', [_r(_mayB('b'))]);
    });

    test('repeat group containing optional', () => {
        const schema = new Schema();
        const mayB = schema.optional('b');
        const ab = schema.group('a', mayB);
        const any = schema.union(ab, 'a', 'b');
        const root = schema.repeat(any);
        const t = new Tester(schema, root);
        const _mayB = t.wrap(mayB);
        const _ab = t.wrap(ab);
        const _any = t.wrap(any);
        const _r = t.wrap(root);

        const AB = _any(_ab('a', _mayB('b')));
        const AX = _any(_ab('a', _mayB()));
        const A = _any('a');
        const B = _any('b');

        t.expect('a b', [_r(AB)], [_r(A, B)], [_r(AX, B)]);
    });

    test('repeat min 1 element', () => {
        const schema = new Schema();
        const root = schema.repeat('a', {
            minElementCount: 1,
        });
        const t = new Tester(schema, root);
        const _r = t.wrap(root);

        t.expect('a a', [_r('a', 'a')]);
        t.expect('a', [_r('a')]);
        t.expect('x');
    });

    test('repeat min 2 element', () => {
        const schema = new Schema();
        const root = schema.repeat('a', {
            minElementCount: 2,
        });
        const t = new Tester(schema, root);
        const _r = t.wrap(root);

        t.expect('a a a', [_r('a', 'a', 'a')]);
        t.expect('a a', [_r('a', 'a')]);
        t.expect('a');
        t.expect('x');
    });

    test('optional repeat min 0 elements in group', () => {
        const schema = new Schema();
        const rep = schema.repeat('a');
        const opt = schema.optional(rep);
        const root = schema.group('x', opt, 'y');
        const t = new Tester(schema, root);
        const _rep = t.wrap(rep);
        const _opt = t.wrap(opt);
        const _r = t.wrap(root);

        t.expect('x a a y', [_r('x', _opt(_rep('a', 'a')), 'y')]);
        t.expect('x a y', [_r('x', _opt(_rep('a')), 'y')]);
        t.expect('x y', [_r('x', _opt(_rep()), 'y')], [_r('x', _opt(), 'y')]);
    });

    test('optional repeat min 1 element in group', () => {
        const schema = new Schema();
        const rep = schema.repeat('a', {
            minElementCount: 1,
        });
        const opt = schema.optional(rep);
        const root = schema.group('x', opt, 'y');
        const t = new Tester(schema, root);
        const _rep = t.wrap(rep);
        const _opt = t.wrap(opt);
        const _r = t.wrap(root);

        t.expect('x a a y', [_r('x', _opt(_rep('a', 'a')), 'y')]);
        t.expect('x a y', [_r('x', _opt(_rep('a')), 'y')]);
        t.expect('x y', [_r('x', _opt(), 'y')]);
    });

    test('repeat of repeats no separator', () => {
        const schema = new Schema();
        schema.string('x');
        const rep = schema.repeat('a');
        const root = schema.repeat(rep);
        const t = new Tester(schema, root);
        const _rep = t.wrap(rep);
        const _r = t.wrap(root);

        t.expect('a a', [_r(_rep('a', 'a'))]);
        t.expect('a', [_r(_rep('a'))]);
        t.expect('x', [_r(), 'x']);
    });

    test('repeat of repeats outer min count 1', () => {
        const schema = new Schema();
        schema.string('x');
        const rep = schema.repeat('a');
        const root = schema.repeat(rep, { minElementCount: 1 });
        const t = new Tester(schema, root);
        const _rep = t.wrap(rep);
        const _r = t.wrap(root);

        t.expect('a a', [_r(_rep('a', 'a'))]);
        t.expect('a', [_r(_rep('a'))]);
        t.expect('x');
    });

    test('repeat of repeats with outer separator', () => {
        const schema = new Schema();
        schema.string('x');
        const rep = schema.repeat('a');
        const root = schema.repeat(rep, {
            separator: 'b',
        });
        const t = new Tester(schema, root);
        const _rep = t.wrap(rep);
        const _r = t.wrap(root);

        t.expect('a a', [_r(_rep('a', 'a'))]);
        t.expect('a a b a a a', [_r(_rep('a', 'a'), 'b', _rep('a', 'a', 'a'))]);
    });
});
