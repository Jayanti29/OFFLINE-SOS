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
    }

    private void initialize() throws SQLException {
        try (Statement statement = connection.createStatement()) {
            statement.executeUpdate("CREATE TABLE IF NOT EXISTS schema_version (version INTEGER NOT NULL)");
            try (ResultSet result = statement.executeQuery("SELECT COUNT(*) FROM schema_version")) {
                if (result.next() && result.getInt(1) == 0) statement.executeUpdate("INSERT INTO schema_version VALUES (1)");
            }
            statement.executeUpdate("CREATE TABLE IF NOT EXISTS data_sources (id INTEGER PRIMARY KEY, name TEXT NOT NULL, publisher TEXT NOT NULL, url TEXT, license TEXT, retrieved_at TEXT NOT NULL, coverage TEXT, description TEXT)");
            statement.executeUpdate("CREATE TABLE IF NOT EXISTS locations (id INTEGER PRIMARY KEY, name TEXT NOT NULL, latitude REAL NOT NULL CHECK(latitude BETWEEN -90 AND 90), longitude REAL NOT NULL CHECK(longitude BETWEEN -180 AND 180), type TEXT NOT NULL, source_id INTEGER REFERENCES data_sources(id), external_id TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, UNIQUE(source_id, external_id))");
            statement.executeUpdate("CREATE TABLE IF NOT EXISTS roads (id INTEGER PRIMARY KEY, from_location_id INTEGER NOT NULL REFERENCES locations(id), to_location_id INTEGER NOT NULL REFERENCES locations(id), distance_meters REAL NOT NULL CHECK(distance_meters >= 0), road_type TEXT NOT NULL, source_id INTEGER REFERENCES data_sources(id), external_id TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, UNIQUE(source_id, external_id))");
            statement.executeUpdate("CREATE TABLE IF NOT EXISTS safe_points (id INTEGER PRIMARY KEY, location_id INTEGER NOT NULL REFERENCES locations(id), name TEXT NOT NULL, type TEXT NOT NULL, description TEXT, source_id INTEGER REFERENCES data_sources(id), external_id TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL)");
            statement.executeUpdate("CREATE TABLE IF NOT EXISTS safety_data (id INTEGER PRIMARY KEY, road_id INTEGER NOT NULL REFERENCES roads(id), risk_score REAL CHECK(risk_score BETWEEN 0 AND 100), lighting_score REAL CHECK(lighting_score BETWEEN 0 AND 100), crowd_score REAL CHECK(crowd_score BETWEEN 0 AND 100), confidence REAL CHECK(confidence BETWEEN 0 AND 1), data_type TEXT NOT NULL, source_id INTEGER REFERENCES data_sources(id), observed_at TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL)");
            statement.executeUpdate("CREATE TABLE IF NOT EXISTS route_history (id INTEGER PRIMARY KEY, created_at TEXT NOT NULL, source_location_id INTEGER NOT NULL REFERENCES locations(id), destination_location_id INTEGER NOT NULL REFERENCES locations(id), route_type TEXT NOT NULL, distance_meters REAL NOT NULL CHECK(distance_meters >= 0), safety_score REAL CHECK(safety_score BETWEEN 0 AND 100))");
            statement.executeUpdate("CREATE TABLE IF NOT EXISTS sos_records (id INTEGER PRIMARY KEY, created_at TEXT NOT NULL, current_location_id INTEGER REFERENCES locations(id), destination_location_id INTEGER REFERENCES locations(id), emergency_type TEXT NOT NULL, severity TEXT NOT NULL, route_id INTEGER REFERENCES route_history(id), status TEXT NOT NULL, encrypted_message BLOB)");
            statement.executeUpdate("CREATE TABLE IF NOT EXISTS sync_metadata (entity_type TEXT NOT NULL, entity_id INTEGER NOT NULL, local_updated_at TEXT NOT NULL, remote_updated_at TEXT, sync_status TEXT NOT NULL, last_sync_attempt TEXT, PRIMARY KEY(entity_type, entity_id))");
            statement.executeUpdate("CREATE INDEX IF NOT EXISTS idx_roads_from ON roads(from_location_id)");
            statement.executeUpdate("CREATE INDEX IF NOT EXISTS idx_roads_to ON roads(to_location_id)");
            statement.executeUpdate("CREATE INDEX IF NOT EXISTS idx_sos_created ON sos_records(created_at)");
            statement.executeUpdate("CREATE INDEX IF NOT EXISTS idx_sync_status ON sync_metadata(sync_status)");
        }
    }

    public Connection connection() { return connection; }
    @Override public void close() throws SQLException { connection.close(); }
}
