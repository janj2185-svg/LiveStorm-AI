import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_web_plugins/flutter_web_plugins.dart';

import 'app.dart';
import 'core/config.dart';
import 'features/auth/auth.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  // HTML aether shell navigates with location.hash (#/auth). Keep hash
  // routing so "Почати" actually opens Auth instead of a blank Welcome.
  if (kIsWeb) {
    setUrlStrategy(const HashUrlStrategy());
  }
  final config = AppConfig.fromEnvironment();
  runApp(
    ProviderScope(
      overrides: <Override>[appConfigProvider.overrideWithValue(config)],
      child: const SyloraApp(),
    ),
  );
}
