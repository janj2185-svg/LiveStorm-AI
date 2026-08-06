import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:sylora/core/lumen_theme.dart';
import 'package:sylora/features/landing/landing_experience.dart';

void main() {
  testWidgets('universe entry has no auth chrome on first frame', (tester) async {
    await tester.pumpWidget(
      ProviderScope(
        child: MaterialApp(
          theme: LumenTheme.light(),
          home: const LandingExperience(),
        ),
      ),
    );
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 100));

    expect(find.text('S Y L O R Λ'), findsWidgets);
    expect(find.text('Увійти'), findsWidgets);
    expect(find.text('Створити акаунт'), findsOneWidget);
    expect(find.text('Google'), findsNothing);
    expect(find.textContaining('пароль'), findsNothing);
    expect(find.textContaining('feature'), findsNothing);
  });
}
