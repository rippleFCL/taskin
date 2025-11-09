from config_loader import CONFIG, AppConfig
# from models import Category, Todo
from dataclasses import dataclass

from models import Category

@dataclass
class TodoNode:
    tid: int
    cid: int
    cat_dependencies: set[int]
    dependencies: set[int]
    cat_dependant: int | None
    dependants: set[int]

@dataclass
class CategoryNode:
    cid: int
    dependencies: set[int]
    dependants: set[int]

class DDM:
    def __init__(self) -> None:
        self.ddm: dict[int, set[int]] = {}

    def get_deps(self, tid: int) -> set[int]:
        return self.ddm.get(tid, set())

    def add_deps(self, tid: int, deps: set[int]) -> None:
        if tid not in self.ddm:
            self.ddm[tid] = set()
        self.ddm[tid].update(deps)

    def filter(self, filter_tids: set[int]) -> 'DDM':
        filtered = DDM()
        for tid, deps in self.ddm.items():
            if tid in filter_tids:
                continue
            filtered_deps = deps - filter_tids
            filtered.add_deps(tid, filtered_deps)
        return filtered

    def __eq__(self, other: object) -> bool:
        if not isinstance(other, DDM):
            return NotImplemented
        return self.ddm == other.ddm

    def __contains__(self, tid: int) -> bool:
        return tid in self.ddm

    def __bool__(self) -> bool:
        return bool(self.ddm)

