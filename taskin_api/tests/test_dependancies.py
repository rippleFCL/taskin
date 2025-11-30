import sys
from pathlib import Path

import pytest

# Add parent directory to path to allow imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from dep_manager import DDM, Graph


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
    assert filled_graph.validate()


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
    assert filled_graph.validate()


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
    assert filled_graph.validate()


def test_remove_node(filled_graph):
    filtered_ddm = filled_graph.ddm.filter({1})
    filled_graph.remove_node(1)
    filled_graph.build_ddm()
    ddm = filled_graph.ddm
    assert ddm == filtered_ddm
    assert 1 not in filled_graph.nodes
    assert filled_graph.nodes[0].dependencies == {2}
    assert filled_graph.nodes[2].dependants == {0}
    assert filled_graph.validate()


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
    assert filled_graph.validate()


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
    assert filled_graph.validate()


def test_remove_node_removes_category(filled_graph):
    filled_graph.add_todo(10, 5)
    assert 5 in filled_graph.categories
    filled_graph.remove_node(10)
    assert 5 not in filled_graph.categories
    assert filled_graph.validate()


def test_filter(filled_graph):
    old_ddm = filled_graph.ddm.filter({1, 3})
    filtered_graph = filled_graph.filter_out({1, 3})
    assert filtered_graph.ddm == old_ddm
    assert filtered_graph.validate()


def test_remove_node_with_no_dependencies():
    """Test removing a node that has no dependencies (root node)"""
    graph = Graph()
    graph.add_todo(0, 0)
    graph.add_todo(1, 0)
    graph.add_dep_node(1, 0)
    graph.build_ddm()

    graph.remove_node(0)
    graph.build_ddm()

    assert 0 not in graph.nodes
    assert 1 in graph.nodes
    assert graph.nodes[1].dependencies == set()
    assert graph.ddm.get_deps(1) == set()


def test_remove_node_with_no_dependants():
    """Test removing a leaf node (has dependencies but no dependants)"""
    graph = Graph()
    graph.add_todo(0, 0)
    graph.add_todo(1, 0)
    graph.add_dep_node(0, 1)
    graph.build_ddm()

    graph.remove_node(0)
    graph.build_ddm()

    assert 0 not in graph.nodes
    assert 1 in graph.nodes
    assert graph.nodes[1].dependants == set()
    assert graph.ddm.get_deps(1) == set()


def test_remove_node_middle_of_chain():
    """Test removing a node in the middle of a dependency chain"""
    graph = Graph()
    graph.add_todo(0, 0)
    graph.add_todo(1, 0)
    graph.add_todo(2, 0)
    graph.add_dep_node(0, 1)
    graph.add_dep_node(1, 2)
    graph.build_ddm()

    # Before: 0 -> 1 -> 2
    assert graph.ddm.get_deps(0) == {1, 2}

    graph.remove_node(1)
    graph.build_ddm()

    # After: 0 -> 2
    assert 1 not in graph.nodes
    assert graph.nodes[0].dependencies == {2}
    assert graph.nodes[2].dependants == {0}
    assert graph.ddm.get_deps(0) == {2}


def test_remove_node_multiple_dependants():
    """Test removing a node that has multiple dependants"""
    graph = Graph()
    graph.add_todo(0, 0)
    graph.add_todo(1, 0)
    graph.add_todo(2, 0)
    graph.add_todo(3, 0)
    graph.add_dep_node(0, 2)
    graph.add_dep_node(1, 2)
    graph.add_dep_node(2, 3)
    graph.build_ddm()

    # Before: 0 -> 2 -> 3, 1 -> 2 -> 3
    assert graph.ddm.get_deps(0) == {2, 3}
    assert graph.ddm.get_deps(1) == {2, 3}

    graph.remove_node(2)
    graph.build_ddm()

    # After: 0 -> 3, 1 -> 3
    assert 2 not in graph.nodes
    assert graph.nodes[0].dependencies == {3}
    assert graph.nodes[1].dependencies == {3}
    assert graph.nodes[3].dependants == {0, 1}
    assert graph.ddm.get_deps(0) == {3}
    assert graph.ddm.get_deps(1) == {3}


