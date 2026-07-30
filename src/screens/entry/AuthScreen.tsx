/**
 * Authentication
 * ---------------------------------------------------------------------------
 * Sign in and create account are one screen with one segmented control, not two
 * routes. People arrive here unsure which they are — "do I already have an
 * account?" is a genuinely common state — and a tab keeps the answer one tap
 * away instead of one navigation away.
 *
 * The card is the only opaque object on the aurora field, which makes it the
 * unambiguous focus. On a phone it loses its border and fills the width: at
 * 393px a bordered card inside a bordered device is two frames doing one job,
 * and the inner one just steals horizontal space from the inputs.
 *
 * Order of methods is a security decision, not a layout one — see the passkey
 * block below.
 */

import { useState } from 'react';

import { LogoMark } from '../../design-system/brand/Logo';
import { Button, Checkbox, Icon, IconButton, Input, Surface, Tabs } from '../../design-system/primitives';

type Mode = 'create' | 'signin';

/**
 * Federated providers.
 *
 * The icon set carries no third-party brand marks — shipping other companies'
 * logos in a design system is a trademark liability and they never match the
 * grid. Each provider therefore gets the closest semantic glyph plus its name
 * in text, which is also what a screen reader announces.
 */
const PROVIDERS: { id: string; label: string; icon: 'mobile' | 'globe' | 'lock' }[] = [
  { id: 'apple', label: 'Apple', icon: 'mobile' },
  { id: 'google', label: 'Google', icon: 'globe' },
  { id: 'sso', label: 'Work SSO', icon: 'lock' },
];

export function AuthScreen() {
  const [mode, setMode] = useState<Mode>('create');
  const [email, setEmail] = useState('jordan@reyesstudio.co');
  const [password, setPassword] = useState('sylora24');
  const [revealed, setRevealed] = useState(false);
  const [remember, setRemember] = useState(true);

  const creating = mode === 'create';

  // Validated as the person types rather than on submit. A rule you only learn
  // about after pressing the button is a rule that wasted someone's time.
  const passwordError =
    creating && password.length > 0 && password.length < 12
      ? `Use at least 12 characters. This one has ${password.length}.`
      : undefined;

  return (
    <div className="sy-screen sy-auth">
      <div className="sy-aurora" />

      <div className="sy-auth__inner sy-screen__inner">
        <Surface className="sy-auth__card" elevation="raised" radius="2xl" padding="lg">
          <header className="sy-auth__head">
            <LogoMark size={44} tone="gradient" title="SYLORA" />
            <h1 className="sy-title-2">{creating ? 'Create your account' : 'Welcome back'}</h1>
            <p className="sy-body-sm sy-fg-muted">
              {creating
                ? 'One account covers streaming, spaces, the marketplace and payouts.'
                : 'Pick up where you left off — drafts, scheduled streams and all.'}
            </p>
          </header>

          <Tabs
            variant="segmented"
            className="sy-auth__tabs"
            active={mode}
            onChange={(id) => setMode(id as Mode)}
            tabs={[
              { id: 'create', label: 'Create account' },
              { id: 'signin', label: 'Sign in' },
            ]}
          />

          {/*
            Passkey sits above the password field on purpose. Passwords are the
            single largest source of account takeover on a creator platform,
            where a compromised account is also a compromised income. Putting
            the phishing-resistant method first makes the safe path the default
            path, and the fallback stays one glance below for anyone who needs
            it.
          */}
          <div className="sy-auth__passkey">
            <Button variant="primary" size="lg" fullWidth icon="key">
              {creating ? 'Create with a passkey' : 'Continue with a passkey'}
            </Button>
            <p className="sy-caption sy-fg-muted sy-auth__passkey-note">
              <Icon name="verified" size={13} />
              Face or fingerprint on this device. Nothing to remember, nothing to phish.
            </p>
          </div>

          <div className="sy-auth__divider">
            <span className="sy-divider" />
            <span className="sy-caption sy-fg-quiet">or</span>
            <span className="sy-divider" />
          </div>

          <div className="sy-auth__form">
            <Input
              label="Email"
              type="email"
              icon="messages"
              autoComplete="email"
              placeholder="you@studio.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />

            <Input
              label="Password"
              type={revealed ? 'text' : 'password'}
              icon="lock"
              autoComplete={creating ? 'new-password' : 'current-password'}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              error={passwordError}
              hint={creating ? 'Twelve characters or more. A short sentence beats a symbol soup.' : undefined}
              trailing={
                /* A toggle, so it announces its pressed state rather than
                   relying on an "eye with a slash" the icon set does not have. */
                <IconButton
                  icon="eye"
                  label={revealed ? 'Hide password' : 'Show password'}
                  aria-pressed={revealed}
                  variant="ghost"
                  size="xs"
                  onClick={() => setRevealed((value) => !value)}
                />
              }
            />

            <div className="sy-auth__row">
              <Checkbox checked={remember} onChange={setRemember} label="Keep me signed in" />
              {!creating && (
                <Button variant="link" size="sm">
                  Forgot password?
                </Button>
              )}
            </div>

            <Button variant="secondary" size="lg" fullWidth iconEnd="arrowRight" disabled={Boolean(passwordError)}>
              Continue with email
            </Button>
          </div>

          <div className="sy-auth__divider">
            <span className="sy-divider" />
            <span className="sy-caption sy-fg-quiet">or continue with</span>
            <span className="sy-divider" />
          </div>

          <div className="sy-auth__providers">
            {PROVIDERS.map((provider) => (
              <Button key={provider.id} variant="secondary" size="md" icon={provider.icon}>
                {provider.label}
              </Button>
            ))}
          </div>

          <p className="sy-caption sy-fg-quiet sy-auth__legal">
            By continuing you agree to the SYLORA Creator Terms and the Payments Addendum, and
            confirm you have read the Privacy Notice. We process account data in the EU and never
            sell it. You can export or delete everything from Settings at any time.
          </p>
        </Surface>

        <p className="sy-body-sm sy-fg-muted sy-auth__switch">
          {creating ? 'Already publishing on SYLORA?' : 'New here?'}{' '}
          <Button variant="link" size="sm" onClick={() => setMode(creating ? 'signin' : 'create')}>
            {creating ? 'Sign in instead' : 'Create an account'}
          </Button>
        </p>
      </div>
    </div>
  );
}
