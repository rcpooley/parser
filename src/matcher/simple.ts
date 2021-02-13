import { Matcher, Params, State } from './matcher';

export default class SimpleMatcher extends Matcher {
    private match: State | null;

    constructor(params: Params) {
        super(params);
        this.match = this.getMatch();
    }

    protected nextImpl(): State | null {
        const { match } = this;
        this.match = null;
        return match;
    }

    private getMatch(): State | null {
        const { id, index } = this.params;
        const sections = this.params.sections.slice();
        while (true) {
            const section = sections[index];
            if (section.id === id) {
                return {
                    sections,
                };
            }

            // Break down
            if (section.type === 'token') {
                this.setError({
                    sections,
                    errorStart: index,
                    errorEnd: index,
                    exception: {
                        type: 'wrongToken',
                        expectedID: id,
                    },
                });
                return null;
            }
            sections.splice(index, 1, ...section.children);
        }
    }
}
