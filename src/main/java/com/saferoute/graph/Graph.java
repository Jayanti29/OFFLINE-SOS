package com.saferoute.graph;

import com.saferoute.model.Road;
import java.util.*;

public final class Graph {
    private final Map<Long, List<GraphEdge>> adjacency = new HashMap<>();

    public void addNode(long id) { adjacency.computeIfAbsent(id, ignored -> new ArrayList<>()); }

    public void addRoad(Road road) {
        addNode(road.fromLocationId());
        addNode(road.toLocationId());
        adjacency.get(road.fromLocationId()).add(new GraphEdge(road.toLocationId(), road.distanceMeters(), road.riskScore()));
        adjacency.get(road.toLocationId()).add(new GraphEdge(road.fromLocationId(), road.distanceMeters(), road.riskScore()));
    }

    public List<GraphEdge> edgesFrom(long id) { return List.copyOf(adjacency.getOrDefault(id, List.of())); }
