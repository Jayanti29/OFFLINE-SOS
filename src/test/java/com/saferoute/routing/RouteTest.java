package com.saferoute.routing;

import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class RouteTest {
    @Test void copiesLocationIdsAndPreservesRouteMetadata() {
        List<Long> locationIds = new ArrayList<>(List.of(1L, 2L));
        Route route = new Route(locationIds, 100, 75, "SAFE");
        locationIds.add(3L);

