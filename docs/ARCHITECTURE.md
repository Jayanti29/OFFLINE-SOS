# Architecture

SafeRoute uses JavaFX -> services -> repositories/database, with routing as a separate pure domain component. SQLite is the operational source and is initialized once per database file. Online synchronization is optional and must update local records with source and freshness metadata.

The current demo uses a synthetic graph only. No location, road, or safety claim in the demo should be treated as real-world data.
