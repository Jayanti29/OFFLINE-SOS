package com.saferoute.graph;

import com.saferoute.model.Road;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class GraphTest {
    @Test void roadsAreAvailableInBothDirections() {
        Graph graph = new Graph();
        graph.addRoad(new Road(1, 1, 2, 125, 20));

        assertTrue(graph.contains(1));
        assertTrue(graph.contains(2));
        assertEquals(2, graph.edgesFrom(1).size() + graph.edgesFrom(2).size());
        assertEquals(2, graph.edgesFrom(1).get(0).targetId());
        assertEquals(1, graph.edgesFrom(2).get(0).targetId());
    }

    @Test void unknownNodesHaveNoEdgesAndReturnedEdgesAreImmutable() {
        Graph graph = new Graph();
        graph.addNode(7);

        assertTrue(graph.contains(7));
        assertFalse(graph.contains(8));
        assertTrue(graph.edgesFrom(8).isEmpty());
        assertThrows(UnsupportedOperationException.class, () -> graph.edgesFrom(7).add(new GraphEdge(8, 1, 0)));
    }
}