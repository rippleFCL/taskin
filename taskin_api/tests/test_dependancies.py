import pytest
import sys
from pathlib import Path

# Add parent directory to path to allow imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from taskin_api.dep_manager import Graph, DDM


@pytest.fixture
def filled_ddm():
    ddm = DDM()
    ddm.add_deps(0, {1, 2, 3, 4})
    ddm.add_deps(1, {2, 3})
    ddm.add_deps(2, {3})
    return ddm


@pytest.fixture
def filled_graph():
    graph = Graph()
    graph.add_todo(0, 0)
    graph.add_todo(1, 0)
    graph.add_todo(2, 0)
    graph.add_todo(3, 1)
    graph.add_todo(4, 1)
    graph.add_todo(5, 1)
    graph.add_dep_node(0, 1)
    graph.add_dep_node(1, 2)
    graph.add_cat_dep(3, 0)
    graph.add_dep_node(4, 3)
    graph.add_dep_node(5, 3)
    graph.build_ddm()
    return graph


def test_DDM(filled_ddm):
    ddm = filled_ddm.filter({2})
    assert ddm.get_deps(0) == {1, 3, 4}
    assert ddm.get_deps(1) == {3}
    assert 2 not in ddm.ddm


def test_DDM_empty():
    new_ddm = DDM()
    assert not new_ddm


def test_DDM_equal():
    ddm1 = DDM()
    ddm1.add_deps(0, {1, 2})
    ddm1.add_deps(1, {2})

    ddm2 = DDM()
    ddm2.add_deps(0, {1, 2})
    ddm2.add_deps(1, {2})

    assert ddm1 == ddm2


def test_DDM_not_equal():
    ddm1 = DDM()
    ddm1.add_deps(0, {1, 2})
    ddm1.add_deps(1, {2})

    ddm2 = DDM()
    ddm2.add_deps(0, {1, 3})
    ddm2.add_deps(1, {2})

    assert ddm1 != ddm2


def test_DDM_filter():
    ddm = DDM()
    ddm.add_deps(0, {1, 2})
    ddm.add_deps(1, {2})
    ddm.add_deps(2, set())

    filtered_ddm = ddm.filter({1})

    ddm2 = DDM()
    ddm2.add_deps(0, {2})
    ddm2.add_deps(2, set())

    assert filtered_ddm == ddm2


def test_graph_valid(filled_graph):
    assert filled_graph.categories[0].dependencies == {0}
    assert filled_graph.categories[1].dependencies == {4, 5}
    assert filled_graph.categories[0].dependants == {3}
    assert filled_graph.nodes[0].dependencies == {1}
    assert filled_graph.nodes[1].dependants == {0}
    assert filled_graph.nodes[1].dependencies == {2}
    assert filled_graph.nodes[2].dependants == {1}
    assert filled_graph.nodes[3].dependencies == set()
    assert filled_graph.nodes[4].dependencies == {3}
    assert filled_graph.nodes[5].dependencies == {3}
    assert filled_graph.nodes[3].dependants == {4, 5}


def test_ddm(filled_graph):
    filled_graph.build_ddm()
    ddm = filled_graph.ddm
    assert ddm.get_deps(0) == {1, 2}
    assert ddm.get_deps(1) == {2}
    assert ddm.get_deps(2) == set()
    assert ddm.get_deps(3) == {0, 1, 2}
    assert ddm.get_deps(4) == {1, 2, 3, 0}
    assert ddm.get_deps(5) == {1, 2, 3, 0}


def test_deduplication_shouldnt_change(filled_graph):
    filled_graph.dedupe()
    assert filled_graph.categories[0].dependencies == {0}
    assert filled_graph.categories[1].dependencies == {4, 5}
    assert filled_graph.categories[0].dependants == {3}
    assert filled_graph.nodes[0].dependencies == {1}
    assert filled_graph.nodes[1].dependants == {0}
    assert filled_graph.nodes[1].dependencies == {2}
    assert filled_graph.nodes[2].dependants == {1}
    assert filled_graph.nodes[3].dependencies == set()
    assert filled_graph.nodes[4].dependencies == {3}
    assert filled_graph.nodes[5].dependencies == {3}
    assert filled_graph.nodes[3].dependants == {4, 5}


def test_deduplication(filled_graph):
    filled_graph.add_dep_node(4, 2)  # Adding redundant dependency
    filled_graph.add_dep_node(5, 1)
    filled_graph.add_dep_node(3, 1)
    filled_graph.add_todo(6, 1)
    filled_graph.add_dep_node(6, 5)
    filled_graph.add_cat_dep(6, 0)
    filled_graph.build_ddm()
    filled_graph.dedupe()
    assert filled_graph.categories[0].dependencies == {0}
    assert filled_graph.categories[1].dependencies == {4, 6}
    assert filled_graph.categories[0].dependants == {3}
    assert filled_graph.nodes[0].dependencies == {1}
    assert filled_graph.nodes[1].dependants == {0}
    assert filled_graph.nodes[1].dependencies == {2}
    assert filled_graph.nodes[2].dependants == {1}
    assert filled_graph.nodes[3].dependencies == set()
    assert filled_graph.nodes[4].dependencies == {3}
    assert filled_graph.nodes[5].dependencies == {3}
    assert filled_graph.nodes[5].dependants == {6}
    assert filled_graph.nodes[3].dependants == {4, 5}


def test_remove_node(filled_graph):
    filtered_ddm = filled_graph.ddm.filter({1})
    filled_graph.remove_node(1)
    filled_graph.build_ddm()
    ddm = filled_graph.ddm
    assert ddm == filtered_ddm
    assert 1 not in filled_graph.nodes
    assert filled_graph.nodes[0].dependencies == {2}
    assert filled_graph.nodes[2].dependants == {0}


def test_remove_node_category_move_up(filled_graph):
    filtered_ddm = filled_graph.ddm.filter({0})
    filled_graph.remove_node(0)
    filled_graph.build_ddm()
    ddm = filled_graph.ddm
    assert ddm == filtered_ddm
    assert filled_graph.categories[0].dependencies == {1}
    assert 0 not in filled_graph.nodes
    assert filled_graph.nodes[1].cat_dependant == 0
    assert filled_graph.nodes[1].dependencies == {2}
    assert filled_graph.categories[0].dependencies == {1}


def test_remove_move_category_down(filled_graph):
    filtered_ddm = filled_graph.ddm.filter({3})
    filled_graph.remove_node(3)
    filled_graph.build_ddm()
    ddm = filled_graph.ddm
    assert ddm == filtered_ddm
    assert filled_graph.categories[0].dependants == {4, 5}
    assert filled_graph.nodes[4].cat_dependencies == {0}
    assert filled_graph.nodes[5].cat_dependencies == {0}
    assert 3 not in filled_graph.nodes


def test_remove_node_removes_category(filled_graph):
    filled_graph.add_todo(10, 5)
    assert 5 in filled_graph.categories
    filled_graph.remove_node(10)
    assert 5 not in filled_graph.categories


def test_filter(filled_graph):
    old_ddm = filled_graph.ddm.filter({1, 3})
    filtered_graph = filled_graph.filter({1, 3})
    assert filtered_graph.ddm == old_ddm
