import Parser from '../parser';
import Schema from '../schema';
import Tokenizer from '../tokenizer';

describe('Schema', () => {
    test('basic example', () => {
        const schema = new Schema();

        const noun = schema.union('mouse', 'moon', 'flower');

        const verb = schema.union('walks', 'talks');

        const adverb = schema.union('happily', 'sadly');

        const simpleSentence = schema.group(noun, verb);
        const complexSentence = schema.group(simpleSentence, adverb);
        const sentence = schema.union(complexSentence, simpleSentence);

        const root = schema.repeat(sentence);

        const tokens = new Tokenizer([
            'mouse',
            'moon',
            'flower',
            'walks',
            'talks',
            'happily',
            'sadly',
        ]).setText(`
            mouse walks happily moon talks
        `);

        const parser = new Parser(schema, root);
        parser.setTokens(tokens);
        console.log('hi');
    });
});
