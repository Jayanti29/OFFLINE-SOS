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
