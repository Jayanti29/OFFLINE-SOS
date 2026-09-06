# Database

`DatabaseManager` creates the local SQLite schema without deleting existing data. Foreign keys, coordinate checks, non-negative distance checks, safety ranges, uniqueness for source/external identifiers, and indexes for route queries are enabled.

Missing safety factors remain `NULL`; they are not interpreted as safe. External records should carry a `data_sources` reference and retrieval timestamp.
