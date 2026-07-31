import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../core/api.dart';
import '../../core/lumen_theme.dart';
import '../../core/lumen_widgets.dart';
import '../../core/models.dart';
import '../auth/auth.dart';
import 'creator_repository.dart';

@immutable
final class _CreatorSnapshot {
  const _CreatorSnapshot({
    required this.account,
    this.analytics,
    this.content,
    this.tiers = const <SubscriptionTier>[],
    this.subscriptions,
  });

  final CreatorAccount? account;
  final CreatorAnalytics? analytics;
  final CursorPage<CreatorContent>? content;
  final List<SubscriptionTier> tiers;
  final CursorPage<CreatorSubscription>? subscriptions;
}

final _creatorProvider = FutureProvider.autoDispose<_CreatorSnapshot>((
  ref,
) async {
  final repository = ref.watch(creatorRepositoryProvider);
  try {
    final account = await repository.account();
    final values = await Future.wait<Object>(<Future<Object>>[
      repository.analytics(),
      repository.content(),
      repository.tiers(),
      repository.subscriptions(),
    ]);
    return _CreatorSnapshot(
      account: account,
      analytics: values[0] as CreatorAnalytics,
      content: values[1] as CursorPage<CreatorContent>,
      tiers: values[2] as List<SubscriptionTier>,
      subscriptions: values[3] as CursorPage<CreatorSubscription>,
    );
  } on ApiProblem catch (error) {
    if (error.code == 'creator_account_required' ||
        error.code == 'creator_not_found') {
      return const _CreatorSnapshot(account: null);
    }
    rethrow;
  }
});

final _contentDetailProvider = FutureProvider.autoDispose
    .family<ContentDetail, String>(
      (ref, id) => ref.watch(creatorRepositoryProvider).contentDetail(id),
    );

final class CreatorScreen extends ConsumerWidget {
  const CreatorScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final value = ref.watch(_creatorProvider);
    return LumenPage(
      title: 'Creator',
      subtitle:
          'Publishing, audience, subscriptions, and commerce from the creator APIs.',
      child: LumenAsyncView<_CreatorSnapshot>(
        value: value,
        onRetry: () => ref.invalidate(_creatorProvider),
        data: (snapshot) {
          if (snapshot.account == null) {
            return _CreatorOnboarding(
              onCreated: () => ref.invalidate(_creatorProvider),
            );
          }
          return DefaultTabController(
            length: 3,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: <Widget>[
                const TabBar(
                  isScrollable: true,
                  tabs: <Tab>[
                    Tab(text: 'Dashboard'),
                    Tab(text: 'Content'),
                    Tab(text: 'Memberships'),
                  ],
                ),
                const SizedBox(height: 16),
                SizedBox(
                  height: 720,
                  child: TabBarView(
                    children: <Widget>[
                      _CreatorDashboard(snapshot: snapshot),
                      _CreatorContentList(
                        page: snapshot.content!,
                        onChanged: () => ref.invalidate(_creatorProvider),
                      ),
                      _CreatorMemberships(
                        tiers: snapshot.tiers,
                        subscriptions: snapshot.subscriptions!,
                        onChanged: () => ref.invalidate(_creatorProvider),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          );
        },
      ),
    );
  }
}

final class _CreatorOnboarding extends ConsumerStatefulWidget {
  const _CreatorOnboarding({required this.onCreated});

  final VoidCallback onCreated;

  @override
  ConsumerState<_CreatorOnboarding> createState() => _CreatorOnboardingState();
}

final class _CreatorOnboardingState extends ConsumerState<_CreatorOnboarding> {
  final _formKey = GlobalKey<FormState>();
  final _slug = TextEditingController();
  final _channel = TextEditingController();
  final _category = TextEditingController();
  final _description = TextEditingController();
  bool _busy = false;
  String? _error;

  @override
  void dispose() {
    _slug.dispose();
    _channel.dispose();
    _category.dispose();
    _description.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => LumenSurface(
    child: Form(
      key: _formKey,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: <Widget>[
          Text(
            'Create your creator account',
            style: Theme.of(context).textTheme.headlineMedium,
          ),
          const SizedBox(height: 8),
          const Text(
            'The API has no creator account for this user. Complete onboarding to start publishing.',
          ),
          const SizedBox(height: 16),
          TextFormField(
            controller: _slug,
            decoration: const InputDecoration(labelText: 'Public slug'),
            validator: _slugValidator,
          ),
          const SizedBox(height: 12),
          TextFormField(
            controller: _channel,
            decoration: const InputDecoration(labelText: 'Channel name'),
            validator: (value) => (value?.trim().length ?? 0) < 2
                ? 'Enter at least 2 characters.'
                : null,
          ),
          const SizedBox(height: 12),
          TextFormField(
            controller: _category,
            decoration: const InputDecoration(labelText: 'Category'),
            validator: (value) =>
                (value?.trim().isEmpty ?? true) ? 'Enter a category.' : null,
          ),
          const SizedBox(height: 12),
          TextFormField(
            controller: _description,
            maxLength: 2000,
            maxLines: 4,
            decoration: const InputDecoration(
              labelText: 'Description (optional)',
            ),
          ),
          if (_error != null) ...<Widget>[
            const SizedBox(height: 12),
            Text(
              _error!,
              style: TextStyle(color: Theme.of(context).colorScheme.error),
            ),
          ],
          const SizedBox(height: 16),
          LumenPrimaryButton(
            label: 'Create creator account',
            busy: _busy,
            onPressed: _submit,
          ),
        ],
      ),
    ),
  );

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) {
      return;
    }
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await ref.read(creatorRepositoryProvider).createAccount(<String, dynamic>{
        'public_slug': _slug.text.trim(),
        'channel_name': _channel.text.trim(),
        'description': _description.text.trim().isEmpty
            ? null
            : _description.text.trim(),
        'category': _category.text.trim().toLowerCase(),
      });
      widget.onCreated();
    } on Object catch (error) {
      setState(() => _error = messageFor(error));
    } finally {
      if (mounted) {
        setState(() => _busy = false);
      }
    }
  }
}

final class _CreatorDashboard extends ConsumerWidget {
  const _CreatorDashboard({required this.snapshot});

