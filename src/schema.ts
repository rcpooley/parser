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

type ChildType = {
    type: 'oneOrMore' | 'repeat' | 'optional';
    childID: number;
};

export type Type = Readonly<
    StringType | TokenTagType | ChildrenType | ChildType
>;

type BuilderType = string | number;
interface TypeBuilder {
    readonly id: number;
    group(...types: BuilderType[]): number;
    union(...types: BuilderType[]): number;
    oneOrMore(type: BuilderType): number;
    repeat(type: BuilderType): number;
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
            oneOrMore: (type: BuilderType) => {
                validate();
                this.types.set(id, {
                    type: 'oneOrMore',
                    childID: this.getID(type),
                });
                return id;
            },
            repeat: (type: BuilderType) => {
                validate();
                this.types.set(id, {
                    type: 'repeat',
                    childID: this.getID(type),
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

    oneOrMore(type: BuilderType): number {
        return this.build().oneOrMore(type);
    }

    repeat(type: BuilderType): number {
        return this.build().repeat(type);
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
