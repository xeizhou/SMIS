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
            $email = Str::lower($request->input(Fortify::username()));
            $password = $request->input('password');

            $user = User::where('email', $email)->first();

            if (!$user || !Hash::check($password, $user->password)) {
                return null;
            }

            // Single-session enforcement: reject the login here, before
            // Auth::login() is ever called, if this account already has a
            // live session elsewhere. Throwing here surfaces the message
            // through Fortify's normal errors.email mechanism — no changes
            // needed to the React login form.
            if ($user->hasActiveSessionOwnedByAnother()) {
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