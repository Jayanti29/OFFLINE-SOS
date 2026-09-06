package com.saferoute.routing;

import java.util.List;

public record Route(List<Long> locationIds, double distanceMeters, double safetyScore, String preference) {
    public Route {
        locationIds = List.copyOf(locationIds);
