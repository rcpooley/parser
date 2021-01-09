type StringType = {
    type: 'string';
    value: string;
};

type TokenTagType = {
    type: 'tokenTag';
    tag: string;
};

export type GroupType = {
    type: 'group';
    childrenIDs: number[];
};

export type UnionType = {
    type: 'union';
    childrenIDs: number[];
};

type Type = Readonly<StringType | TokenTagType | GroupType | UnionType>;

type BuilderType = string | number;
interface TypeBuilder {
    readonly id: number;
    group(...types: BuilderType[]): number;
    union(...types: BuilderType[]): number;
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
        };
    }

    group(...types: BuilderType[]): number {
        return this.build().group(...types);
    }

    union(...types: BuilderType[]): number {
        return this.build().union(...types);
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
        }
        let id = this.stringIDs.get(t);
        if (id !== undefined) {
            return id;
        }
        id = this.nextID();
        this.stringIDs.set(t, id);
        this.types.set(id, {
            type: 'string',
            value: t,
        });
        return id;
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