class Graph:
    def __init__(self) -> None:
        self.nodes: dict[int, TodoNode] = {}
        self.categories: dict[int, CategoryNode] = {}
        self.ddm: DDM = DDM()

    def add_todo(self, tid: int, cid: int):
        if cid not in self.categories:
            self.categories[cid] = CategoryNode(
                cid=cid,
                dependencies=set(),
                dependants=set()
            )
        if tid not in self.nodes:
            self.nodes[tid] = TodoNode(
                tid=tid,
                cid=cid,
                cat_dependencies=set(),
                dependencies=set(),
                cat_dependant=cid,
                dependants=set()
            )
        self.categories[cid].dependencies.add(tid)

    def add_dep_node(self, tid: int, dep_tid: int):
        if not (tid in self.nodes and dep_tid in self.nodes):
            raise ValueError("Todo nodes must be added before adding dependencies")
        tid_deps = self.nodes[tid]
        dep_tid_deps = self.nodes[dep_tid]
        if tid_deps.cid == dep_tid_deps.cid:
            dep_tid_deps.cat_dependant = None
            self.categories[tid_deps.cid].dependencies.discard(dep_tid)
        tid_deps.dependencies.add(dep_tid)
        dep_tid_deps.dependants.add(tid)

    def add_cat_dep(self, tid: int, dep_cid: int):
        if tid not in self.nodes:
            raise ValueError("Todo nodes must be added before adding category dependencies")
        if dep_cid not in self.categories:
            raise ValueError("Unknown category dependency")

        tid_deps = self.nodes[tid]
        tid_deps.cat_dependencies.add(dep_cid)
        self.categories[dep_cid].dependants.add(tid)

    def _find_floor_cids(self):
        """Finds floor nodes (no dependants)
        """
        floors: list[int] = []
        for cid, node in self.categories.items():
            if not node.dependants:
                floors.append(cid)
        return floors

    def _find_root_tids(self):
        """Finds root nodes (no dependencies)
        """
        roots: list[int] = []
        for tid, node in self.nodes.items():
            if not node.dependencies and not node.cat_dependencies:
                roots.append(tid)
        return roots

    def _recursive_dep_solver(self, tid: int):
        deps: set[int] = set()
        if tid in self.ddm:
            return self.ddm.get_deps(tid)
        for dep in self.nodes[tid].dependencies:
            deps.add(dep)
            deps.update(self._recursive_dep_solver(dep))
        for cat_dep in self.nodes[tid].cat_dependencies:
            for cat_dep_tid in self.categories[cat_dep].dependencies:
                deps.add(cat_dep_tid)
                deps.update(self._recursive_dep_solver(cat_dep_tid))
        self.ddm.add_deps(tid, deps)
        return deps


    def build_ddm(self):
        """Builds the deep dependency map
        """
        self.ddm = DDM()
        for cids in self._find_floor_cids():
            for tid in self.categories[cids].dependencies:
                self._recursive_dep_solver(tid)

    def remove_node(self, tid: int):
        if tid not in self.nodes:
            return
        node = self.nodes[tid]
        for dept_tid in node.dependants:
            for dep in node.dependencies:
                self.nodes[dept_tid].dependencies.add(dep)
                self.nodes[dep].dependants.add(dept_tid)
                self.nodes[dep].dependants.remove(tid)
            self.nodes[dept_tid].dependencies.remove(tid)

        for cat_dep_cid in node.cat_dependencies:
            for dept_tid in node.dependants:
                self.nodes[dept_tid].cat_dependencies.add(cat_dep_cid)
                self.categories[cat_dep_cid].dependants.add(dept_tid)
            self.categories[cat_dep_cid].dependants.remove(tid)



        # handle node that is cat_dependant
        if node.cat_dependant is not None:
            self.categories[node.cat_dependant].dependencies.remove(tid)
            for dep in node.dependencies:
                dep_node = self.nodes[dep]
                if dep_node.cid == node.cid:
                    dep_node.cat_dependant = node.cat_dependant
                    self.categories[node.cat_dependant].dependencies.add(dep)
                else: # pass dependencies through the category
                    for dept in self.categories[node.cat_dependant].dependants:
                        self.nodes[dept].dependencies.add(dep)
            for cat_dep in node.cat_dependencies: # pass dependencies through the category
                for dept in self.categories[node.cat_dependant].dependants:
                    self.nodes[dept].cat_dependencies.add(cat_dep)
        del self.nodes[tid]
        if self.categories[node.cid].dependencies == set():
            del self.categories[node.cid] # remove empty category

    def _filtered_ddm(self, current_tid: int, filter: set[int], filter_cat: set[int]) -> set[int]:
        """Filters the deep dependency map based on a set of todo IDs
        """
        filtered: set[int] = set()
        current_ddm_deps = self.ddm.get_deps(current_tid)
        category_deps = set[int]()
        for filter_category in filter_cat:
            category_deps.update(self.categories[filter_category].dependencies)
        if not filter.intersection(current_ddm_deps) and not category_deps.intersection(current_ddm_deps):
            return self.ddm.get_deps(current_tid)
        for dep in self.nodes[current_tid].dependencies:
            if dep in filter:
                continue
            filtered.update(self._filtered_ddm(dep, set(), set())) # dont filter nodes above you
            filtered.add(dep)
        for cat_dep in self.nodes[current_tid].cat_dependencies:
            if cat_dep in filter_cat:
                continue
            for cat_dep_tid in self.categories[cat_dep].dependencies:
                filtered.update(self._filtered_ddm(cat_dep_tid, set(), set())) # dont filter nodes above you
                filtered.add(cat_dep_tid)
        return filtered

    def _dedupe_node(self, tid: int):
        """Remove dependency nodes that can be reached through other paths
        """
        node = self.nodes[tid]
        to_remove: set[int] = set()
        for dep in node.dependencies:
            # Get filtered deep dependency map for this dependency
            filtered_deps = self._filtered_ddm(tid, {dep}, set())
            if filtered_deps == self.ddm.get_deps(tid):
                to_remove.add(dep)
        for rem in to_remove:
            node.dependencies.remove(rem)
            self.nodes[rem].dependants.remove(tid)

        to_remove_cat: set[int] = set()
        for cat_dep in node.cat_dependencies:
            filtered_deps = self._filtered_ddm(tid, set(), {cat_dep})
            if filtered_deps == self.ddm.get_deps(tid):
                to_remove_cat.add(cat_dep)
        for rem in to_remove_cat:
            node.cat_dependencies.remove(rem)
            self.categories[rem].dependants.remove(tid)

        for dept in list(node.dependants):
            self._dedupe_node(dept)
        if node.cat_dependant is not None:
            for dept in self.categories[node.cat_dependant].dependants.copy():
                self._dedupe_node(dept)

    def dedupe(self):
        """remove dependency nodes that can be reached through other paths"""
        if not self.ddm:
            self.build_ddm()
        for root in self._find_root_tids():
            self._dedupe_node(root)
        self.build_ddm()

    def copy(self) -> "Graph":
        new_graph = Graph()

        # Deep copy all category nodes
        for cid, cat_node in self.categories.items():
            new_graph.categories[cid] = CategoryNode(
                cid=cat_node.cid,
                dependencies=cat_node.dependencies.copy(),
                dependants=cat_node.dependants.copy()
            )

        # Deep copy all todo nodes
        for tid, todo_node in self.nodes.items():
            new_graph.nodes[tid] = TodoNode(
                tid=todo_node.tid,
                cid=todo_node.cid,
                cat_dependencies=todo_node.cat_dependencies.copy(),
                dependencies=todo_node.dependencies.copy(),
                cat_dependant=todo_node.cat_dependant,
                dependants=todo_node.dependants.copy()
            )

        new_graph.build_ddm()
        return new_graph

    def filter_out(self, tids: set[int]) -> "Graph":
        new_graph = self.copy()
        for tid in tids:
            new_graph.remove_node(tid)
        new_graph.build_ddm()
        return new_graph



