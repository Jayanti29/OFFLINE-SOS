package com.saferoute;

import com.saferoute.graph.Graph;
import com.saferoute.graph.GraphEdge;
import com.saferoute.model.Location;
import com.saferoute.model.Road;
import com.saferoute.routing.Route;
import com.saferoute.routing.RouteFinder;
import javafx.application.Application;
import javafx.geometry.Insets;
import javafx.geometry.Pos;
import javafx.scene.Scene;
import javafx.scene.canvas.Canvas;
import javafx.scene.canvas.GraphicsContext;
import javafx.scene.control.Alert;
import javafx.scene.control.Button;
import javafx.scene.control.ComboBox;
import javafx.scene.control.Label;
import javafx.scene.layout.FlowPane;
import javafx.scene.layout.HBox;
import javafx.scene.layout.Priority;
import javafx.scene.layout.Region;
import javafx.scene.layout.StackPane;
import javafx.scene.layout.VBox;
import javafx.scene.paint.Color;
import javafx.scene.text.Font;
import javafx.scene.text.FontWeight;
import javafx.stage.Stage;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

public final class Main extends Application {
    private static final double MIN_LATITUDE = 12.98;
    private static final double MAX_LATITUDE = 13.20;
    private static final double MIN_LONGITUDE = 77.48;
    private static final double MAX_LONGITUDE = 77.64;

    private final Graph graph = demoGraph();
    private final RouteFinder routeFinder = new RouteFinder();
    private final List<MapPin> mapPins = demoPins();
    private final Map<Long, Location> routeLocations = mapPins.stream()
            .filter(MapPin::routeNode)
            .collect(Collectors.toUnmodifiableMap(MapPin::id, pin -> new Location(pin.id(), pin.name(), pin.latitude(), pin.longitude())));
    private final Canvas mapCanvas = new Canvas(720, 390);
    private final Label result = new Label("Select FIND SAFEST ROUTE to draw an offline route.");
    private final Label mapStatus = new Label("12 demonstration reference points loaded locally");

    @Override public void start(Stage stage) {
        Label title = new Label("OFFLINE SOS"); title.getStyleClass().add("eyebrow");
        Label brand = new Label("SafeRoute Bengaluru"); brand.getStyleClass().add("brand");
        Label status = new Label("● OFFLINE  |  LOCAL DEMO MAP"); status.getStyleClass().add("offline");
        Button sos = new Button("SOS"); sos.getStyleClass().add("sos"); sos.setOnAction(event -> sendSos());
        HBox header = new HBox(14, new VBox(3, title, brand), new Region(), status, sos);
        HBox.setHgrow(header.getChildren().get(1), Priority.ALWAYS); header.setAlignment(Pos.CENTER_LEFT);

        Label location = new Label("Provident Wellworth City"); location.getStyleClass().add("location");
        Label locationDetail = new Label("ORIGIN  •  Bengaluru demonstration route"); locationDetail.getStyleClass().add("muted");
        Label dataNote = new Label("Approximate reference points • synthetic/unverified • no live map connection"); dataNote.getStyleClass().add("muted");
        VBox locationPanel = new VBox(5, new Label("CURRENT LOCATION"), location, locationDetail, dataNote); locationPanel.getStyleClass().add("panel");

        StackPane mapFrame = new StackPane(mapCanvas); mapFrame.getStyleClass().add("map-frame");
        mapCanvas.widthProperty().bind(mapFrame.widthProperty()); mapCanvas.heightProperty().bind(mapFrame.heightProperty());
        mapCanvas.widthProperty().addListener(observable -> drawMap(null)); mapCanvas.heightProperty().addListener(observable -> drawMap(null));
        drawMap(null);
        Label mapTitle = new Label("BENGALURU SUPPORT MAP"); mapTitle.getStyleClass().add("map-title");
        StackPane.setAlignment(mapTitle, Pos.TOP_LEFT); StackPane.setMargin(mapTitle, new Insets(14)); mapFrame.getChildren().add(mapTitle);

        ComboBox<String> destination = new ComboBox<>(); destination.getItems().add("Presidency University Bengaluru"); destination.getSelectionModel().selectFirst(); destination.setMaxWidth(Double.MAX_VALUE);
        Button routeButton = new Button("FIND SAFEST OFFLINE ROUTE"); routeButton.getStyleClass().add("emergency"); routeButton.setMaxWidth(Double.MAX_VALUE); routeButton.setOnAction(event -> showRoute());
        VBox action = new VBox(10, new Label("DESTINATION"), destination, routeButton); action.getStyleClass().add("panel");

        FlowPane support = new FlowPane(8, 8); support.getStyleClass().add("support-list");
        for (MapPin pin : mapPins) { Label pinLabel = new Label(pin.symbol() + "  " + pin.name()); pinLabel.getStyleClass().add("support-chip"); support.getChildren().add(pinLabel); }
        VBox supportPanel = new VBox(8, new Label("HOSPITALS, POLICE AND SUPPORT POINTS"), support, mapStatus); supportPanel.getStyleClass().add("panel");

        result.setWrapText(true); result.getStyleClass().add("result"); result.setMaxWidth(Double.MAX_VALUE);
        VBox content = new VBox(16, header, locationPanel, mapFrame, action, supportPanel, result); content.setPadding(new Insets(24)); VBox.setVgrow(mapFrame, Priority.ALWAYS);
        Scene scene = new Scene(content, 940, 980); scene.getStylesheets().add(getClass().getResource("/saferoute.css").toExternalForm());
        stage.setTitle("OFFLINE SOS - SafeRoute Bengaluru"); stage.setMinWidth(680); stage.setMinHeight(760); stage.setScene(scene); stage.show();
    }

