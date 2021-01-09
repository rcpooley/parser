import { Position } from './types';
import { escapeRegExp } from './util';

export type Token = {
    value: string;
    position: Position;
    tag: string | null;
};

export type TokenDelta = {
    start: number;
    length: number;
    tokens: Token[];
};

export interface ITokenizer {
    setText(text: string): Token[];
    onChange(range: Range, text: string): TokenDelta;
}

export const TAG_WORD = 'word';

export default class Tokenizer implements ITokenizer {
    private strings: string[];

    constructor(strings: string[]) {
        this.strings = strings.map((s) => escapeRegExp(s));
    }

    setText(text: string): Token[] {
        return new Helper(text, this.strings).tokenize();
    }

    onChange(range: Range, text: string): TokenDelta {
        throw new Error('not implemented');
    }
}

class Helper {
    private content: string;
    private strings: string[];
    private tokens: Token[];
    private line: number;
    private col: number;

    constructor(content: string, strings: string[]) {
        this.content = content.replace(/\r/g, '');
        this.strings = strings;
        this.tokens = [];
        this.line = 0;
        this.col = 0;
        this.skipWhitespace();
    }

    tokenize(): Token[] {
        let token;
        while ((token = this.readToken()) !== null) {
            this.tokens.push(token);
        }
        return this.tokens;
    }

    readToken(): Token | null {
        if (this.content.length === 0) {
            return null;
        }

        const word = this.content.match(/^\w*/);
        if (word && word[0].length > 0) {
            return this.advance(word[0].length, TAG_WORD);
        }

        const check = this.content.match(
            new RegExp(`^(${this.strings.join('|')})`)
        );
        if (check) {
            return this.advance(check[0].length, null);
        }

        return this.advance(1, null);
    }

    advance(num: number, tag: string | null): Token {
        const position = this.pos();
        const value = this.content.slice(0, num);
        this._advance(num);
        this.skipWhitespace();
        return {
            value,
            position,
            tag,
        };
    }

    skipWhitespace() {
        const match = this.content.match(/^( |\t)*/);
        if (match !== null) {
            this._advance(match[0].length);
        }
        if (this.content.startsWith('\n')) {
            this._advance(1);
            this.line++;
            this.col = 0;
            this.skipWhitespace();
        }
    }

    _advance(num: number) {
        this.content = this.content.slice(num);
        this.col += num;
    }

    pos(): Position {
        return { line: this.line, column: this.col };
    }
}
