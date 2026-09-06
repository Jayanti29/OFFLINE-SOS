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
        graph.addRoad(new Road(3, 1, 3, 130, 5));
        graph.addRoad(new Road(4, 3, 4, 130, 5));
        return graph;
    }

    @Test void shortestRouteUsesDistance() {
        assertEquals(java.util.List.of(1L, 2L, 4L), new RouteFinder().findShortestRoute(graph(), 1, 4).locationIds());
    }

    @Test void safestRouteUsesRiskWeightedCost() {
        assertEquals(java.util.List.of(1L, 3L, 4L), new RouteFinder().findSafestRoute(graph(), 1, 4).locationIds());
    }

    @Test void unreachableDestinationIsReported() {
        Graph graph = new Graph(); graph.addNode(1); graph.addNode(2);
        assertThrows(IllegalStateException.class, () -> new RouteFinder().findShortestRoute(graph, 1, 2));
    }

    @Test void balancedRouteUsesCombinedDistanceAndSafetyCost() {
        Route route = new RouteFinder().findBalancedRoute(graph(), 1, 4);

        assertEquals(java.util.List.of(1L, 3L, 4L), route.locationIds());
        assertEquals("BALANCED", route.preference());
    }

    @Test void rejectsUnknownLocations() {
        Graph graph = graph();

        assertThrows(IllegalArgumentException.class, () -> new RouteFinder().findShortestRoute(graph, 9, 4));
        assertThrows(IllegalArgumentException.class, () -> new RouteFinder().findShortestRoute(graph, 1, 9));
    }

    @Test void routeToSameLocationHasFullScore() {
        Route route = new RouteFinder().findSafestRoute(graph(), 1, 1);

        assertEquals(java.util.List.of(1L), route.locationIds());
        assertEquals(0, route.distanceMeters());
        assertEquals(100, route.safetyScore());
    }
}
