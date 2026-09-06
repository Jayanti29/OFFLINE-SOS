package com.saferoute.routing;

import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class RouteTest {
    @Test void copiesLocationIdsAndPreservesRouteMetadata() {
        List<Long> locationIds = new ArrayList<>(List.of(1L, 2L));
