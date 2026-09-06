package com.saferoute.routing;

import com.saferoute.graph.Graph;
import com.saferoute.graph.GraphEdge;
import java.util.*;

public final class RouteFinder {
    private record State(long node, double cost) {}

