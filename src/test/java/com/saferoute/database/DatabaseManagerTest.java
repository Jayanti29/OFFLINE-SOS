package com.saferoute.database;

import org.junit.jupiter.api.Test;
import java.nio.file.Files;
import static org.junit.jupiter.api.Assertions.*;

class DatabaseManagerTest {
    @Test void initializesSchemaAndEnablesForeignKeys() throws Exception {
        var path = Files.createTempFile("saferoute", ".db");
        try (var database = new DatabaseManager(path)) {
            try (var result = database.connection().createStatement().executeQuery("PRAGMA foreign_keys")) {
                assertTrue(result.next());
                assertEquals(1, result.getInt(1));
