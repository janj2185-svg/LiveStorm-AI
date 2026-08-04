import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:sylora/core/lumen_theme.dart';
import 'package:sylora/core/models.dart';
import 'package:sylora/features/platform/repositories.dart';
import 'package:sylora/features/social/social_screens.dart';
import 'package:sylora/l10n/generated/app_localizations.dart';

void main() {
  testWidgets('friends requests accept and decline through social repository', (
    tester,
  ) async {
    final repository = _FriendsRepository();
    await tester.pumpWidget(_socialApp(repository, const FriendsScreen()));
    await _pumpLumen(tester);

    await tester.tap(find.text('Requests'));
    await tester.pump(const Duration(milliseconds: 800));

    expect(find.text('Accept'), findsNWidgets(2));
    expect(find.text('Reject'), findsNWidgets(2));

    await tester.tap(find.text('Accept').first);
    await _pumpLumen(tester);

    expect(repository.acceptedIds, <String>['request-alice']);
    expect(find.text('Accept'), findsOneWidget);

    await tester.tap(find.text('Reject'));
    await _pumpLumen(tester);

    expect(repository.rejectedIds, <String>['request-bob']);
    expect(find.text('Accept'), findsNothing);
    expect(find.text('Reject'), findsNothing);
    expect(find.textContaining('Incoming requests: 0'), findsOneWidget);
  });

  testWidgets('search keeps people, posts, and communities filters explicit', (
    tester,
  ) async {
    await tester.pumpWidget(
      _socialApp(_SearchRepository(), const SearchScreen()),
    );
    await _pumpLumen(tester);

    expect(
      find.byKey(const ValueKey<String>('search-category-people')),
      findsOneWidget,
    );
    expect(
      find.byKey(const ValueKey<String>('search-category-posts')),
      findsOneWidget,
    );
    expect(
      find.byKey(const ValueKey<String>('search-category-communities')),
      findsOneWidget,
    );

    await tester.tap(
      find.byKey(const ValueKey<String>('search-category-posts')),
    );
    await tester.enterText(find.byType(TextField), 'lumen');
    await tester.testTextInput.receiveAction(TextInputAction.search);
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 800));

    expect(_categoryChip(tester, 'posts').selected, isTrue);
    expect(find.text('No results'), findsOneWidget);
    expect(find.text('Amara Okonkwo'), findsNothing);

    await tester.tap(
      find.byKey(const ValueKey<String>('search-category-people')),
    );
    await tester.pump();

    expect(_categoryChip(tester, 'people').selected, isTrue);
    expect(find.text('Amara Okonkwo'), findsOneWidget);
    expect(find.text('No results'), findsNothing);
  });
}

Widget _socialApp(SocialRepository repository, Widget home) => ProviderScope(
  overrides: <Override>[socialRepositoryProvider.overrideWithValue(repository)],
  child: MaterialApp(
    theme: LumenTheme.light(),
    localizationsDelegates: AppLocalizations.localizationsDelegates,
    supportedLocales: AppLocalizations.supportedLocales,
    home: home,
  ),
);

Future<void> _pumpLumen(WidgetTester tester) async {
  await tester.pump();
  await tester.pump(const Duration(milliseconds: 800));
}

ChoiceChip _categoryChip(WidgetTester tester, String category) =>
    tester.widget<ChoiceChip>(
      find.byKey(ValueKey<String>('search-category-$category')),
    );

final class _SearchRepository implements SocialRepository {
  @override
  Future<SocialSearchBundle> search(String query) async =>
      const SocialSearchBundle(
        users: <ProfileModel>[
          ProfileModel(
            userId: 'amara-id',
            handle: 'amara',
            displayName: 'Amara Okonkwo',
            bio: 'Design systems educator',
            avatarUrl: null,
            locale: '',
            timezone: '',
            visibility: 'public',
          ),
        ],
        posts: <PostModel>[],
        communities: <NamedResource>[],
      );

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

final class _FriendsRepository implements SocialRepository {
  final List<String> acceptedIds = <String>[];
  final List<String> rejectedIds = <String>[];

  @override
  Future<List<FriendSummaryModel>> listFriends() async =>
      <FriendSummaryModel>[];

  @override
  Future<List<FriendSuggestionModel>> suggestions() async =>
      <FriendSuggestionModel>[];

  @override
  Future<FriendRequestsModel> friendRequests() async => FriendRequestsModel(
    incoming: <FriendRequestSummaryModel>[
      if (!acceptedIds.contains('request-alice'))
        FriendRequestSummaryModel(
          id: 'request-alice',
          handle: 'alice',
          displayName: 'Alice',
          avatarUrl: null,
          requestedAt: DateTime.utc(2026, 8, 4),
        ),
      if (!rejectedIds.contains('request-bob'))
        FriendRequestSummaryModel(
          id: 'request-bob',
          handle: 'bob',
          displayName: 'Bob',
          avatarUrl: null,
          requestedAt: DateTime.utc(2026, 8, 4),
        ),
    ],
    outgoing: const <FriendRequestSummaryModel>[],
  );

  @override
  Future<String> acceptFriendRequest(String id) async {
    acceptedIds.add(id);
    return 'friends';
  }

  @override
  Future<void> rejectFriendRequest(String id) async {
    rejectedIds.add(id);
  }

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}
