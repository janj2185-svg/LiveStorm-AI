import Link from "next/link";
import { auth } from "@/auth";
import { LivingAvatar } from "@/components/living-avatar";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const session = await auth();

  return (
    <>
      <a className="skip-link" href="#main">
        Перейти до змісту
      </a>

      <header className="site-header">
        <Link className="brand-mark" href="/">
          SYLORA
        </Link>
        <Link className="header-link" href={session ? "/app" : "/login"}>
          {session ? "Command Center" : "Увійти"}
        </Link>
      </header>

      <main id="main">
        <section className="hero" aria-label="Головний екран">
          <div className="hero-visual" aria-hidden="true" />
          <div className="hero-inner hero-with-avatar">
            <div>
              <p className="brand-hero">SYLORA</p>
              <h1>Операційна система для цифрової особистості та персонального ШІ</h1>
              <p className="hero-lead">
                Людина + Personal AI + Identity + Knowledge + Creator/Business economy + Developer
                ecosystem — один фундамент, а не набір чужих копій.
              </p>
              <div className="cta-row">
                <Link className="button button-primary" href={session ? "/app" : "/login"}>
                  Відкрити Command Center
                </Link>
                <a className="button button-secondary" href="#core">
                  Ядро продукту
                </a>
              </div>
            </div>
            <LivingAvatar variant="stage" reaction="smile" />
          </div>
        </section>

        <section className="section" id="core" aria-labelledby="core-title">
          <div className="section-inner">
            <p className="section-kicker">Пʼять технологічних ровів</p>
            <h2 id="core-title">Що робить SYLORA окремим класом продукту</h2>
            <p className="section-intro">
              Кожне рішення посилює хоча б один рів: Personal AI, Permission-aware Knowledge Graph,
              багатомовність у реальному часі, Agent + Developer Platform, Creator + Business Economy.
            </p>
            <ul className="capability-list">
              <li>
                <h3>Personal AI</h3>
                <p>
                  Один постійний цифровий партнер з памʼяттю, дозволами, інструментами й журналом
                  «що знає / що зробив / чому».
                </p>
              </li>
              <li>
                <h3>Identity + Knowledge</h3>
                <p>
                  Глобальна цифрова ідентичність і граф знань із рівнями privacy, згодою й аудитом —
                  без неконтрольованого збору.
                </p>
              </li>
              <li>
                <h3>Agents + Developers</h3>
                <p>
                  Marketplace агентів і Developer Platform (API keys, scopes, sandbox) — цінність
                  росте з кожним розробником і бізнесом.
                </p>
              </li>
              <li>
                <h3>Просто зверху, потужно знизу</h3>
                <p>
                  Command Center — єдина точка взаємодії з AI. Складність екосистеми не виливається
                  десятками мертвих вкладок.
                </p>
              </li>
            </ul>
          </div>
        </section>

        <section className="section" id="how" aria-labelledby="how-title">
          <div className="section-inner">
            <p className="section-kicker">Як це працює</p>
            <h2 id="how-title">Один AI · різні контексти</h2>
            <p className="section-intro">
              У LIVE — Creator Assistant, у Business — Business Assistant, у Messages — Communication
              Assistant. Це одна ідентичність Sylora, не окремий чат на кожній сторінці.
            </p>
            <ol className="steps">
              <li>
                <div className="step-copy">
                  <h3>Увійдіть і створіть Identity</h3>
                  <p>Профіль, навички, privacy levels і ownership даних — ваш контроль.</p>
                </div>
              </li>
              <li>
                <div className="step-copy">
                  <h3>Налаштуйте Personal AI</h3>
                  <p>Дозволи, джерела контексту, памʼять і Action Engine з підтвердженням критичних дій.</p>
                </div>
              </li>
              <li>
                <div className="step-copy">
                  <h3>Розширюйте екосистему</h3>
                  <p>Встановлюйте агентів, реєструйте developer apps, будуйте мережевий ефект.</p>
                </div>
              </li>
            </ol>
          </div>
        </section>

        <section className="final-cta" aria-labelledby="final-cta-title">
          <div className="cta-inner">
            <h2 id="final-cta-title">Sylora поруч — жива і в зборі</h2>
            <p>
              Увійдіть через Google або GitHub і відкрийте Command Center. Зовнішні LLM-ключі
              опційні: без них працює чесний локальний companion-режим.
            </p>
            <div className="cta-row">
              <Link className="button button-primary" href={session ? "/app" : "/login"}>
                Почати
              </Link>
              <a
                className="button button-ghost"
                href="https://github.com/janj2185-svg/Sylora"
                target="_blank"
                rel="noopener noreferrer"
              >
                GitHub
              </a>
            </div>
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <div className="footer-inner">
          <span>© 2026 SYLORA</span>
          <a href="https://getsylora.com">getsylora.com</a>
        </div>
      </footer>
    </>
  );
}
