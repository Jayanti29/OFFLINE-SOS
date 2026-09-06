# Safety Scoring

Risk values are application inputs, not official classifications. A route's safety cost is the sum of each edge's `distance * (1 + risk / 100)`. The displayed score is a bounded comparison value derived from that cost and route distance. Missing factors remain unavailable and reduce confidence in any future multi-factor score.
