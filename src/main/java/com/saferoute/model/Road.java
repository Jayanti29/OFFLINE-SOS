package com.saferoute.model;

public record Road(long id, long fromLocationId, long toLocationId, double distanceMeters, int riskScore) {
    public Road {
        if (fromLocationId == toLocationId) throw new IllegalArgumentException("A road cannot connect a location to itself");
        if (distanceMeters < 0) throw new IllegalArgumentException("Distance must be non-negative");
        if (riskScore < 0 || riskScore > 100) throw new IllegalArgumentException("Risk must be between 0 and 100");
    }