def test_remove_node_multiple_dependencies():
    """Test removing a node that has multiple dependencies"""
    graph = Graph()
    graph.add_todo(0, 0)
    graph.add_todo(1, 0)
    graph.add_todo(2, 0)
    graph.add_todo(3, 0)
    graph.add_dep_node(0, 1)
    graph.add_dep_node(0, 2)
    graph.add_dep_node(1, 3)
    graph.build_ddm()

    # Before: 0 -> 1 -> 3, 0 -> 2
    assert graph.ddm.get_deps(0) == {1, 2, 3}

    graph.remove_node(1)
    graph.build_ddm()

    # After: 0 -> 2, 0 -> 3
    assert 1 not in graph.nodes
    assert graph.nodes[0].dependencies == {2, 3}
    assert graph.nodes[2].dependants == {0}
    assert graph.nodes[3].dependants == {0}
    assert graph.ddm.get_deps(0) == {2, 3}


def test_remove_node_with_category_dependencies():
    """Test removing a node that has category dependencies"""
    graph = Graph()
    graph.add_todo(0, 0)
    graph.add_todo(1, 1)
    graph.add_todo(2, 0)
    graph.add_cat_dep(0, 1)
    graph.add_dep_node(2, 0)
    graph.build_ddm()

    # Before: 2 -> 0 -> category(1)
    assert graph.ddm.get_deps(2) == {0, 1}

    graph.remove_node(0)
    graph.build_ddm()

    # After: 2 -> category(1)
    assert 0 not in graph.nodes
    assert graph.nodes[2].cat_dependencies == {1}
    assert graph.categories[1].dependants == {2}
    assert graph.ddm.get_deps(2) == {1}


def test_remove_node_diamond_pattern():
    """Test removing a node in a diamond dependency pattern"""
    graph = Graph()
    graph.add_todo(0, 0)
    graph.add_todo(1, 0)
    graph.add_todo(2, 0)
    graph.add_todo(3, 0)
    graph.add_dep_node(0, 1)
    graph.add_dep_node(0, 2)
    graph.add_dep_node(1, 3)
    graph.add_dep_node(2, 3)
    graph.build_ddm()

    # Before: 0 -> 1 -> 3, 0 -> 2 -> 3 (diamond)
    assert graph.ddm.get_deps(0) == {1, 2, 3}

    graph.remove_node(1)
    graph.build_ddm()

    # After: 0 -> 2 -> 3, 0 -> 3
    assert 1 not in graph.nodes
    assert graph.nodes[0].dependencies == {2, 3}
    assert graph.nodes[3].dependants == {0, 2}
    assert graph.ddm.get_deps(0) == {2, 3}


def test_remove_multiple_nodes_sequentially():
    """Test removing multiple nodes one after another"""
    graph = Graph()
    graph.add_todo(0, 0)
    graph.add_todo(1, 0)
    graph.add_todo(2, 0)
    graph.add_todo(3, 0)
    graph.add_dep_node(0, 1)
    graph.add_dep_node(1, 2)
    graph.add_dep_node(2, 3)
    graph.build_ddm()

    # Before: 0 -> 1 -> 2 -> 3
    assert graph.ddm.get_deps(0) == {1, 2, 3}

    graph.remove_node(2)
    graph.build_ddm()
    assert graph.ddm.get_deps(0) == {1, 3}

    graph.remove_node(1)
    graph.build_ddm()

    # After: 0 -> 3
    assert 1 not in graph.nodes
    assert 2 not in graph.nodes
    assert graph.nodes[0].dependencies == {3}
    assert graph.ddm.get_deps(0) == {3}


