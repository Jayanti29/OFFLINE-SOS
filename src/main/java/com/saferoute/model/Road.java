package com.saferoute.model;

public record Road(long id, long fromLocationId, long toLocationId, double distanceMeters, int riskScore) {