  final _CreatorSnapshot snapshot;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final account = snapshot.account!;
    final analytics = snapshot.analytics!;
    return ListView(
      children: <Widget>[
        Wrap(
          spacing: 12,
          runSpacing: 12,
          children: <Widget>[
            _Metric(label: 'Content', value: analytics.contentCount),
            _Metric(label: 'Published', value: analytics.publishedContentCount),
            _Metric(label: 'Followers', value: analytics.followerCount),
            _Metric(
              label: 'Active subscriptions',
              value: analytics.activeSubscriptionCount,
            ),
            _Metric(label: 'Gifts', value: analytics.giftCount),
            _Metric(
              label: 'Creator earnings',
              value: analytics.totalCreatorEarningsMinor,
            ),
          ],
        ),
        const SizedBox(height: 18),
        LumenSurface(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: <Widget>[
              Row(
                children: <Widget>[
                  Expanded(
                    child: Text(
                      account.channelName,
                      style: Theme.of(context).textTheme.headlineMedium,
                    ),
                  ),
                  LumenBadge(
                    label: account.status,
                    color: account.status == 'active'
                        ? LumenColors.verdigris
                        : LumenColors.solar,
                  ),
                ],
              ),
              Text('/${account.publicSlug} • ${account.category}'),
              if (account.description != null) ...<Widget>[
                const SizedBox(height: 8),
                Text(account.description!),
              ],
              const Divider(height: 28),
              SwitchListTile(
                contentPadding: EdgeInsets.zero,
                title: const Text('Content monetization'),
                value: account.contentMonetizationEnabled,
                onChanged: (value) =>
                    _setting(ref, 'content_monetization_enabled', value),
              ),
              SwitchListTile(
                contentPadding: EdgeInsets.zero,
                title: const Text('Subscriptions'),
                value: account.subscriptionsEnabled,
                onChanged: (value) =>
                    _setting(ref, 'subscriptions_enabled', value),
              ),
              SwitchListTile(
                contentPadding: EdgeInsets.zero,
                title: const Text('Marketplace'),
                value: account.marketplaceEnabled,
                onChanged: (value) =>
                    _setting(ref, 'marketplace_enabled', value),
              ),
              Text(
                account.payoutEligible
                    ? 'Payout eligibility: approved'
                    : 'Payout eligibility: not approved by platform operators',
              ),
            ],
          ),
        ),
      ],
    );
  }

  Future<void> _setting(WidgetRef ref, String field, bool value) async {
    await ref.read(creatorRepositoryProvider).updateAccount(<String, dynamic>{
      field: value,
    });
    ref.invalidate(_creatorProvider);
  }
}

final class _Metric extends StatelessWidget {
  const _Metric({required this.label, required this.value});

  final String label;
  final int value;

  @override
  Widget build(BuildContext context) => SizedBox(
    width: 190,
    child: LumenSurface(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          Text(label, style: Theme.of(context).textTheme.labelMedium),
          const SizedBox(height: 6),
          Text(
            NumberFormat.decimalPattern().format(value),
            style: Theme.of(context).textTheme.headlineMedium,
          ),
        ],
      ),
    ),
  );
}

final class _CreatorContentList extends ConsumerStatefulWidget {
  const _CreatorContentList({required this.page, required this.onChanged});

  final CursorPage<CreatorContent> page;
  final VoidCallback onChanged;

  @override
  ConsumerState<_CreatorContentList> createState() =>
      _CreatorContentListState();
}