def test_remove_node_complex_category_structure():
    """Test removing nodes with complex category interactions"""
    graph = Graph()
    graph.add_todo(0, 0)
    graph.add_todo(1, 0)
    graph.add_todo(2, 1)
    graph.add_todo(3, 1)
    graph.add_todo(4, 2)
    graph.add_dep_node(0, 1)
    graph.add_cat_dep(2, 0)
    graph.add_dep_node(3, 2)
    graph.add_dep_node(4, 3)
    graph.build_ddm()

    graph.remove_node(3)
    graph.build_ddm()

    assert 3 not in graph.nodes
    assert graph.nodes[4].dependencies == {2}
    # Check that dependencies are properly propagated through removal


def test_remove_nonexistent_node():
    """Test that removing a non-existent node doesn't crash"""
    graph = Graph()
    graph.add_todo(0, 0)
    graph.build_ddm()

    # Should not raise an error
    graph.remove_node(999)
    graph.build_ddm()

    assert 0 in graph.nodes
    assert 999 not in graph.nodes


def test_remove_node_preserves_other_branches():
    """Test that removing a node doesn't affect unrelated branches"""
    graph = Graph()
    # Branch 1: 0 -> 1 -> 2
    graph.add_todo(0, 0)
    graph.add_todo(1, 0)
    graph.add_todo(2, 0)
    graph.add_dep_node(0, 1)
    graph.add_dep_node(1, 2)

    # Branch 2: 3 -> 4 -> 5
    graph.add_todo(3, 1)
    graph.add_todo(4, 1)
    graph.add_todo(5, 1)
    graph.add_dep_node(3, 4)
    graph.add_dep_node(4, 5)
    graph.build_ddm()

    # Remove from branch 1
    graph.remove_node(1)
    graph.build_ddm()

    # Branch 2 should be unchanged
    assert graph.nodes[3].dependencies == {4}
    assert graph.nodes[4].dependencies == {5}
    assert graph.ddm.get_deps(3) == {4, 5}

    # Branch 1 should be modified
    assert 1 not in graph.nodes
    assert graph.nodes[0].dependencies == {2}
    assert graph.ddm.get_deps(0) == {2}


def test_validate_empty_graph():
    """Test that an empty graph is valid"""
    graph = Graph()
    assert len(graph.nodes) == 0
    assert len(graph.categories) == 0
    assert graph.validate()


def test_validate_simple_graph():
    """Test that a simple valid graph passes validation"""
    graph = Graph()
    graph.add_todo(0, 0)
    graph.add_todo(1, 0)
    graph.add_dep_node(0, 1)

    # Verify structure
    assert len(graph.nodes) == 2
    assert graph.nodes[0].dependencies == {1}
    assert graph.nodes[1].dependants == {0}
    assert graph.nodes[0].cid == 0
    assert graph.nodes[1].cid == 0
    assert graph.categories[0].dependencies == {0}

    # Verify validation passes
    assert graph.validate()


def test_validate_complex_graph():
    """Test that a complex valid graph passes validation"""
    graph = Graph()
    graph.add_todo(0, 0)
    graph.add_todo(1, 0)
    graph.add_todo(2, 1)
    graph.add_todo(3, 1)
    graph.add_dep_node(0, 1)
    graph.add_cat_dep(2, 0)
    graph.add_dep_node(3, 2)

    # Verify structure
    assert len(graph.nodes) == 4
    assert graph.nodes[0].dependencies == {1}
    assert graph.nodes[1].dependants == {0}
    assert graph.nodes[2].cat_dependencies == {0}
    assert graph.nodes[3].dependencies == {2}
    assert graph.categories[0].dependants == {2}
    assert graph.categories[1].dependencies == {3}

    # Verify validation passes
    assert graph.validate()


