package com.saferoute.graph;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

class GraphEdgeTest {
    @Test void safetyCostCombinesDistanceAndRisk() {
        GraphEdge edge = new GraphEdge(2, 200, 25);
