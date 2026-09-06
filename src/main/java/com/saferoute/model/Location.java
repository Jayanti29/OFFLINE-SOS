package com.saferoute.model;

public record Location(long id, String name, double latitude, double longitude) {
    public Location {
