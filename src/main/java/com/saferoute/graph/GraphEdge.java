package com.saferoute.graph;

public record GraphEdge(long targetId, double distanceMeters, int riskScore) {
    public double safetyCost() { return distanceMeters * (1.0 + riskScore / 100.0); }
