package com.saferoute.model;

import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class ValidationTest {
    @Test void rejectsInvalidCoordinates() {
        assertThrows(IllegalArgumentException.class, () -> new Location(1, "x", 91, 0));
