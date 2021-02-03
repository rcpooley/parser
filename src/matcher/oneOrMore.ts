import { Matcher, State } from './matcher';

export default class OneOrMoreMatcher extends Matcher {
    protected nextImpl(): State | null {
        throw new Error('Method not implemented.');
    }
}
