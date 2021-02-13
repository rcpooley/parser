import { Section } from './parser';
import { Token } from './tokenizer';

export function escapeRegExp(str: string) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
}

export function getFirstToken(
    sections: Section[],
    index: number = 0
): Token | null {
    for (let i = index; i < sections.length; i++) {
        const s = sections[i];
        if (s.type === 'token') {
            return s.token;
        }
        const token = getFirstToken(s.children);
        if (token !== null) return token;
    }
    return null;
}
