package com.saferoute.routing;

import com.saferoute.graph.Graph;
import com.saferoute.graph.GraphEdge;
import java.util.*;

public final class RouteFinder {
    private record State(long node, double cost) {}

    public Route findShortestRoute(Graph graph, long start, long destination) {
        return find(graph, start, destination, GraphEdge::distanceMeters, "SHORTEST");
    }

    public Route findSafestRoute(Graph graph, long start, long destination) {
        return find(graph, start, destination, GraphEdge::safetyCost, "SAFEST");
    }
