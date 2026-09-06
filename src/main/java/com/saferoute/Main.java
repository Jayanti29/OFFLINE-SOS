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
import javafx.scene.control.PasswordField;
import javafx.scene.control.Tab;
import javafx.scene.control.TabPane;
import javafx.scene.control.TextField;
import javafx.scene.control.ToggleButton;
import javafx.scene.control.ToggleGroup;
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
    private final Label result = new Label("Select FIND ROUTE to calculate a local route.");
    private final Label mapStatus = new Label("12 demonstration reference points loaded locally");
    private final Label appStatus = new Label("● OFFLINE  |  LOCAL DATA");
    private final Label locationStatus = new Label("Reference location: Provident Wellworth City");
    private final TextField originField = new TextField("Provident Wellworth City");
    private final TextField destinationField = new TextField("Presidency University Bengaluru");
    private final ComboBox<String> routePreference = new ComboBox<>();
    private Route activeRoute;
    private boolean satelliteMode;
    private boolean onlineMode;

    @Override public void start(Stage stage) {
        showLogin(stage);
    }

    private void showLogin(Stage stage) {
        Label eyebrow = new Label("OFFLINE-FIRST SAFETY PLANNER"); eyebrow.getStyleClass().add("eyebrow");
        Label title = new Label("SafeRoute"); title.getStyleClass().add("login-title");
        Label subtitle = new Label("A private local dashboard for planning a safer route."); subtitle.getStyleClass().add("muted");
        TextField name = new TextField("Jayanti Gautam"); name.setPromptText("Profile name");
        PasswordField password = new PasswordField(); password.setPromptText("Local demo passcode");
        Label note = new Label("Demo profile only • no account server is connected"); note.getStyleClass().add("muted");
        Button login = new Button("OPEN LOCAL DASHBOARD"); login.getStyleClass().add("emergency"); login.setMaxWidth(Double.MAX_VALUE);
        login.setOnAction(event -> showDashboard(stage, name.getText().isBlank() ? "Local user" : name.getText().trim()));
        VBox card = new VBox(14, eyebrow, title, subtitle, new Label("PROFILE NAME"), name, new Label("PASSCODE"), password, note, login);
        card.getStyleClass().add("login-card"); card.setMaxWidth(430);
        StackPane root = new StackPane(card); root.getStyleClass().add("login-root");
        Scene scene = new Scene(root, 760, 640); scene.getStylesheets().add(getClass().getResource("/saferoute.css").toExternalForm());
        stage.setTitle("SafeRoute - Local Profile"); stage.setMinWidth(620); stage.setMinHeight(560); stage.setScene(scene); stage.show();
    }

    private void showDashboard(Stage stage, String profileName) {
        Label title = new Label("OFFLINE SOS"); title.getStyleClass().add("eyebrow");
        Label brand = new Label("SafeRoute Bengaluru"); brand.getStyleClass().add("brand");
        ToggleButton onlineToggle = new ToggleButton("ONLINE MODE"); onlineToggle.getStyleClass().add("mode-toggle");
        Button alertButton = new Button("EMERGENCY ALERT"); alertButton.getStyleClass().add("alert-button"); alertButton.setOnAction(event -> sendEmergencyAlert());
        Button sos = new Button("SOS"); sos.getStyleClass().add("sos"); sos.setOnAction(event -> sendSos());
        HBox header = new HBox(14, new VBox(3, title, brand), new Region(), appStatus, onlineToggle, alertButton, sos);
        HBox.setHgrow(header.getChildren().get(1), Priority.ALWAYS); header.setAlignment(Pos.CENTER_LEFT);
        onlineToggle.setOnAction(event -> setOnlineMode(onlineToggle.isSelected()));

        Label profile = new Label(profileName + "\nLocal demo profile"); profile.getStyleClass().add("profile-value");
        Label location = new Label("Provident Wellworth City"); location.getStyleClass().add("location");
        VBox profileCard = new VBox(4, new Label("PROFILE DASHBOARD"), profile, locationStatus); profileCard.getStyleClass().add("panel");
        VBox nearbyCard = new VBox(4, new Label("NEARBY SUPPORT"), new Label("3 hospitals  •  2 police  •  1 fire station"), new Label("Loaded from local reference data")); nearbyCard.getStyleClass().add("panel");
        VBox readinessCard = new VBox(4, new Label("ROUTE READINESS"), new Label("Offline routing available"), new Label("Online location: " + (onlineMode ? "available" : "off"))); readinessCard.getStyleClass().add("panel");
        HBox summary = new HBox(12, profileCard, nearbyCard, readinessCard); HBox.setHgrow(profileCard, Priority.ALWAYS); HBox.setHgrow(nearbyCard, Priority.ALWAYS); HBox.setHgrow(readinessCard, Priority.ALWAYS);

        StackPane mapFrame = createMapFrame();
        VBox routeControls = createRouteControls();
        VBox nearby = createNearbyPanel();
        HBox mapAndControls = new HBox(14, mapFrame, new VBox(14, routeControls, nearby)); HBox.setHgrow(mapFrame, Priority.ALWAYS); mapAndControls.setFillHeight(true); mapAndControls.setMaxWidth(Double.MAX_VALUE);

        result.setWrapText(true); result.getStyleClass().add("result"); result.setMaxWidth(Double.MAX_VALUE);
        VBox dashboard = new VBox(16, header, summary, mapAndControls, result); dashboard.setPadding(new Insets(24)); VBox.setVgrow(mapAndControls, Priority.ALWAYS);
        TabPane tabs = new TabPane(); Tab dashboardTab = new Tab("DASHBOARD", dashboard); dashboardTab.setClosable(false); Tab profileTab = new Tab("PROFILE", createProfilePanel(profileName)); profileTab.setClosable(false); tabs.getTabs().addAll(dashboardTab, profileTab);
        Scene scene = new Scene(tabs, 1240, 900); scene.getStylesheets().add(getClass().getResource("/saferoute.css").toExternalForm());
        stage.setTitle("SafeRoute Bengaluru Dashboard"); stage.setMinWidth(980); stage.setMinHeight(760); stage.setScene(scene); stage.show();
    }

    private StackPane createMapFrame() {
        StackPane mapFrame = new StackPane(mapCanvas); mapFrame.getStyleClass().add("map-frame"); mapFrame.setPrefSize(780, 560); mapFrame.setMinSize(520, 420); mapFrame.setMaxSize(900, 700);
        mapCanvas.widthProperty().bind(mapFrame.widthProperty()); mapCanvas.heightProperty().bind(mapFrame.heightProperty());
        mapCanvas.widthProperty().addListener(observable -> drawMap()); mapCanvas.heightProperty().addListener(observable -> drawMap());
        Label mapTitle = new Label("BENGALURU ROUTE MAP"); mapTitle.getStyleClass().add("map-title"); StackPane.setAlignment(mapTitle, Pos.TOP_LEFT); StackPane.setMargin(mapTitle, new Insets(14)); mapFrame.getChildren().add(mapTitle); drawMap();
        return mapFrame;
    }

    private VBox createRouteControls() {
        routePreference.getItems().setAll("Safest route", "Shortest route", "Balanced route"); routePreference.getSelectionModel().selectFirst(); routePreference.setMaxWidth(Double.MAX_VALUE);
        originField.setMaxWidth(Double.MAX_VALUE); destinationField.setMaxWidth(Double.MAX_VALUE);
        Button locate = new Button("DETECT MY LOCATION"); locate.getStyleClass().add("secondary-button"); locate.setMaxWidth(Double.MAX_VALUE); locate.setOnAction(event -> detectLocation());
        Button routeButton = new Button("FIND ROUTE"); routeButton.getStyleClass().add("emergency"); routeButton.setMaxWidth(Double.MAX_VALUE); routeButton.setOnAction(event -> findRoute());
        ToggleButton normal = new ToggleButton("NORMAL MAP"); ToggleButton satellite = new ToggleButton("SATELLITE DEMO"); ToggleGroup group = new ToggleGroup(); normal.setToggleGroup(group); satellite.setToggleGroup(group); normal.setSelected(true); normal.getStyleClass().add("map-toggle"); satellite.getStyleClass().add("map-toggle"); normal.setOnAction(event -> { satelliteMode = false; drawMap(); }); satellite.setOnAction(event -> { satelliteMode = true; drawMap(); });
        HBox mapModes = new HBox(6, normal, satellite); HBox.setHgrow(normal, Priority.ALWAYS); HBox.setHgrow(satellite, Priority.ALWAYS);
        VBox panel = new VBox(9, new Label("PLAN A ROUTE"), new Label("FROM"), originField, new Label("TO"), destinationField, new Label("ROUTE PREFERENCE"), routePreference, locate, routeButton, new Label("MAP STYLE"), mapModes); panel.getStyleClass().add("panel"); return panel;
    }

    private VBox createNearbyPanel() {
        FlowPane support = new FlowPane(7, 7); support.getStyleClass().add("support-list"); for (MapPin pin : mapPins) { Label label = new Label(pin.symbol() + "  " + pin.name()); label.getStyleClass().add("support-chip"); support.getChildren().add(label); }
        VBox panel = new VBox(8, new Label("NEARBY HOSPITALS, POLICE AND SUPPORT"), support, mapStatus); panel.getStyleClass().add("panel"); return panel;
    }

    private VBox createProfilePanel(String profileName) {
        Label details = new Label(profileName + "\n\nLocal profile status: active\nLocation permission: not connected\nEmergency dispatch: not connected"); details.getStyleClass().add("profile-value");
        Label note = new Label("This prototype stores operational data locally. Connect an authentication provider, location permission flow, and dispatch service before treating this as a production emergency system."); note.getStyleClass().add("muted"); note.setWrapText(true);
        VBox panel = new VBox(14, new Label("PROFILE DASHBOARD"), details, note); panel.getStyleClass().add("panel"); panel.setMaxWidth(600); VBox root = new VBox(panel); root.setPadding(new Insets(24)); return root;
    }

    private void setOnlineMode(boolean enabled) { onlineMode = enabled; appStatus.setText(enabled ? "● ONLINE  |  LOCATION DEMO" : "● OFFLINE  |  LOCAL DATA"); locationStatus.setText(enabled ? "Online location detection is available in demo mode" : "Reference location: Provident Wellworth City"); drawMap(); }

    private void detectLocation() { if (!onlineMode) { locationStatus.setText("Offline: using Provident Wellworth City reference location"); return; } locationStatus.setText("Location detected (demo): Provident Wellworth City"); result.setText("LOCATION DETECTED\n\nThis prototype uses the seeded reference point for Provident Wellworth City. Real device GPS permission is not connected."); }

    private void findRoute() {
        long start = resolveLocation(originField.getText()); long destination = resolveLocation(destinationField.getText());
        if (start < 0 || destination < 0) { result.setText("ROUTE NOT FOUND\n\nChoose a seeded route location or add it through the local data import pipeline.\n\nAvailable route points: " + mapPins.stream().filter(MapPin::routeNode).map(MapPin::name).collect(Collectors.joining(", "))); return; }
        String preference = routePreference.getValue(); activeRoute = switch (preference) { case "Shortest route" -> routeFinder.findShortestRoute(graph, start, destination); case "Balanced route" -> routeFinder.findBalancedRoute(graph, start, destination); default -> routeFinder.findSafestRoute(graph, start, destination); }; drawMap();
        mapStatus.setText((onlineMode ? "Online demo route" : "Offline route") + " • " + activeRoute.locationIds().size() + " local waypoints");
        result.setText(preference.toUpperCase() + "\n\n" + routeLocations.get(start).name() + " → " + routeLocations.get(destination).name() + "\n" + Math.round(activeRoute.distanceMeters() / 1000) + " km estimated graph distance  •  " + Math.round(activeRoute.safetyScore()) + "/100 calculated score\n\nPath: " + activeRoute.locationIds().stream().map(routeLocations::get).map(Location::name).collect(Collectors.joining(" → ")) + "\n\nSynthetic/unverified route data. This is not live navigation or a guarantee of personal safety.");
    }

    private long resolveLocation(String value) { String query = value == null ? "" : value.trim().toLowerCase(); return mapPins.stream().filter(MapPin::routeNode).filter(pin -> pin.name().toLowerCase().contains(query) || query.contains(pin.name().toLowerCase())).map(MapPin::id).findFirst().orElse(-1L); }

    private void sendEmergencyAlert() { result.setText("EMERGENCY ALERT PREPARED\n\nThe alert is stored locally for this prototype. No external dispatcher or SMS service is connected."); Alert alert = new Alert(Alert.AlertType.WARNING); alert.setTitle("Emergency alert"); alert.setHeaderText("Alert prepared locally"); alert.setContentText("No external alert was sent. Contact the appropriate emergency service directly when possible."); alert.showAndWait(); }
    private void sendSos() { sendEmergencyAlert(); }

    private void drawMap() {
        GraphicsContext graphics = mapCanvas.getGraphicsContext2D(); double width = mapCanvas.getWidth(); double height = mapCanvas.getHeight(); if (width <= 0 || height <= 0) return;
        graphics.setFill(Color.web(satelliteMode ? "#59665b" : "#e6eee4")); graphics.fillRect(0, 0, width, height); graphics.setStroke(Color.web(satelliteMode ? "#708071" : "#d1dfcf")); graphics.setLineWidth(1);
        for (double x = 0; x < width; x += 42) graphics.strokeLine(x, 0, x, height); for (double y = 0; y < height; y += 42) graphics.strokeLine(0, y, width, y);
        graphics.setStroke(Color.web(satelliteMode ? "#c8b57c" : "#b7c9b5")); graphics.setLineWidth(5);
        for (MapPin pin : mapPins.stream().filter(MapPin::routeNode).toList()) for (GraphEdge edge : graph.edgesFrom(pin.id())) if (pin.id() < edge.targetId() && routeLocations.containsKey(edge.targetId())) { Location target = routeLocations.get(edge.targetId()); graphics.strokeLine(x(pin.longitude(), width), y(pin.latitude(), height), x(target.longitude(), width), y(target.latitude(), height)); }
        if (activeRoute != null) { graphics.setStroke(Color.web("#c13b35")); graphics.setLineWidth(6); for (int index = 0; index < activeRoute.locationIds().size() - 1; index++) { Location from = routeLocations.get(activeRoute.locationIds().get(index)); Location to = routeLocations.get(activeRoute.locationIds().get(index + 1)); graphics.strokeLine(x(from.longitude(), width), y(from.latitude(), height), x(to.longitude(), width), y(to.latitude(), height)); } }
        for (MapPin pin : mapPins) drawPin(graphics, pin, width, height); graphics.setFill(satelliteMode ? Color.WHITE : Color.web("#5d705d")); graphics.setFont(Font.font("Avenir Next", 11)); graphics.fillText("N", width - 28, 28); graphics.fillText(satelliteMode ? "SATELLITE DEMO • NOT LIVE IMAGERY" : "NORMAL MAP • NOT TO SCALE", 16, height - 14);
    }

    private void drawPin(GraphicsContext graphics, MapPin pin, double width, double height) { double pinX = x(pin.longitude(), width); double pinY = y(pin.latitude(), height); Color color = switch (pin.category()) { case "HOSPITAL" -> Color.web("#b62e2e"); case "POLICE" -> Color.web("#315f9b"); case "FIRE" -> Color.web("#d27624"); case "DESTINATION" -> Color.web("#5a4aa2"); default -> Color.web("#2e7250"); }; graphics.setFill(color); graphics.fillOval(pinX - 6, pinY - 6, 12, 12); graphics.setStroke(Color.WHITE); graphics.setLineWidth(2); graphics.strokeOval(pinX - 6, pinY - 6, 12, 12); graphics.setFill(satelliteMode ? Color.WHITE : Color.web("#243229")); graphics.setFont(Font.font("Avenir Next", FontWeight.BOLD, 10)); graphics.fillText(pin.name(), pinX + 9, pinY + 3); }
    private double x(double longitude, double width) { return 24 + (longitude - MIN_LONGITUDE) / (MAX_LONGITUDE - MIN_LONGITUDE) * Math.max(1, width - 48); }
    private double y(double latitude, double height) { return 34 + (MAX_LATITUDE - latitude) / (MAX_LATITUDE - MIN_LATITUDE) * Math.max(1, height - 68); }

    private static Graph demoGraph() { Graph graph = new Graph(); graph.addRoad(new Road(1, 1, 2, 4200, 42)); graph.addRoad(new Road(2, 2, 3, 5100, 34)); graph.addRoad(new Road(3, 3, 4, 11200, 28)); graph.addRoad(new Road(4, 1, 5, 7400, 78)); graph.addRoad(new Road(5, 5, 4, 9800, 72)); return graph; }
    private static List<MapPin> demoPins() { return List.of(new MapPin(1, "Provident Wellworth City", "ORIGIN", 13.025, 77.526, true, "●"), new MapPin(2, "Jalahalli Cross", "WAYPOINT", 13.053, 77.548, true, "•"), new MapPin(3, "Yeshwanthpur Junction", "WAYPOINT", 13.077, 77.594, true, "•"), new MapPin(4, "Presidency University Bengaluru", "DESTINATION", 13.171, 77.558, true, "◆"), new MapPin(5, "Outer Ring Road", "WAYPOINT", 13.086, 77.620, true, "•"), new MapPin(6, "Ramaiah Memorial Hospital", "HOSPITAL", 13.032, 77.566, false, "✚"), new MapPin(7, "Baptist Hospital", "HOSPITAL", 13.059, 77.594, false, "✚"), new MapPin(8, "Aster CMI Hospital", "HOSPITAL", 13.058, 77.592, false, "✚"), new MapPin(9, "Jalahalli Police Station", "POLICE", 13.045, 77.543, false, "P"), new MapPin(10, "Yeshwanthpur Police Station", "POLICE", 13.028, 77.554, false, "P"), new MapPin(11, "Jalahalli Fire Station", "FIRE", 13.060, 77.551, false, "F"), new MapPin(12, "Local Support Point", "SUPPORT", 13.113, 77.574, false, "◆")); }
    private record MapPin(long id, String name, String category, double latitude, double longitude, boolean routeNode, String symbol) { }
    public static void main(String[] args) { launch(args); }
}
