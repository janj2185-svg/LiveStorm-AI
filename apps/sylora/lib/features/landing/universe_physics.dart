import 'dart:math' as math;
import 'dart:ui';

enum ParticleRole {
  spark,
  memory,
  voice,
  person,
  gift,
  community,
}

final class UniverseParticle {
  UniverseParticle({
    required this.id,
    required this.pos,
    required this.vel,
    required this.home,
    required this.role,
    required this.mass,
    required this.phaseIn,
    required this.hue,
    required this.size,
  });

  final int id;
  Offset pos;
  Offset vel;
  Offset home;
  ParticleRole role;
  final double mass;
  final double phaseIn;
  final double hue;
  double size;
  double energy = 0;
  int linkA = -1;
  int linkB = -1;
}

/// Continuous physical universe — no sections, only evolving matter.
final class UniversePhysics {
  UniversePhysics({required this.seed, this.compact = false}) {
    _spawn();
  }

  final int seed;
  final bool compact;
  final List<UniverseParticle> particles = <UniverseParticle>[];
  final List<(int, int, double)> links = <(int, int, double)>[];

  late math.Random _rng;
  double _time = 0;
  double progress = 0;

  int get count => compact ? 96 : 140;

  void _spawn() {
    _rng = math.Random(seed);
    particles.clear();
    for (var i = 0; i < count; i++) {
      final angle = _rng.nextDouble() * math.pi * 2;
      final radius = 0.04 + _rng.nextDouble() * 0.55;
      final home = Offset(math.cos(angle) * radius, math.sin(angle) * radius * 0.85);
      particles.add(
        UniverseParticle(
          id: i,
          pos: home * 0.15,
          vel: Offset.zero,
          home: home,
          role: ParticleRole.spark,
          mass: 0.7 + _rng.nextDouble() * 0.8,
          phaseIn: _rng.nextDouble() * 0.22,
          hue: _rng.nextDouble(),
          size: 1.6 + _rng.nextDouble() * 2.8,
        ),
      );
    }
  }

  void tick(double dt, double nextProgress) {
    _time += dt;
    // First seconds awaken on their own — the universe breathes before scroll.
    final idle = (_time * 0.045).clamp(0.0, 0.16);
    progress = math.max(nextProgress, idle).clamp(0.0, 1.0);
    final awaken = _smooth((progress - 0.02) / 0.18);
    final connect = _smooth((progress - 0.14) / 0.2);
    final remember = _smooth((progress - 0.28) / 0.18);
    final converse = _smooth((progress - 0.40) / 0.16);
    final people = _smooth((progress - 0.52) / 0.16);
    final community = _smooth((progress - 0.66) / 0.16);
    final ecosystem = _smooth((progress - 0.76) / 0.12);
    final collapse = _smooth((progress - 0.86) / 0.14);

    _assignRoles(
      remember: remember,
      converse: converse,
      people: people,
      community: community,
    );
    _rebuildLinks(connect: connect, ecosystem: ecosystem);

    for (final p in particles) {
      final appear = ((progress - p.phaseIn) / 0.12).clamp(0.0, 1.0);
      if (appear <= 0) {
        p.energy = 0;
        continue;
      }

      var force = Offset.zero;

      // Soft expansion away from origin as the world awakens.
      final expandTarget = p.home * (0.35 + awaken * 0.9 + community * 0.25);
      force += (expandTarget - p.pos) * (0.55 + awaken * 0.35);

      // Mutual attraction — particles find each other.
      if (connect > 0) {
        for (final other in particles) {
          if (other.id == p.id) {
            continue;
          }
          final delta = other.pos - p.pos;
          final dist = delta.distance.clamp(0.001, 2.0);
          if (dist < 0.28) {
            final strength = (0.018 / (dist * dist)) * connect * appear;
            force += delta / dist * strength * 0.35;
            // Soft separation so they don't collapse early.
            force -= delta / dist * (0.01 / dist) * connect;
          }
        }
      }

      // Moment formations.
      force += _momentForce(p, remember: remember, converse: converse, people: people);

      // Ecosystem swirl.
      if (ecosystem > 0 && collapse < 0.4) {
        final tang = Offset(-p.pos.dy, p.pos.dx);
        final len = tang.distance;
        if (len > 0.001) {
          force += tang / len * (0.08 * ecosystem);
        }
      }

      // Collapse into SYLORA tri-mark — matter falls inward.
      if (collapse > 0) {
        final target = _logoTarget(p.id);
        final inward = (centerish(p.pos) - p.pos) * (1.4 * collapse);
        force += (target - p.pos) * (3.6 * collapse * collapse) + inward;
        p.vel *= 1 - 0.45 * collapse;
      }

      // Breathing.
      final breath = math.sin(_time * 1.3 + p.id * 0.4) * 0.004 * (1 - collapse);
      force += Offset(breath, -breath);

      // Integrate.
      final accel = force / p.mass;
      p.vel = (p.vel + accel * dt) * (0.92 - collapse * 0.08);
      p.pos += p.vel * dt;
      p.energy = appear * (0.35 + connect * 0.25 + people * 0.2 + collapse * 0.4);
      p.size = (1.5 + p.hue * 2.2) * (0.7 + appear * 0.5) * (1 + people * 0.35 * (p.role == ParticleRole.person ? 1.4 : 0.2));
    }

    // Mild global centering drift so the dream stays framed.
    var centroid = Offset.zero;
    for (final p in particles) {
      centroid += p.pos;
    }
    centroid /= particles.length.toDouble();
    final pull = centroid * (0.015 + collapse * 0.08);
    for (final p in particles) {
      p.pos -= pull;
    }
  }

