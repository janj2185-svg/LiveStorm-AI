import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:sylora/core/lumen_theme.dart';
import 'package:sylora/features/landing/landing_experience.dart';

void main() {
  testWidgets('landing hero shows brand story without auth controls', (
    tester,
  ) async {
    await tester.pumpWidget(
      ProviderScope(
        child: MaterialApp(
          theme: LumenTheme.light(),
          home: const LandingExperience(),
        ),
      ),
    );
    await tester.pump();

    expect(find.text('SYLORA'), findsWidgets);
    expect(find.textContaining('Майбутнє починається'), findsOneWidget);
    expect(find.text('Почати'), findsOneWidget);
    expect(find.text('Увійти'), findsNothing);
    expect(find.text('Створити акаунт'), findsNothing);
    expect(find.textContaining('Google'), findsNothing);
    expect(find.textContaining('пароль'), findsNothing);
  });
}
