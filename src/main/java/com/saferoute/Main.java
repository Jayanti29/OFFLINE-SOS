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
    private final Label result = new Label("Choose the safest available route when you are ready.");

    @Override public void start(Stage stage) {
        Label title = new Label("OFFLINE SOS"); title.getStyleClass().add("eyebrow");
        Label brand = new Label("SafeRoute"); brand.getStyleClass().add("brand");
        Label status = new Label("● OFFLINE  |  Using local map data"); status.getStyleClass().add("offline");
        HBox header = new HBox(14, new VBox(3, title, brand), new Region(), status);
        HBox.setHgrow(header.getChildren().get(1), Priority.ALWAYS); header.setAlignment(Pos.CENTER_LEFT);

        Label location = new Label("SIMULATED LOCATION\nLibrary Block"); location.getStyleClass().add("location");
        Label dataNote = new Label("Synthetic demo graph • not real-world geographic or safety data"); dataNote.getStyleClass().add("muted");
        VBox locationPanel = new VBox(5, new Label("CURRENT LOCATION"), location, dataNote); locationPanel.getStyleClass().add("panel");

        Label map = new Label("MAP\n\n      ● Library Block\n              ╲\n               ╲  ━━━ recommended route\n                ╲\n                 ⛨ Campus Security\n\nRoad network loaded locally");
        map.getStyleClass().add("map"); map.setMaxWidth(Double.MAX_VALUE); map.setMaxHeight(Double.MAX_VALUE);
        VBox.setVgrow(map, Priority.ALWAYS);

        ComboBox<String> destination = new ComboBox<>(); destination.getItems().add("Campus Security (synthetic demo)"); destination.getSelectionModel().selectFirst(); destination.setMaxWidth(Double.MAX_VALUE);
        Button emergency = new Button("🚨  FIND SAFEST ROUTE"); emergency.getStyleClass().add("emergency"); emergency.setMaxWidth(Double.MAX_VALUE); emergency.setOnAction(event -> showRoute());
        VBox action = new VBox(10, new Label("WHERE DO YOU WANT TO GO?"), destination, emergency); action.getStyleClass().add("panel");

        result.setWrapText(true); result.getStyleClass().add("result"); result.setMaxWidth(Double.MAX_VALUE);
        VBox content = new VBox(16, header, locationPanel, map, action, result); content.setPadding(new Insets(24)); VBox.setVgrow(map, Priority.ALWAYS);
        Scene scene = new Scene(content, 760, 820); scene.getStylesheets().add(getClass().getResource("/saferoute.css").toExternalForm());
        stage.setTitle("OFFLINE SOS - SafeRoute"); stage.setMinWidth(520); stage.setMinHeight(680); stage.setScene(scene); stage.show();
    }

    private void showRoute() {
        Route route = routeFinder.findSafestRoute(graph, 1, 4);
        result.setText("RECOMMENDED ROUTE\n\nCampus Security • " + Math.round(route.distanceMeters()) + " m\nSafety score: " + Math.round(route.safetyScore()) + "/100 (calculated)\n\nWhy this route?\n• Uses the lowest risk-weighted cost in the local graph\n• Route path: " + route.locationIds() + "\n\nData limitation: risk values are synthetic demo inputs. This is not a guarantee of personal safety.");
    }

    private static Graph demoGraph() {
        Graph graph = new Graph();
        graph.addRoad(new Road(1, 1, 2, 100, 80));
        graph.addRoad(new Road(2, 2, 4, 100, 80));
        graph.addRoad(new Road(3, 1, 3, 130, 5));
        graph.addRoad(new Road(4, 3, 4, 130, 5));
        return graph;
    }

    public static void main(String[] args) { launch(args); }
}
