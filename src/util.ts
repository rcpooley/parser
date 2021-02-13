import { MatchError } from './matcher/matcher';

export function escapeRegExp(str: string) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
}

export function getErrorRange(error: MatchError): [number, number] {
    const start = error.sections[error.errorStart];
    const end = error.sections[error.errorEnd];
    return [start.tokenIndex, end.tokenIndex + end.length];
}
