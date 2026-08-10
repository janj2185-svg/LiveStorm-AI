import { signIn, signOut } from "@/auth";

type LoginButtonsProps = {
  callbackUrl?: string;
};

export function LoginButtons({ callbackUrl = "/app" }: LoginButtonsProps) {
  return (
    <div className="cta-row">
      <form
        action={async () => {
          "use server";
          await signIn("google", { redirectTo: callbackUrl });
        }}
      >
        <button className="button button-primary" type="submit">
          Увійти з Google
        </button>
      </form>
      <form
        action={async () => {
          "use server";
          await signIn("github", { redirectTo: callbackUrl });
        }}
      >
        <button className="button button-secondary" type="submit">
          Увійти з GitHub
        </button>
      </form>
    </div>
  );
}

export function LogoutButton() {
  return (
    <form
      action={async () => {
        "use server";
        await signOut({ redirectTo: "/" });
      }}
    >
      <button className="button button-secondary" type="submit">
        Вийти
      </button>
    </form>
  );
}
