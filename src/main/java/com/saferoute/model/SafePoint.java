package com.saferoute.model;

public record SafePoint(long id, long locationId, String name, String type) {
    public SafePoint {