def test_validate_after_operations(filled_graph):
    """Test that filled_graph fixture is valid and has expected structure"""
    # Verify the filled_graph structure matches fixture
    assert len(filled_graph.nodes) == 6
    assert len(filled_graph.categories) == 2
    assert filled_graph.nodes[0].dependencies == {1}
    assert filled_graph.nodes[1].dependencies == {2}
    assert filled_graph.nodes[3].cat_dependencies == {0}
    assert filled_graph.nodes[4].dependencies == {3}
    assert filled_graph.nodes[5].dependencies == {3}

    # Verify validation passes
    assert filled_graph.validate()


def test_validate_after_remove_node():
    """Test that graph remains valid after removing a node"""
    graph = Graph()
    graph.add_todo(0, 0)
    graph.add_todo(1, 0)
    graph.add_todo(2, 0)
    graph.add_dep_node(0, 1)
    graph.add_dep_node(1, 2)

    # Before removal
    assert len(graph.nodes) == 3
    assert graph.nodes[0].dependencies == {1}
    assert graph.nodes[1].dependencies == {2}
    assert graph.validate()

    graph.remove_node(1)

    # After removal - verify correct structure
    assert len(graph.nodes) == 2
    assert 1 not in graph.nodes
    assert graph.nodes[0].dependencies == {2}
    assert graph.nodes[2].dependants == {0}
    assert 1 not in graph.nodes[0].dependencies
    assert 1 not in graph.nodes[2].dependants
    assert graph.validate()


def test_validate_dangling_dependency():
    """Test that dangling dependency reference is detected"""
    graph = Graph()
    graph.add_todo(0, 0)
    graph.add_todo(1, 0)
    graph.add_dep_node(0, 1)

    # Verify initial state is correct and valid
    assert graph.nodes[0].dependencies == {1}
    assert graph.validate()

    # Manually create a dangling reference
    graph.nodes[0].dependencies.add(999)
    assert graph.nodes[0].dependencies == {1, 999}
    assert not graph.validate()


def test_validate_dangling_dependant():
    """Test that dangling dependant reference is detected"""
    graph = Graph()
    graph.add_todo(0, 0)
    graph.add_todo(1, 0)
    graph.add_dep_node(0, 1)

    # Verify initial state is correct and valid
    assert graph.nodes[1].dependants == {0}
    assert graph.validate()

    # Manually create a dangling reference
    graph.nodes[1].dependants.add(999)
    assert graph.nodes[1].dependants == {0, 999}
    assert not graph.validate()


def test_validate_dangling_category_dependency():
    """Test that dangling category dependency is detected"""
    graph = Graph()
    graph.add_todo(0, 0)

    # Verify initial state is correct and valid
    assert graph.nodes[0].cat_dependencies == set()
    assert graph.validate()

    # Manually create a dangling category reference
    graph.nodes[0].cat_dependencies.add(999)
    assert graph.nodes[0].cat_dependencies == {999}
    assert not graph.validate()


def test_validate_dangling_cat_dependant():
    """Test that dangling cat_dependant is detected"""
    graph = Graph()
    graph.add_todo(0, 0)

    # Verify initial state is correct and valid
    assert graph.nodes[0].cat_dependant == 0
    assert graph.categories[0].dependencies == {0}
    assert graph.validate()

    # Manually create a dangling cat_dependant reference
    graph.nodes[0].cat_dependant = 999
    assert graph.nodes[0].cat_dependant == 999
    assert not graph.validate()


def test_validate_bidirectional_consistency_deps():
    """Test that bidirectional consistency is checked for dependencies"""
    graph = Graph()
    graph.add_todo(0, 0)
    graph.add_todo(1, 0)
    graph.add_dep_node(0, 1)

    # Verify initial state is correct and valid
    assert graph.nodes[0].dependencies == {1}
    assert graph.nodes[1].dependants == {0}
    assert graph.validate()

    # Break bidirectional consistency - 0 depends on 1, but 1 doesn't know about 0
    graph.nodes[1].dependants.remove(0)
    assert graph.nodes[0].dependencies == {1}
    assert graph.nodes[1].dependants == set()
    assert not graph.validate()