    private void showRoute() {
        Route route = routeFinder.findSafestRoute(graph, 1, 4); drawMap(route);
        mapStatus.setText("Offline route drawn through " + route.locationIds().size() + " local waypoints");
        result.setText("RECOMMENDED OFFLINE ROUTE\n\nProvident Wellworth City → Presidency University Bengaluru\n"
                + Math.round(route.distanceMeters() / 1000) + " km estimated graph distance  •  " + Math.round(route.safetyScore()) + "/100 calculated score\n\n"
                + "Route path: " + route.locationIds().stream().map(routeLocations::get).map(Location::name).collect(Collectors.joining(" → "))
                + "\n\nRisk values are synthetic demo inputs. This map is not live navigation and does not guarantee personal safety.");
    }

    private void sendSos() {
        result.setText("OFFLINE SOS READY\n\nA local SOS event was prepared on this device.\nNo network request was sent. Call the appropriate emergency service directly when possible.\n\nCurrent reference: Provident Wellworth City");
        Alert alert = new Alert(Alert.AlertType.INFORMATION); alert.setTitle("Offline SOS"); alert.setHeaderText("SOS event prepared locally");
        alert.setContentText("No message was sent because this application is offline. Contact emergency services directly when possible."); alert.showAndWait();
    }

    private void drawMap(Route route) {
        GraphicsContext graphics = mapCanvas.getGraphicsContext2D(); double width = mapCanvas.getWidth(); double height = mapCanvas.getHeight();
        if (width <= 0 || height <= 0) return;
        graphics.setFill(Color.web("#e6eee4")); graphics.fillRect(0, 0, width, height); graphics.setStroke(Color.web("#d1dfcf")); graphics.setLineWidth(1);
        for (double x = 0; x < width; x += 42) graphics.strokeLine(x, 0, x, height); for (double y = 0; y < height; y += 42) graphics.strokeLine(0, y, width, y);
        graphics.setStroke(Color.web("#b7c9b5")); graphics.setLineWidth(5);
        for (MapPin pin : mapPins.stream().filter(MapPin::routeNode).toList()) for (GraphEdge edge : graph.edgesFrom(pin.id())) {
            if (pin.id() < edge.targetId() && routeLocations.containsKey(edge.targetId())) { Location target = routeLocations.get(edge.targetId()); graphics.strokeLine(x(pin.longitude(), width), y(pin.latitude(), height), x(target.longitude(), width), y(target.latitude(), height)); }
        }
        if (route != null) { graphics.setStroke(Color.web("#c13b35")); graphics.setLineWidth(6); for (int index = 0; index < route.locationIds().size() - 1; index++) { Location from = routeLocations.get(route.locationIds().get(index)); Location to = routeLocations.get(route.locationIds().get(index + 1)); graphics.strokeLine(x(from.longitude(), width), y(from.latitude(), height), x(to.longitude(), width), y(to.latitude(), height)); } }
        for (MapPin pin : mapPins) drawPin(graphics, pin, width, height, route);
        graphics.setFill(Color.web("#5d705d")); graphics.setFont(Font.font("Avenir Next", 11)); graphics.fillText("N", width - 28, 28); graphics.fillText("DEMO MAP • NOT TO SCALE", 16, height - 14);
    }

