# Testing

Run `mvn clean test`. Unit tests use an in-memory graph or a temporary SQLite file and never touch a user's persistent database. The routing tests cover shortest, safest, and unreachable paths; database tests verify initialization and foreign-key enforcement.
