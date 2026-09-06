package com.saferoute;

import com.saferoute.graph.Graph;
import com.saferoute.model.Road;
import com.saferoute.routing.Route;
import com.saferoute.routing.RouteFinder;
import javafx.application.Application;
import javafx.geometry.Insets;
import javafx.geometry.Pos;
import javafx.scene.Scene;
import javafx.scene.control.*;
import javafx.scene.layout.*;
import javafx.scene.paint.Color;
import javafx.stage.Stage;

public final class Main extends Application {
    private final Graph graph = demoGraph();
    private final RouteFinder routeFinder = new RouteFinder();
