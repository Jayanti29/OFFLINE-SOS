package com.saferoute.graph;

public record GraphEdge(long targetId, double distanceMeters, int riskScore) {
