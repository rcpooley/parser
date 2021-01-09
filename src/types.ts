// Zero-based
export type Position = {
    line: number;
    column: number;
};

export type Range = {
    start: Position;
    end: Position;
};
