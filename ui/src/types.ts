export enum StatusEnum {
    todo = "todo",
    comp = "comp",
    in_prog = "in_prog"
}

export interface ICategory {
    name: string;
}

export interface ITodo {
    name: string;
    status: StatusEnum | string;
    category: ICategory;
}

export enum TodoMode {
    view = "view",
    edit = "edit"
}


