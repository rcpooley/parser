import Match from '..';
import { convertTokensToSections, Section } from '../../parser';
import Schema from '../../schema';
import Tokenizer from '../../tokenizer';
import { Matcher, MatchError } from '../matcher';

export default class Tester {
    private tokenizer: Tokenizer;

    constructor(private schema: Schema, private id: number) {
        this.tokenizer = new Tokenizer([]);
    }

    expect(text: string, ...matches: Array<Array<Section | string>>) {
        const tokens = this.tokenizer.setText(text);
        const sections = convertTokensToSections(this.schema, tokens);
        const matcher = Match({
            schema: this.schema,
            id: this.id,
            sections,
            index: 0,
        });
        expect(matcher).toBeInstanceOf(Matcher);
        if (!(matcher instanceof Matcher)) throw new Error('not possible');
        matches.forEach((expectedSections) => {
            expect(matcher.hasNext()).toBeTruthy();
            const state = matcher.next();
            expect(this.clean(state.sections)).toEqual(
                this.clean(this.convertSections(expectedSections))
            );
        });
        expect(matcher.hasNext()).toBeFalsy();
    }

    expectError(text: string, expectedError: MatchError) {
        const tokens = this.tokenizer.setText(text);
        const sections = convertTokensToSections(this.schema, tokens);
        const matcher = Match({
            schema: this.schema,
            id: this.id,
            sections,
            index: 0,
        });
        expect(matcher).not.toBeInstanceOf(Matcher);
        if (matcher instanceof Matcher) throw new Error('not possible');
        expect(this.clean(matcher.sections)).toEqual(
            this.clean(this.convertSections(expectedError.sections))
        );
        expect(matcher.errorStart).toEqual(expectedError.errorStart);
        expect(matcher.errorEnd).toEqual(expectedError.errorEnd);
        expect(matcher.expectedID).toEqual(expectedError.expectedID);
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

    wrap(id: number): (...children: Array<Section | string>) => Section {
        return (...children) => this.section(id, children);
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
