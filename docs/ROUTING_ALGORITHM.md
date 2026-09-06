# Routing Algorithm

`RouteFinder` uses Dijkstra's algorithm over an adjacency-list graph. Shortest routing minimizes distance. Safest routing minimizes `distance * (1 + risk / 100)`. Balanced routing combines those costs equally. Results retain their node path, distance, preference, and a deterministic calculated score.