final class _CreatorContentListState
    extends ConsumerState<_CreatorContentList> {
  late List<CreatorContent> _items;
  String? _cursor;
  bool _loadingMore = false;

  @override
  void initState() {
    super.initState();
    _items = widget.page.items.toList();
    _cursor = widget.page.nextCursor;
  }

  @override
  Widget build(BuildContext context) => Column(
    crossAxisAlignment: CrossAxisAlignment.stretch,
    children: <Widget>[
      Align(
        alignment: Alignment.centerRight,
        child: FilledButton.icon(
          onPressed: _create,
          icon: const Icon(Icons.add_rounded),
          label: const Text('New content'),
        ),
      ),
      const SizedBox(height: 12),
      Expanded(
        child: _items.isEmpty
            ? LumenEmptyView(
                title: 'No creator content',
                message: 'The content API returned no items.',
                actionLabel: 'Create content',
                onAction: _create,
                icon: Icons.article_outlined,
              )
            : ListView(
                children: <Widget>[
                  for (final item in _items)
                    Card(
                      child: ListTile(
                        leading: const Icon(Icons.article_outlined),
                        title: Text('${item.kind} content'),
                        subtitle: Text(
                          '${item.visibility} • ${item.id.substring(0, 8)}',
                        ),
                        trailing: LumenBadge(label: item.state),
                        onTap: () => context.pushNamed(
                          'creator-content',
                          pathParameters: <String, String>{'id': item.id},
                        ),
                      ),
                    ),
                  if (_cursor != null)
                    Center(
                      child: TextButton.icon(
                        onPressed: _loadingMore ? null : _loadMore,
                        icon: _loadingMore
                            ? const SizedBox.square(
                                dimension: 16,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2,
                                ),
                              )
                            : const Icon(Icons.expand_more_rounded),
                        label: const Text('Load more'),
                      ),
                    ),
                ],
              ),
      ),
    ],
  );

  Future<void> _loadMore() async {
    setState(() => _loadingMore = true);
    try {
      final page = await ref
          .read(creatorRepositoryProvider)
          .content(cursor: _cursor);
      setState(() {
        _items.addAll(page.items);
        _cursor = page.nextCursor;
      });
    } finally {
      if (mounted) {
        setState(() => _loadingMore = false);
      }
    }
  }

  Future<void> _create() async {
    final formKey = GlobalKey<FormState>();
    final title = TextEditingController();
    final summary = TextEditingController();
    final body = TextEditingController();
    var kind = 'post';
    final created = await showDialog<ContentDetail>(
      context: context,
      builder: (dialogContext) => StatefulBuilder(
        builder: (context, setDialogState) => AlertDialog(
          title: const Text('Create content'),
          content: SizedBox(
            width: 520,
            child: Form(
              key: formKey,
              child: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: <Widget>[
                    DropdownButtonFormField<String>(
                      initialValue: kind,
                      decoration: const InputDecoration(labelText: 'Kind'),
                      items: const <DropdownMenuItem<String>>[
                        DropdownMenuItem(value: 'post', child: Text('Post')),
                        DropdownMenuItem(
                          value: 'short_video',
                          child: Text('Short video'),
                        ),
                        DropdownMenuItem(
                          value: 'long_video',
                          child: Text('Long video'),
                        ),
                        DropdownMenuItem(value: 'audio', child: Text('Audio')),
                        DropdownMenuItem(
                          value: 'downloadable',
                          child: Text('Downloadable'),
                        ),
                      ],
                      onChanged: (value) =>
                          setDialogState(() => kind = value ?? kind),
                    ),
                    const SizedBox(height: 12),
                    TextFormField(
                      controller: title,
                      decoration: const InputDecoration(labelText: 'Title'),
                      validator: (value) => value?.trim().isEmpty ?? true
                          ? 'Enter a title.'
                          : null,
                    ),
                    const SizedBox(height: 12),
                    TextFormField(
                      controller: summary,
                      maxLength: 1000,
                      decoration: const InputDecoration(
                        labelText: 'Summary (optional)',
                      ),
                    ),
                    const SizedBox(height: 12),
                    TextFormField(
                      controller: body,
                      minLines: 3,
                      maxLines: 8,
                      decoration: InputDecoration(
                        labelText: kind == 'post' ? 'Body' : 'Body (optional)',
                      ),
                      validator: (value) =>
                          kind == 'post' && (value?.trim().isEmpty ?? true)
                          ? 'A post requires body text.'
                          : null,
                    ),
                  ],
                ),
              ),
            ),
          ),
          actions: <Widget>[
            TextButton(
              onPressed: () => Navigator.pop(dialogContext),
              child: const Text('Cancel'),
            ),
            FilledButton(
              onPressed: () async {
                if (!formKey.currentState!.validate()) {
                  return;
                }
                try {
                  final result = await ref
                      .read(creatorRepositoryProvider)
                      .createContent(<String, dynamic>{
                        'kind': kind,
                        'visibility': 'public',
                        'required_tier_id': null,
                        'purchase_product_id': null,
                        'title': title.text.trim(),
                        'summary': summary.text.trim().isEmpty
                            ? null
                            : summary.text.trim(),
                        'body': body.text.trim().isEmpty
                            ? null
                            : body.text.trim(),
                        'metadata': <String, dynamic>{},
                      });
                  if (dialogContext.mounted) {
                    Navigator.pop(dialogContext, result);
                  }
                } on Object catch (error) {
                  if (dialogContext.mounted) {
                    ScaffoldMessenger.of(
                      dialogContext,
                    ).showSnackBar(SnackBar(content: Text(messageFor(error))));
                  }
                }
              },
              child: const Text('Create draft'),
            ),
          ],
        ),
      ),
    );
    title.dispose();
    summary.dispose();
    body.dispose();
    if (created != null && mounted) {
      widget.onChanged();
      await context.pushNamed(
        'creator-content',
        pathParameters: <String, String>{'id': created.content.id},
      );
    }
  }
}

