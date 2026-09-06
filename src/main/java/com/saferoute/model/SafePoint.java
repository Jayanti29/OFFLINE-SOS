package com.saferoute.model;

public record SafePoint(long id, long locationId, String name, String type) {
    public SafePoint {
        if (name == null || name.isBlank()) throw new IllegalArgumentException("Safe point name is required");
    }
}
