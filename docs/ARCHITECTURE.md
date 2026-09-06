# Architecture

SafeRoute uses JavaFX -> services -> repositories/database, with routing as a separate pure domain component. SQLite is the operational source and is initialized once per database file. Online synchronization is optional and must update local records with source and freshness metadata.