final class _CreatorMemberships extends ConsumerWidget {
  const _CreatorMemberships({
    required this.tiers,
    required this.subscriptions,
    required this.onChanged,
  });

  final List<SubscriptionTier> tiers;
  final CursorPage<CreatorSubscription> subscriptions;
  final VoidCallback onChanged;

  @override
  Widget build(BuildContext context, WidgetRef ref) => ListView(
    children: <Widget>[
      Row(
        children: <Widget>[
          Expanded(
            child: Text(
              'Subscription tiers',
              style: Theme.of(context).textTheme.headlineMedium,
            ),
          ),
          FilledButton.icon(
            onPressed: () => _createTier(context, ref),
            icon: const Icon(Icons.add_rounded),
            label: const Text('New tier'),
          ),
        ],
      ),
      const SizedBox(height: 10),
      if (tiers.isEmpty)
        const Text('The API returned no creator subscription tiers.')
      else
        for (final tier in tiers)
          Card(
            child: ListTile(
              title: Text(tier.name),
              subtitle: Text(
                tier.priceMinor == null
                    ? 'External settlement • ${tier.durationDays} days'
                    : '${tier.priceMinor} credits • ${tier.durationDays} days',
              ),
              trailing: FilledButton.tonal(
                onPressed: tier.active
                    ? () => _subscribe(context, ref, tier)
                    : null,
                child: const Text('Subscribe / gift'),
              ),
            ),
          ),
      const SizedBox(height: 24),
      Text(
        'Your subscriptions',
        style: Theme.of(context).textTheme.headlineMedium,
      ),
      const SizedBox(height: 10),
      if (subscriptions.items.isEmpty)
        const Text('The API returned no subscriptions.')
      else
        for (final subscription in subscriptions.items)
          Card(
            child: ListTile(
              title: Text('Tier ${subscription.tierId.substring(0, 8)}'),
              subtitle: Text(
                '${subscription.settlementMethod} • ends ${DateFormat.yMMMd().format(subscription.entitlementEndsAt.toLocal())}',
              ),
              leading: LumenBadge(label: subscription.status),
              trailing: PopupMenuButton<String>(
                onSelected: (action) async {
                  final repository = ref.read(creatorRepositoryProvider);
                  try {
                    switch (action) {
                      case 'cancel':
                        await repository.cancelSubscription(subscription.id);
                      case 'renew':
                        await repository.renewSubscription(subscription.id);
                      case 'refund':
                        await repository.refundSubscription(subscription.id);
                    }
                    onChanged();
                  } on Object catch (error) {
                    if (context.mounted) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(content: Text(messageFor(error))),
                      );
                    }
                  }
                },
                itemBuilder: (context) => <PopupMenuEntry<String>>[
                  if (const <String>{
                    'active',
                    'past_due',
                  }.contains(subscription.status))
                    const PopupMenuItem(value: 'cancel', child: Text('Cancel')),
                  if (subscription.status != 'refunded')
                    const PopupMenuItem(value: 'renew', child: Text('Renew')),
                  if (const <String>{
                    'active',
                    'cancelled',
                  }.contains(subscription.status))
                    const PopupMenuItem(
                      value: 'refund',
                      child: Text('Request refund'),
                    ),
                ],
              ),
            ),
          ),
    ],
  );

  Future<void> _createTier(BuildContext context, WidgetRef ref) async {
    final formKey = GlobalKey<FormState>();
    final name = TextEditingController();
    final description = TextEditingController();
    final price = TextEditingController();
    final created = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('New credit tier'),
        content: Form(
          key: formKey,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: <Widget>[
              TextFormField(
                controller: name,
                decoration: const InputDecoration(labelText: 'Name'),
                validator: (value) => (value?.trim().length ?? 0) < 2
                    ? 'Enter at least 2 characters.'
                    : null,
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: description,
                decoration: const InputDecoration(labelText: 'Description'),
                validator: (value) => (value?.trim().length ?? 0) < 2
                    ? 'Enter a description.'
                    : null,
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: price,
                keyboardType: TextInputType.number,
                decoration: const InputDecoration(
                  labelText: 'Credit price (minor units)',
                ),
                validator: (value) => (int.tryParse(value ?? '') ?? 0) <= 0
                    ? 'Enter a positive integer.'
                    : null,
              ),
            ],
          ),
        ),
        actions: <Widget>[
          TextButton(
            onPressed: () => Navigator.pop(dialogContext, false),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () async {
              if (!formKey.currentState!.validate()) {
                return;
              }
              try {
                await ref
                    .read(creatorRepositoryProvider)
                    .createTier(<String, dynamic>{
                      'name': name.text.trim(),
                      'description': description.text.trim(),
                      'price_minor': int.parse(price.text),
                      'external_settlement_reference': null,
                      'duration_days': 30,
                      'benefits': <String>[],
                      'active': true,
                    });
                if (dialogContext.mounted) {
                  Navigator.pop(dialogContext, true);
                }
              } on Object catch (error) {
                if (dialogContext.mounted) {
                  ScaffoldMessenger.of(
                    dialogContext,
                  ).showSnackBar(SnackBar(content: Text(messageFor(error))));
                }
              }
            },
            child: const Text('Create'),
          ),
        ],
      ),
    );
    name.dispose();
    description.dispose();
    price.dispose();
    if (created ?? false) {
      onChanged();
    }
  }

  Future<void> _subscribe(
    BuildContext context,
    WidgetRef ref,
    SubscriptionTier tier,
  ) async {
    final recipient = TextEditingController();
    final result = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: Text('Subscribe to ${tier.name}'),
        content: TextField(
          controller: recipient,
          decoration: const InputDecoration(
            labelText: 'Gift recipient user ID (optional)',
          ),
        ),
        actions: <Widget>[
          TextButton(
            onPressed: () => Navigator.pop(dialogContext, false),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () async {
              try {
                await ref
                    .read(creatorRepositoryProvider)
                    .subscribe(
                      tierId: tier.id,
                      settlementMethod: tier.priceMinor == null
                          ? 'external'
                          : 'credits',
                      recipientUserId: recipient.text.trim().isEmpty
                          ? null
                          : recipient.text.trim(),
                      returnUrl: tier.priceMinor == null
                          ? Uri.base.toString()
                          : null,
                    );
                if (dialogContext.mounted) {
                  Navigator.pop(dialogContext, true);
                }
              } on Object catch (error) {
                if (dialogContext.mounted) {
                  ScaffoldMessenger.of(
                    dialogContext,
                  ).showSnackBar(SnackBar(content: Text(messageFor(error))));
                }
              }
            },
            child: Text(
              recipient.text.trim().isEmpty ? 'Subscribe' : 'Send gift',
            ),
          ),
        ],
      ),
    );
    recipient.dispose();
    if (result ?? false) {
      onChanged();
    }
  }
}