class DependencyManager:
    ONEOFF_START_ID = -1000  # Starting node id for one-off todos
    ONEOFF_END_ID = -1999    # Ending node id for one-off todos

    def __init__(self, config: AppConfig):
        self.config = config
        self.full_graph = Graph()
        self.todo_id_map: dict[str, int] = {}
        self.category_id_map: dict[str, int] = {}
        self.sub_graph = Graph()

    def build_full_graph(self, categories: list[Category]):
        new_graph = Graph()
        for category in categories:
            for todo in category.todos:
                new_graph.add_todo(todo.id, category.id)
        new_graph.add_todo(self.ONEOFF_START_ID, self.ONEOFF_END_ID)  # One-off todos category
        self.todo_id_map = {todo.title: todo.id for category in categories for todo in category.todos}
        self.category_id_map = {category.name: category.id for category in categories}
        for category in self.config.categories:
            for todo in category.todos:
                todo_id = self.todo_id_map.get(todo.title)
                if not todo_id:
                    continue
                for dep in todo.depends_on_todos:
                    dep_id = self.todo_id_map.get(dep)
                    if dep_id:
                        new_graph.add_dep_node(todo_id, dep_id)
                for dep_cat in todo.depends_on_categories:
                    dep_cat_id = self.category_id_map.get(dep_cat)
                    if dep_cat_id:
                        new_graph.add_cat_dep(todo_id, dep_cat_id)
                if todo.depends_on_all_oneoffs:
                    new_graph.add_cat_dep(todo_id, self.ONEOFF_END_ID)
        for oneoff_dep in self.config.oneoff_deps.depends_on_todos:
            dep_id = self.todo_id_map.get(oneoff_dep)
            if dep_id:
                new_graph.add_dep_node(self.ONEOFF_START_ID, dep_id)
        for oneoff_cat_dep in self.config.oneoff_deps.depends_on_categories:
            dep_cat_id = self.category_id_map.get(oneoff_cat_dep)
            if dep_cat_id:
                new_graph.add_cat_dep(self.ONEOFF_START_ID, dep_cat_id)

        new_graph.build_ddm()
        self.full_graph = new_graph

    def scope_subgraph(self, excluded_tids: set[int]):
        self.sub_graph = self.full_graph.filter_out(excluded_tids)



dep_man = DependencyManager(CONFIG)
