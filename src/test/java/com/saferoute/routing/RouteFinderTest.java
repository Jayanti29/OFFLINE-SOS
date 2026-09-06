package com.saferoute.routing;

import com.saferoute.graph.Graph;
import com.saferoute.model.Road;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class RouteFinderTest {
    private Graph graph() {
        Graph graph = new Graph();
        graph.addRoad(new Road(1, 1, 2, 100, 80));
        graph.addRoad(new Road(2, 2, 4, 100, 80));
