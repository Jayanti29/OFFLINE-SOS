package com.saferoute.database;

import java.sql.*;
import java.nio.file.Path;

public final class DatabaseManager implements AutoCloseable {
    private final Connection connection;

    public DatabaseManager(Path databasePath) throws SQLException {
        connection = DriverManager.getConnection("jdbc:sqlite:" + databasePath.toAbsolutePath());
        try (Statement statement = connection.createStatement()) {
            statement.execute("PRAGMA foreign_keys = ON");
            statement.execute("PRAGMA busy_timeout = 5000");
        }
        initialize();