  void _assignRoles({
    required double remember,
    required double converse,
    required double people,
    required double community,
  }) {
    for (final p in particles) {
      if (community > 0.55 && p.id % 5 == 0) {
        p.role = ParticleRole.community;
      } else if (people > 0.45 && p.id % 4 == 0) {
        p.role = ParticleRole.person;
      } else if (converse > 0.4 && p.id % 3 == 0) {
        p.role = ParticleRole.voice;
      } else if (remember > 0.35 && p.id.isEven) {
        p.role = ParticleRole.memory;
      } else if (p.id % 11 == 0 && people > 0.2) {
        p.role = ParticleRole.gift;
      } else {
        p.role = ParticleRole.spark;
      }
    }
  }

  void _rebuildLinks({required double connect, required double ecosystem}) {
    links.clear();
    if (connect <= 0.05) {
      return;
    }
    final maxLinks = compact ? 55 : 90;
    final candidates = <(double, int, int)>[];
    for (var i = 0; i < particles.length; i++) {
      for (var j = i + 1; j < particles.length; j++) {
        final d = (particles[i].pos - particles[j].pos).distance;
        final limit = 0.12 + connect * 0.14 + ecosystem * 0.08;
        if (d < limit) {
          candidates.add((d, i, j));
        }
      }
    }
    candidates.sort((a, b) => a.$1.compareTo(b.$1));
    for (var i = 0; i < candidates.length && i < maxLinks; i++) {
      final c = candidates[i];
      final strength = (1 - c.$1 / 0.35).clamp(0.0, 1.0) * connect;
      links.add((c.$2, c.$3, strength));
      particles[c.$2].linkA = c.$3;
      particles[c.$3].linkB = c.$2;
    }
  }

  Offset _momentForce(
    UniverseParticle p, {
    required double remember,
    required double converse,
    required double people,
  }) {
    var force = Offset.zero;
    // Memory: drift into soft paired clusters.
    if (remember > 0 && p.role == ParticleRole.memory) {
      final partner = particles[(p.id + 7) % particles.length];
      force += (partner.pos - p.pos) * (0.12 * remember);
    }
    // Voice: arrange along a horizontal ribbon below center.
    if (converse > 0 && p.role == ParticleRole.voice) {
      final t = (p.id % 12) / 11;
      final target = Offset((t - 0.5) * 0.55, 0.22 + math.sin(_time * 3 + t * 8) * 0.04);
      force += (target - p.pos) * (0.55 * converse);
    }
    // People: settle into a gentle constellation ring.
    if (people > 0 && p.role == ParticleRole.person) {
      final i = p.id % 8;
      final angle = i / 8 * math.pi * 2 + _time * 0.08;
      final target = Offset(math.cos(angle) * 0.32, math.sin(angle) * 0.26);
      force += (target - p.pos) * (0.45 * people);
    }
    // Gift moment: a small square cluster to the left.
    if (people > 0.2 && p.role == ParticleRole.gift) {
      final slot = p.id % 4;
      final target = Offset(-0.34 + (slot % 2) * 0.05, 0.05 + (slot ~/ 2) * 0.05);
      force += (target - p.pos) * (0.7 * people);
    }
    return force;
  }

  Offset centerish(Offset pos) => pos * 0.15;

  Offset _logoTarget(int id) {
    // Three overlapping petal centers of the SYLORA mark (normalized).
    const petals = <Offset>[
      Offset(-0.09, -0.05),
      Offset(0.09, -0.05),
      Offset(0.0, 0.08),
    ];
    final petal = petals[id % 3];
    final jitterAngle = id * 0.7;
    final jitter = 0.015 + (id % 5) * 0.004;
    return petal + Offset(math.cos(jitterAngle) * jitter, math.sin(jitterAngle) * jitter);
  }

  static double _smooth(double t) {
    final x = t.clamp(0.0, 1.0);
    return x * x * (3 - 2 * x);
  }
}
