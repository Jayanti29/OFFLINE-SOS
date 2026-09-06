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

    public Route findBalancedRoute(Graph graph, long start, long destination) {
        return find(graph, start, destination, edge -> edge.distanceMeters() * 0.5 + edge.safetyCost() * 0.5, "BALANCED");
    }

    private Route find(Graph graph, long start, long destination, java.util.function.ToDoubleFunction<GraphEdge> weight, String preference) {
        if (!graph.contains(start) || !graph.contains(destination)) throw new IllegalArgumentException("Unknown route location");
        Map<Long, Double> costs = new HashMap<>();
        Map<Long, Long> previous = new HashMap<>();
        PriorityQueue<State> queue = new PriorityQueue<>(Comparator.comparingDouble(State::cost));
        costs.put(start, 0.0); queue.add(new State(start, 0));
        while (!queue.isEmpty()) {
            State current = queue.poll();
            if (current.cost() != costs.getOrDefault(current.node(), Double.POSITIVE_INFINITY)) continue;
            if (current.node() == destination) break;
            for (GraphEdge edge : graph.edgesFrom(current.node())) {
                double nextCost = current.cost() + weight.applyAsDouble(edge);
                if (nextCost < costs.getOrDefault(edge.targetId(), Double.POSITIVE_INFINITY)) {
                    costs.put(edge.targetId(), nextCost); previous.put(edge.targetId(), current.node()); queue.add(new State(edge.targetId(), nextCost));
                }
            }
        }
        if (!costs.containsKey(destination)) throw new IllegalStateException("No route available");
        LinkedList<Long> path = new LinkedList<>();
        for (Long node = destination; node != null; node = previous.get(node)) path.addFirst(node);
        double distance = 0; double riskCost = 0;
        for (int index = 0; index < path.size() - 1; index++) {
            long nextLocation = path.get(index + 1);
            GraphEdge edge = graph.edgesFrom(path.get(index)).stream().filter(candidate -> candidate.targetId() == nextLocation).findFirst().orElseThrow();
            distance += edge.distanceMeters(); riskCost += edge.safetyCost();
        }
        double score = Math.max(0, Math.min(100, 100 - (riskCost / Math.max(distance, 1) * 50)));
        return new Route(path, distance, score, preference);
    }
}