def test_validate_bidirectional_consistency_dependants():
    """Test that bidirectional consistency is checked for dependants"""
    graph = Graph()
    graph.add_todo(0, 0)
    graph.add_todo(1, 0)
    graph.add_dep_node(0, 1)

    # Verify initial state is correct and valid
    assert graph.nodes[0].dependencies == {1}
    assert graph.nodes[1].dependants == {0}
    assert graph.validate()

    # Break bidirectional consistency - 1 has dependant 0, but 0 doesn't depend on 1
    graph.nodes[0].dependencies.remove(1)
    assert graph.nodes[0].dependencies == set()
    assert graph.nodes[1].dependants == {0}
    assert not graph.validate()


def test_validate_bidirectional_category_deps():
    """Test that bidirectional consistency is checked for category dependencies"""
    graph = Graph()
    graph.add_todo(0, 0)
    graph.add_todo(1, 1)
    graph.add_cat_dep(0, 1)

    # Verify initial state is correct and valid
    assert graph.nodes[0].cat_dependencies == {1}
    assert graph.categories[1].dependants == {0}
    assert graph.validate()

    # Break bidirectional consistency
    graph.categories[1].dependants.remove(0)
    assert graph.nodes[0].cat_dependencies == {1}
    assert graph.categories[1].dependants == set()
    assert not graph.validate()


def test_validate_bidirectional_cat_dependant():
    """Test that bidirectional consistency is checked for cat_dependant"""
    graph = Graph()
    graph.add_todo(0, 0)

    # Verify initial state is correct and valid
    assert graph.nodes[0].cat_dependant == 0
    assert graph.categories[0].dependencies == {0}
    assert graph.validate()

    # Break bidirectional consistency
    graph.categories[0].dependencies.remove(0)
    assert graph.nodes[0].cat_dependant == 0
    assert graph.categories[0].dependencies == set()
    assert not graph.validate()


def test_validate_category_dependencies_point_to_nodes():
    """Test that category dependencies point to valid nodes"""
    graph = Graph()
    graph.add_todo(0, 0)

    # Verify initial state is correct and valid
    assert graph.categories[0].dependencies == {0}
    assert graph.validate()

    # Manually add invalid node reference to category
    graph.categories[0].dependencies.add(999)
    assert graph.categories[0].dependencies == {0, 999}
    assert not graph.validate()


def test_validate_category_dependants_point_to_nodes():
    """Test that category dependants point to valid nodes"""
    graph = Graph()
    graph.add_todo(0, 0)

    # Verify initial state is correct and valid
    assert graph.categories[0].dependants == set()
    assert graph.validate()

    # Manually add invalid node reference to category
    graph.categories[0].dependants.add(999)
    assert graph.categories[0].dependants == {999}
    assert not graph.validate()


def test_validate_after_dedupe():
    """Test that graph remains valid after deduplication"""
    graph = Graph()
    graph.add_todo(0, 0)
    graph.add_todo(1, 0)
    graph.add_todo(2, 0)
    graph.add_dep_node(0, 1)
    graph.add_dep_node(0, 2)  # Redundant: 0 -> 2 when 0 -> 1 -> 2 exists
    graph.add_dep_node(1, 2)
    graph.build_ddm()

    # Before dedupe: verify structure and validation
    assert graph.nodes[0].dependencies == {1, 2}
    assert graph.nodes[1].dependencies == {2}
    assert graph.nodes[2].dependants == {0, 1}
    assert graph.validate()

    graph.dedupe()

    # After dedupe: redundant edge should be removed
    assert graph.nodes[0].dependencies == {1}
    assert graph.nodes[1].dependencies == {2}
    assert graph.nodes[2].dependants == {1}
    assert 2 not in graph.nodes[0].dependencies
    assert 0 not in graph.nodes[2].dependants
    assert graph.validate()
