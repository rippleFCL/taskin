export enum StatusEnum {
    todo = "todo",
    comp = "comp",
    in_prog = "in_prog"
}

export interface ICategory {
    name: string;
    id: string;
}

export interface ITodo {
    id: string;
    name: string;
    status: StatusEnum;
    category_id: string;
    category: ICategory;
}

export enum TodoMode {
    view = "view",
    edit = "edit"
}