final class CreatorContentScreen extends ConsumerStatefulWidget {
  const CreatorContentScreen({required this.contentId, super.key});

  final String contentId;

  @override
  ConsumerState<CreatorContentScreen> createState() =>
      _CreatorContentScreenState();
}

final class _CreatorContentScreenState
    extends ConsumerState<CreatorContentScreen> {
  String? _operation;
  bool _operationError = false;

  @override
  Widget build(BuildContext context) {
    final value = ref.watch(_contentDetailProvider(widget.contentId));
    return Scaffold(
      appBar: AppBar(title: const Text('Creator content')),
      body: LumenAsyncView<ContentDetail>(
        value: value,
        onRetry: _refresh,
        data: (detail) => ListView(
          padding: const EdgeInsets.all(20),
          children: <Widget>[
            LumenSurface(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: <Widget>[
                  Row(
                    children: <Widget>[
                      Expanded(
                        child: Text(
                          detail.version.title,
                          style: Theme.of(context).textTheme.headlineLarge,
                        ),
                      ),
                      LumenBadge(label: detail.content.state),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Text(
                    '${detail.content.kind} • ${detail.content.visibility} • version ${detail.version.versionNumber}',
                  ),
                  if (detail.version.summary != null) ...<Widget>[
                    const SizedBox(height: 12),
                    Text(detail.version.summary!),
                  ],
                  if (detail.version.body != null) ...<Widget>[
                    const Divider(height: 28),
                    SelectableText(detail.version.body!),
                  ],
                  if (detail.content.scheduledAt != null)
                    Text(
                      'Scheduled ${DateFormat.yMMMd().add_jm().format(detail.content.scheduledAt!.toLocal())}',
                    ),
                ],
              ),
            ),
            const SizedBox(height: 16),
            Wrap(
              spacing: 10,
              runSpacing: 10,
              children: <Widget>[
                FilledButton.icon(
                  onPressed: detail.version.state == 'published'
                      ? null
                      : () => _editVersion(detail),
                  icon: const Icon(Icons.edit_outlined),
                  label: const Text('New version'),
                ),
                OutlinedButton(
                  onPressed: detail.content.state == 'deleted'
                      ? null
                      : () => _editAccess(detail),
                  child: const Text('Edit access'),
                ),
                OutlinedButton(
                  onPressed: detail.content.state == 'draft'
                      ? () => _action('submit-review')
                      : null,
                  child: const Text('Submit review'),
                ),
                OutlinedButton(
                  onPressed:
                      const <String>{
                        'draft',
                        'review',
                        'scheduled',
                      }.contains(detail.content.state)
                      ? () => _action('publish')
                      : null,
                  child: const Text('Publish'),
                ),
                OutlinedButton(
                  onPressed: detail.content.state == 'published'
                      ? () => _action('unpublish')
                      : null,
                  child: const Text('Unpublish'),
                ),
                OutlinedButton(
                  onPressed: detail.content.state != 'deleted'
                      ? () => _schedule(detail)
                      : null,
                  child: const Text('Schedule'),
                ),
                OutlinedButton(
                  onPressed: detail.version.state == 'published'
                      ? null
                      : () => _assetUpload(detail),
                  child: const Text('S3 asset upload'),
                ),
                OutlinedButton(
                  onPressed: detail.version.state == 'published'
                      ? null
                      : () => _processing(detail),
                  child: const Text('Processing'),
                ),
                OutlinedButton(
                  onPressed: detail.content.state == 'deleted'
                      ? null
                      : () => _action('archive'),
                  child: const Text('Archive'),
                ),
                TextButton(
                  onPressed: detail.content.state == 'deleted'
                      ? null
                      : () => _action('delete'),
                  child: const Text('Delete'),
                ),
              ],
            ),
            if (_operation != null) ...<Widget>[
              const SizedBox(height: 16),
              LumenSurface(
                child: Row(
                  children: <Widget>[
                    Icon(
                      _operationError
                          ? Icons.error_outline_rounded
                          : Icons.check_circle_outline_rounded,
                      color: _operationError
                          ? Theme.of(context).colorScheme.error
                          : LumenColors.verdigris,
                    ),
                    const SizedBox(width: 12),
                    Expanded(child: SelectableText(_operation!)),
                  ],
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  void _refresh() {
    ref.invalidate(_contentDetailProvider(widget.contentId));
  }

  Future<void> _action(String action) async {
    try {
      final result = await ref
          .read(creatorRepositoryProvider)
          .contentAction(widget.contentId, action);
      setState(() {
        _operation = 'Content is now ${result.state}.';
        _operationError = false;
      });
      _refresh();
    } on Object catch (error) {
      _showError(error);
    }
  }

  Future<void> _editVersion(ContentDetail detail) async {
    final formKey = GlobalKey<FormState>();
    final title = TextEditingController(text: detail.version.title);
    final summary = TextEditingController(text: detail.version.summary);
    final body = TextEditingController(text: detail.version.body);
    final created = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('Create draft version'),
        content: SizedBox(
          width: 520,
          child: Form(
            key: formKey,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: <Widget>[
                TextFormField(
                  controller: title,
                  decoration: const InputDecoration(labelText: 'Title'),
                  validator: (value) =>
                      value?.trim().isEmpty ?? true ? 'Enter a title.' : null,
                ),
                TextFormField(
                  controller: summary,
                  decoration: const InputDecoration(labelText: 'Summary'),
                ),
                TextFormField(
                  controller: body,
                  maxLines: 6,
                  decoration: const InputDecoration(labelText: 'Body'),
                ),
              ],
            ),
          ),
        ),
        actions: <Widget>[
          TextButton(
            onPressed: () => Navigator.pop(dialogContext, false),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () async {
              if (!formKey.currentState!.validate()) {
                return;
              }
              try {
                await ref.read(creatorRepositoryProvider).createVersion(
                  widget.contentId,
                  <String, dynamic>{
                    'title': title.text.trim(),
                    'summary': summary.text.trim().isEmpty
                        ? null
                        : summary.text.trim(),
                    'body': body.text.trim().isEmpty ? null : body.text.trim(),
                    'metadata': detail.version.metadata,
                  },
                );
                if (dialogContext.mounted) {
                  Navigator.pop(dialogContext, true);
                }
              } on Object catch (error) {
                if (dialogContext.mounted) {
                  ScaffoldMessenger.of(
                    dialogContext,
                  ).showSnackBar(SnackBar(content: Text(messageFor(error))));
                }
              }
            },
            child: const Text('Create version'),
          ),
        ],
      ),
    );
    title.dispose();
    summary.dispose();
    body.dispose();
    if (created ?? false) {
      _refresh();
    }
  }

  Future<void> _editAccess(ContentDetail detail) async {
    final requiredTier = TextEditingController(
      text: detail.content.requiredTierId,
    );
    final purchaseProduct = TextEditingController(
      text: detail.content.purchaseProductId,
    );
    var visibility = detail.content.visibility;
    final updated = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => StatefulBuilder(
        builder: (context, setDialogState) => AlertDialog(
          title: const Text('Edit content access'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: <Widget>[
              DropdownButtonFormField<String>(
                initialValue: visibility,
                decoration: const InputDecoration(labelText: 'Visibility'),
                items: const <DropdownMenuItem<String>>[
                  DropdownMenuItem(value: 'public', child: Text('Public')),
                  DropdownMenuItem(
                    value: 'followers',
                    child: Text('Followers'),
                  ),
                  DropdownMenuItem(
                    value: 'subscribers',
                    child: Text('Subscribers'),
                  ),
                  DropdownMenuItem(
                    value: 'tier',
                    child: Text('Subscription tier'),
                  ),
                  DropdownMenuItem(
                    value: 'purchase',
                    child: Text('Purchasers'),
                  ),
                ],
                onChanged: (value) =>
                    setDialogState(() => visibility = value ?? visibility),
              ),
              if (visibility == 'tier')
                TextField(
                  controller: requiredTier,
                  decoration: const InputDecoration(
                    labelText: 'Required subscription tier ID',
                  ),
                ),
              if (visibility == 'purchase')
                TextField(
                  controller: purchaseProduct,
                  decoration: const InputDecoration(
                    labelText: 'Required marketplace product ID',
                  ),
                ),
            ],
          ),
          actions: <Widget>[
            TextButton(
              onPressed: () => Navigator.pop(dialogContext, false),
              child: const Text('Cancel'),
            ),
            FilledButton(
              onPressed: () async {
                if (visibility == 'tier' && requiredTier.text.trim().isEmpty) {
                  return;
                }
                if (visibility == 'purchase' &&
                    purchaseProduct.text.trim().isEmpty) {
                  return;
                }
                try {
                  await ref
                      .read(creatorRepositoryProvider)
                      .updateContent(detail.content.id, <String, dynamic>{
                        'visibility': visibility,
                        'required_tier_id': visibility == 'tier'
                            ? requiredTier.text.trim()
                            : null,
                        'purchase_product_id': visibility == 'purchase'
                            ? purchaseProduct.text.trim()
                            : null,
                      });
                  if (dialogContext.mounted) {
                    Navigator.pop(dialogContext, true);
                  }
                } on Object catch (error) {
                  if (dialogContext.mounted) {
                    ScaffoldMessenger.of(
                      dialogContext,
                    ).showSnackBar(SnackBar(content: Text(messageFor(error))));
                  }
                }
              },
              child: const Text('Save access'),
            ),
          ],
        ),
      ),
    );
    requiredTier.dispose();
    purchaseProduct.dispose();
    if (updated ?? false) {
      _refresh();
    }
  }

  Future<void> _schedule(ContentDetail detail) async {
    final initial = DateTime.now().toUtc().add(const Duration(hours: 1));
    final controller = TextEditingController(text: initial.toIso8601String());
    final scheduled = await showDialog<DateTime>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('Schedule publication'),
        content: TextFormField(
          controller: controller,
          decoration: const InputDecoration(
            labelText: 'ISO-8601 date and time',
          ),
        ),
        actions: <Widget>[
          TextButton(
            onPressed: () => Navigator.pop(dialogContext),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () {
              final value = DateTime.tryParse(controller.text.trim());
              if (value == null || !value.isAfter(DateTime.now())) {
                ScaffoldMessenger.of(dialogContext).showSnackBar(
                  const SnackBar(
                    content: Text('Enter a valid future date and time.'),
                  ),
                );
                return;
              }
              Navigator.pop(dialogContext, value);
            },
            child: const Text('Schedule'),
          ),
        ],
      ),
    );
    controller.dispose();
    if (scheduled == null) {
      return;
    }
    try {
      await ref
          .read(creatorRepositoryProvider)
          .schedule(detail.content.id, scheduled);
      _refresh();
    } on Object catch (error) {
      _showError(error);
    }
  }

  Future<void> _assetUpload(ContentDetail detail) async {
    final formKey = GlobalKey<FormState>();
    final contentType = TextEditingController();
    final byteSize = TextEditingController();
    final sha256 = TextEditingController();
    final rights = TextEditingController();
    final request = await showDialog<JsonObject>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('Request S3 upload capability'),
        content: SizedBox(
          width: 520,
          child: Form(
            key: formKey,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: <Widget>[
                TextFormField(
                  controller: contentType,
                  decoration: const InputDecoration(
                    labelText: 'Content type',
                    hintText: 'video/mp4',
                  ),
                  validator: (value) => !(value ?? '').contains('/')
                      ? 'Enter a MIME content type.'
                      : null,
                ),
                TextFormField(
                  controller: byteSize,
                  keyboardType: TextInputType.number,
                  decoration: const InputDecoration(labelText: 'Byte size'),
                  validator: (value) => (int.tryParse(value ?? '') ?? 0) <= 0
                      ? 'Enter a positive byte size.'
                      : null,
                ),
                TextFormField(
                  controller: sha256,
                  decoration: const InputDecoration(labelText: 'SHA-256'),
                  validator: (value) =>
                      RegExp(r'^[a-fA-F0-9]{64}$').hasMatch(value ?? '')
                      ? null
                      : 'Enter 64 hexadecimal characters.',
                ),
                TextFormField(
                  controller: rights,
                  maxLength: 500,
                  decoration: const InputDecoration(
                    labelText: 'Rights declaration',
                  ),
                  validator: (value) => (value?.trim().length ?? 0) < 10
                      ? 'Enter at least 10 characters.'
                      : null,
                ),
              ],
            ),
          ),
        ),
        actions: <Widget>[
          TextButton(
            onPressed: () => Navigator.pop(dialogContext),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () {
              if (formKey.currentState!.validate()) {
                Navigator.pop(dialogContext, <String, dynamic>{
                  'role': 'primary',
                  'content_type': contentType.text.trim(),
                  'byte_size': int.parse(byteSize.text),
                  'sha256': sha256.text.trim().toLowerCase(),
                  'rights_declaration': rights.text.trim(),
                  'license_reference': null,
                });
              }
            },
            child: const Text('Request'),
          ),
        ],
      ),
    );
    contentType.dispose();
    byteSize.dispose();
    sha256.dispose();
    rights.dispose();
    if (request == null) {
      return;
    }
    try {
      final capability = await ref
          .read(creatorRepositoryProvider)
          .requestAssetUpload(detail.content.id, detail.version.id, request);
      setState(() {
        final headers = capability.headers.entries
            .map((entry) => '${entry.key}: ${entry.value}')
            .join('\n');
        _operation =
            'S3 upload authorized for asset ${capability.assetId}. '
            'The capability expires in ${capability.expiresInSeconds} seconds.\n'
            '${capability.uploadUrl}\n$headers';
        _operationError = false;
      });
    } on Object catch (error) {
      _showError(error);
    }
  }

  Future<void> _processing(ContentDetail detail) async {
    var operation = 'thumbnail';
    final selected = await showDialog<String>(
      context: context,
      builder: (dialogContext) => StatefulBuilder(
        builder: (context, setDialogState) => AlertDialog(
          title: const Text('Create processing job'),
          content: DropdownButtonFormField<String>(
            initialValue: operation,
            decoration: const InputDecoration(labelText: 'Operation'),
            items: const <DropdownMenuItem<String>>[
              DropdownMenuItem(value: 'transcode', child: Text('Transcode')),
              DropdownMenuItem(value: 'waveform', child: Text('Waveform')),
              DropdownMenuItem(value: 'captions', child: Text('Captions')),
              DropdownMenuItem(value: 'thumbnail', child: Text('Thumbnail')),
            ],
            onChanged: (value) =>
                setDialogState(() => operation = value ?? operation),
          ),
          actions: <Widget>[
            TextButton(
              onPressed: () => Navigator.pop(dialogContext),
              child: const Text('Cancel'),
            ),
            FilledButton(
              onPressed: () => Navigator.pop(dialogContext, operation),
              child: const Text('Create job'),
            ),
          ],
        ),
      ),
    );
    if (selected == null) {
      return;
    }
    try {
      final job = await ref
          .read(creatorRepositoryProvider)
          .createProcessingJob(detail.content.id, detail.version.id, selected);
      setState(() {
        _operation =
            '${job.operation} processing is ${job.state} on ${job.processor}.'
            '${job.failureCode == null ? '' : ' ${job.failureCode}'}';
        _operationError = job.state == 'unavailable';
      });
    } on Object catch (error) {
      _showError(error);
    }
  }

  void _showError(Object error) {
    setState(() {
      _operation = messageFor(error);
      _operationError = true;
    });
  }
}

String? _slugValidator(String? value) {
  final slug = value?.trim() ?? '';
  if (!RegExp(r'^[a-z0-9]+(?:-[a-z0-9]+)*$').hasMatch(slug) ||
      slug.length < 3) {
    return 'Use at least 3 lowercase letters, numbers, or hyphens.';
  }
  return null;
}
