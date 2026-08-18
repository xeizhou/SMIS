<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class EnsureSingleSession
{
    public function handle(Request $request, Closure $next)
    {
        $user = Auth::user();

        if (!$user) {
            return $next($request);
        }

        $currentSessionId = $request->session()->getId();

        /*
         * The account is owned by another session.
         */
        if (
            $user->current_session_id &&
            $user->current_session_id !== $currentSessionId
        ) {
            $request->session()->put(
                'single_session_forced_logout',
                true
            );

            Auth::logout();

            $request->session()->invalidate();
            $request->session()->regenerateToken();

            return redirect()
                ->route('login')
                ->with(
                    'error',
                    'This account is already logged in on another device.'
                );
        }

        /*
         * No session owns the account yet.
         *
         * Atomically claim it.
         */
        if (!$user->current_session_id) {
            $claimed = DB::table('users')
                ->where('id', $user->id)
                ->whereNull('current_session_id')
                ->update([
                    'current_session_id' => $currentSessionId,
                ]);

            /*
             * Someone else claimed it at the same time.
             */
            if ($claimed === 0) {
                $request->session()->put(
                    'single_session_forced_logout',
                    true
                );

                Auth::logout();

                $request->session()->invalidate();
                $request->session()->regenerateToken();

                return redirect()
                    ->route('login')
                    ->with(
                        'error',
                        'This account is already logged in on another device.'
                    );
            }
        }

        return $next($request);
    }
}