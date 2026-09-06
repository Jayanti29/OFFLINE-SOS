package com.saferoute.graph;

import com.saferoute.model.Road;
import java.util.*;

public final class Graph {
    private final Map<Long, List<GraphEdge>> adjacency = new HashMap<>();
