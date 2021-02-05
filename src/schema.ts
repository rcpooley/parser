type StringType = {
    type: 'string';
    value: string;
};

type TokenTagType = {
    type: 'tokenTag';
    tag: string;
};

type ChildrenType = {
    type: 'group' | 'union';
    childrenIDs: number[];
};

export type RepeatType = {
    type: 'repeat';
    childID: number;
    minElementCount: number;
    separator: RepeatSeparator | null;
};

type RepeatSeparator = {
    id: number;
    end: boolean | 'optional';
};

type RepeatConfig = {
    minElementCount?: number;
    separator?: BuilderType;
    separatorAtEnd?: boolean | 'optional';
};

type OptionalType = {
    type: 'optional';
    childID: number;
};

export type Type = Readonly<
    StringType | TokenTagType | ChildrenType | RepeatType | OptionalType
>;

type BuilderType = string | number;
interface TypeBuilder {
    readonly id: number;
    group(...types: BuilderType[]): number;
    union(...types: BuilderType[]): number;
    repeat(type: BuilderType, config?: RepeatConfig): number;
    optional(type: BuilderType): number;
}

export default class Schema {
    private _nextID: number;
    private _builders: Set<number>;
    public stringIDs: Map<string, number>;
    public tokenTagIDs: Map<string, number>;
    private types: Map<number, Type>;

    constructor() {
        this._nextID = 1;
        this._builders = new Set();
        this.stringIDs = new Map();
        this.tokenTagIDs = new Map();
        this.types = new Map();
    }

    build(): TypeBuilder {
        const id = this.nextID();
        this._builders.add(id);
        const validate = () => {
            if (!this._builders.delete(id)) {
                throw new Error('Define can only be called once');
            }
        };
        return {
            id,
            group: (...types: BuilderType[]) => {
                validate();
                this.types.set(id, {
                    type: 'group',
                    childrenIDs: this.getIDs(types),
                });
                return id;
            },
            union: (...types: BuilderType[]) => {
                validate();
                this.types.set(id, {
                    type: 'union',
                    childrenIDs: this.getIDs(types),
                });
                return id;
            },
            repeat: (type: BuilderType, config?: RepeatConfig) => {
                validate();
                this.types.set(id, {
                    type: 'repeat',
                    childID: this.getID(type),
                    minElementCount: config?.minElementCount ?? 0,
                    separator: config?.separator
                        ? {
                              id: this.getID(config.separator),
                              end: config.separatorAtEnd ?? 'optional',
                          }
                        : null,
                });
                return id;
            },
            optional: (type: BuilderType) => {
                validate();
                this.types.set(id, {
                    type: 'optional',
                    childID: this.getID(type),
                });
                return id;
            },
        };
    }

    group(...types: BuilderType[]): number {
        return this.build().group(...types);
    }

    union(...types: BuilderType[]): number {
        return this.build().union(...types);
    }

    repeat(type: BuilderType, config?: RepeatConfig): number {
        return this.build().repeat(type, config);
    }

    optional(type: BuilderType): number {
        return this.build().optional(type);
    }

    string(str: string): number {
        let id = this.stringIDs.get(str);
        if (id !== undefined) {
            return id;
        }
        id = this.nextID();
        this.stringIDs.set(str, id);
        this.types.set(id, {
            type: 'string',
            value: str,
        });
        return id;
    }

    tokenTag(tag: string): number {
        let id = this.tokenTagIDs.get(tag);
        if (id !== undefined) {
            return id;
        }
        id = this.nextID();
        this.tokenTagIDs.set(tag, id);
        this.types.set(id, {
            type: 'tokenTag',
            tag,
        });
        return id;
    }

    private getIDs(types: BuilderType[]): number[] {
        return types.map((t) => this.getID(t));
    }

    private getID(t: BuilderType): number {
        if (typeof t === 'number') {
            return t;
        } else {
            return this.string(t);
        }
    }

    private nextID(): number {
        return this._nextID++;
    }

    public getType(id: number): Type {
        const type = this.types.get(id);
        if (type === undefined) {
            throw new Error(`Type not found with id ${id}`);
        }
        return type;
    }
}
