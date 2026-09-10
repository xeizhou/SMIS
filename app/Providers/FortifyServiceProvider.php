<?php

namespace App\Providers;

use Illuminate\Auth\Events\Login;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Str;
use Illuminate\Validation\Rules\Password;
use Inertia\Inertia;
use Laravel\Fortify\Features;
use Laravel\Fortify\Fortify;
use Illuminate\Validation\ValidationException;
use App\Models\User;
use Illuminate\Support\Facades\Hash;

class FortifyServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        $this->configureActions();
        $this->configureViews();
        $this->configureSingleSession();
    }

    /**
     * Configure Fortify actions.
     */
    private function configureActions(): void
    {
        Fortify::authenticateUsing(function (Request $request) {
            $login = trim((string) $request->input(Fortify::username()));
            $password = $request->input('password');

            $user = filter_var($login, FILTER_VALIDATE_EMAIL)
                ? User::whereRaw('LOWER(email) = ?', [Str::lower($login)])->first()
                : User::whereRaw('LOWER(name) = ?', [Str::lower($login)])->first();

            if (!$user || !Hash::check($password, $user->password)) {
                return null;
            }

            // IMPORTANT: this must use the SAME staleness window that
            // claimSession() uses (STALE_CLAIM_AFTER_SECONDS), not the
            // full session.lifetime window. Those are two different
            // questions — "is this session generally still valid" vs.
            // "has it gone quiet long enough to let someone else take
            // over" — and gating login on the wrong one is what caused
            // a closed tab to still block a second login for the full
            // session lifetime instead of the intended ~30s.
            if ($user->hasFreshActiveSessionOwnedByAnother()) {
                throw ValidationException::withMessages([
                    Fortify::username() => 'This account is already logged in on another device.',
                ]);
            }

            return $user;
        });
    }

    /**
     * Configure Fortify views.
     */
    private function configureViews(): void
    {
        Fortify::loginView(fn (Request $request) => Inertia::render('auth/login', [
            'canResetPassword' => Features::enabled(Features::resetPasswords()),
            'status' => $request->session()->get('status'),
        ]));

        Fortify::resetPasswordView(fn (Request $request) => Inertia::render('auth/reset-password', [
            'email' => $request->email,
            'token' => $request->route('token'),
            'passwordRules' => Password::defaults()->toPasswordRulesString(),
        ]));

        Fortify::requestPasswordResetLinkView(fn (Request $request) => Inertia::render('auth/forgot-password', [
            'status' => $request->session()->get('status'),
        ]));

        Fortify::verifyEmailView(fn (Request $request) => Inertia::render('auth/verify-email', [
            'status' => $request->session()->get('status'),
        ]));

        Fortify::registerView(fn () => Inertia::render('auth/register', [
            'passwordRules' => Password::defaults()->toPasswordRulesString(),
        ]));

        Fortify::twoFactorChallengeView(fn () => Inertia::render('auth/two-factor-challenge'));

        Fortify::confirmPasswordView(fn () => Inertia::render('auth/confirm-password'));
    }

    /**
     * Flag the session as needing to claim single-session ownership once
     * the FINAL (post-regeneration) session ID is available.
     *
     * This deliberately does NOT claim the session here. The Login event
     * fires inside Auth::login(), which happens before Fortify's session
     * regeneration step (PrepareAuthenticatedSession / 2FA challenge). If
     * we claimed the session ID at this point, we'd record the
     * about-to-be-discarded pre-regeneration ID, and every subsequent
     * request would fail the EnsureSingleSession ownership check.
     *
     * Session DATA (this flag) survives session()->regenerate() — only the
     * ID changes — so EnsureSingleSession can safely read this flag on the
     * next request, once request()->session()->getId() is final, and
     * perform the actual atomic claim there.
     */
    private function configureSingleSession(): void
    {
        Event::listen(Login::class, function (Login $event) {
            request()->session()->put('auth.pending_claim', true);
        });
    }
}