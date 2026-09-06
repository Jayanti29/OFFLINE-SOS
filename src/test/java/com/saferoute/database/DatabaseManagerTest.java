package com.saferoute.database;

import org.junit.jupiter.api.Test;
import java.nio.file.Files;
import static org.junit.jupiter.api.Assertions.*;

class DatabaseManagerTest {
    @Test void initializesSchemaAndEnablesForeignKeys() throws Exception {
        var path = Files.createTempFile("saferoute", ".db");
