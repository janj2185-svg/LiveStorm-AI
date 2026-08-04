/// Native / non-web stub — Flutter paints its own Aether surface.
void revealAetherShell() {}

void hideAetherShell() {}

void enterAetherApp({required bool create}) {
  // Handled by GoRouter in LandingExperience for non-web.
}

void registerAppNavigator(void Function(String path) go) {}
