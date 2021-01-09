import Parser from '../parser';
import TypeSchema from './schemas/typeSchema';

describe('Parser', () => {
    test('recursive example', () => {
        const parser = new Parser(TypeSchema.schema, TypeSchema.baseType);

        const section = parser.setTokens(
            TypeSchema.tokenizer.setText(`Union<string, Dict<hi, bye>>`)
        );
        expect(section).not.toBeNull();
        if (section === null) throw new Error();
        const type = TypeSchema.parse(section);
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
    });
});
