export enum CategoryEnum {
    todo = "todo",
    comp = "comp",
    in_prog = "in_prog"
}

export interface ITodo {
    name: string;
    status: string;
    category: CategoryEnum | string;
}

export enum TodoMode {
    view = "view",
    edit = "edit"
}


