import { Section } from '../../parser';
import Schema from '../../schema';
import Tokenizer from '../../tokenizer';

export interface ISampleSchema<T> {
    schema: Schema;
    tokenizer: Tokenizer;
    baseType: number;
    parse(section: Section): T;
}
