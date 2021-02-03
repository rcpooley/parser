import { Matcher, Params, State } from './matcher';

export default class SimpleMatcher extends Matcher {
    private match: State | null;

    constructor(params: Params, state: State) {
        super(params, state);
        this.match = this.getMatch();
    }

    protected nextImpl(): State | null {
        const { match } = this;
        this.match = null;
        return match;
    }

    private getMatch(): State | null {
        const { id } = this.params;
        const { index } = this.state;
        const sections = this.state.sections.slice();
        while (true) {
            const section = sections[index];
            if (section.id === id) {
                return {
                    sections,
                    index,
                };
            }

            // Break down
            if (section.type === 'token') {
                return null;
            }
            sections.splice(index, 1, ...section.children);
        }
    }
}
