package com.saferoute.model;

import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class ValidationTest {
    @Test void rejectsInvalidCoordinates() {
        assertThrows(IllegalArgumentException.class, () -> new Location(1, "x", 91, 0));
        assertThrows(IllegalArgumentException.class, () -> new Location(1, "x", 0, 181));
    }

    @Test void rejectsNegativeDistance() {
        assertThrows(IllegalArgumentException.class, () -> new Road(1, 1, 2, -1, 0));
    }

    @Test void rejectsInvalidLocationAndRoadValues() {