    private void drawPin(GraphicsContext graphics, MapPin pin, double width, double height, Route route) {
        double pinX = x(pin.longitude(), width); double pinY = y(pin.latitude(), height);
        Color color = switch (pin.category()) { case "HOSPITAL" -> Color.web("#b62e2e"); case "POLICE" -> Color.web("#315f9b"); case "FIRE" -> Color.web("#d27624"); case "DESTINATION" -> Color.web("#5a4aa2"); default -> Color.web("#2e7250"); };
        double radius = pin.routeNode() && route != null ? 9 : 6; graphics.setFill(color); graphics.fillOval(pinX - radius, pinY - radius, radius * 2, radius * 2); graphics.setStroke(Color.WHITE); graphics.setLineWidth(2); graphics.strokeOval(pinX - radius, pinY - radius, radius * 2, radius * 2);
        graphics.setFill(Color.web("#243229")); graphics.setFont(Font.font("Avenir Next", FontWeight.BOLD, 10)); graphics.fillText(pin.name(), pinX + 9, pinY + 3);
    }

    private double x(double longitude, double width) { return 24 + (longitude - MIN_LONGITUDE) / (MAX_LONGITUDE - MIN_LONGITUDE) * Math.max(1, width - 48); }
    private double y(double latitude, double height) { return 34 + (MAX_LATITUDE - latitude) / (MAX_LATITUDE - MIN_LATITUDE) * Math.max(1, height - 68); }

    private static Graph demoGraph() {
        Graph graph = new Graph(); graph.addRoad(new Road(1, 1, 2, 4200, 42)); graph.addRoad(new Road(2, 2, 3, 5100, 34)); graph.addRoad(new Road(3, 3, 4, 11200, 28)); graph.addRoad(new Road(4, 1, 5, 7400, 78)); graph.addRoad(new Road(5, 5, 4, 9800, 72)); return graph;
    }

    private static List<MapPin> demoPins() {
        return List.of(new MapPin(1, "Provident Wellworth City", "ORIGIN", 13.025, 77.526, true, "●"), new MapPin(2, "Jalahalli Cross", "WAYPOINT", 13.053, 77.548, true, "•"), new MapPin(3, "Yeshwanthpur Junction", "WAYPOINT", 13.077, 77.594, true, "•"), new MapPin(4, "Presidency University Bengaluru", "DESTINATION", 13.171, 77.558, true, "◆"), new MapPin(5, "Outer Ring Road", "WAYPOINT", 13.086, 77.620, true, "•"), new MapPin(6, "Ramaiah Memorial Hospital", "HOSPITAL", 13.032, 77.566, false, "✚"), new MapPin(7, "Baptist Hospital", "HOSPITAL", 13.059, 77.594, false, "✚"), new MapPin(8, "Aster CMI Hospital", "HOSPITAL", 13.058, 77.592, false, "✚"), new MapPin(9, "Jalahalli Police Station", "POLICE", 13.045, 77.543, false, "P"), new MapPin(10, "Yeshwanthpur Police Station", "POLICE", 13.028, 77.554, false, "P"), new MapPin(11, "Jalahalli Fire Station", "FIRE", 13.060, 77.551, false, "F"), new MapPin(12, "Local Support Point", "SUPPORT", 13.113, 77.574, false, "◆"));
    }

    private record MapPin(long id, String name, String category, double latitude, double longitude, boolean routeNode, String symbol) { }
    public static void main(String[] args) { launch(args); }
}
