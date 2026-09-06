# SafeRoute workspace

- Keep the application offline-first: local SQLite is the operational source.
- Label synthetic or unavailable data in code and UI; never imply unsupported real-world safety claims.
- Controllers call services, services call repositories, and routing remains independent of JavaFX.
