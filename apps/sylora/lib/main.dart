import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'app.dart';
import 'core/config.dart';
import 'features/auth/auth.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  final config = AppConfig.fromEnvironment();
  runApp(
    ProviderScope(
      overrides: <Override>[appConfigProvider.overrideWithValue(config)],
      child: const SyloraApp(),
    ),
  );
}
