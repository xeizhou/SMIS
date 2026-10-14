<?php

use App\Http\Middleware\EnsureSingleSession;
use App\Http\Middleware\EnsureUserIsAdmin;
use App\Http\Middleware\HandleAppearance;
use App\Http\Middleware\HandleInertiaRequests;
use App\Http\Middleware\PreventBackHistory;
use App\Http\Middleware\ReleaseSessionOnLogout;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Middleware\AddLinkHeadersForPreloadedAssets;
use Illuminate\Http\Request;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->encryptCookies(except: [
            'appearance',
            'sidebar_state',
        ]);

        $middleware->web(append: [
            HandleAppearance::class,
            HandleInertiaRequests::class,
            AddLinkHeadersForPreloadedAssets::class,
            PreventBackHistory::class,
            ReleaseSessionOnLogout::class,
            \App\Http\Middleware\UpdateLastActiveAt::class,
        ]);

        $middleware->alias([
            'admin' => EnsureUserIsAdmin::class,
            'single-session' => EnsureSingleSession::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) =>
                $request->is('api/*') || $request->expectsJson(),
        );

        // Convert technical and unhandled exceptions into safe, user-friendly feedback
        // instead of exposing raw SQL queries, stack traces, or technical error pages.
        $exceptions->render(function (\Throwable $e, Request $request) {
            if ($e instanceof \Illuminate\Validation\ValidationException) {
                return null;
            }

            // Database Query Exceptions (integrity constraints, foreign keys, duplicate keys)
            if ($e instanceof \Illuminate\Database\QueryException) {
                \Illuminate\Support\Facades\Log::error('Database error: ' . $e->getMessage(), [
                    'sql' => $e->getSql(),
                    'url' => $request->fullUrl(),
                    'user_id' => $request->user()?->id,
                ]);

                $sqlState = (string) ($e->errorInfo[0] ?? $e->getCode());
                $driverCode = $e->errorInfo[1] ?? null;
                $msg = strtolower($e->getMessage());

                if (
                    str_contains($msg, 'foreign key') ||
                    str_contains($msg, 'constraint failed') ||
                    in_array($driverCode, [1451, 1452, 19], true)
                ) {
                    $safeMessage = 'This record cannot be modified or deleted because it is linked to other records in the system.';
                } elseif (
                    str_contains($msg, 'duplicate') ||
                    str_contains($msg, 'unique') ||
                    $driverCode === 1062 ||
                    str_contains($msg, '1062')
                ) {
                    $safeMessage = 'A record with this information already exists. Duplicate entries are not allowed.';
                } elseif ($sqlState === '23000') {
                    $safeMessage = 'A database constraint prevented this operation from completing.';
                } else {
                    $safeMessage = 'A database error occurred while processing your request. Please try again.';
                }

                if ($request->is('api/*') || $request->expectsJson()) {
                    return response()->json(['message' => $safeMessage], 422);
                }

                return back()->with('error', $safeMessage);
            }

            // Authorization / Permissions (403)
            if ($e instanceof \Illuminate\Auth\Access\AuthorizationException || $e instanceof \Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException) {
                $safeMessage = 'You do not have permission to perform this action.';
                if ($request->is('api/*') || $request->expectsJson()) {
                    return response()->json(['message' => $safeMessage], 403);
                }
                return back()->with('error', $safeMessage);
            }

            // Model / Record Not Found (404)
            $isModelNotFound = $e instanceof \Illuminate\Database\Eloquent\ModelNotFoundException
                || ($e instanceof \Symfony\Component\HttpKernel\Exception\NotFoundHttpException && $e->getPrevious() instanceof \Illuminate\Database\Eloquent\ModelNotFoundException);

            if ($isModelNotFound) {
                if ($request->is('api/*') || $request->expectsJson()) {
                    return response()->json(['message' => 'The requested record was not found.'], 404);
                }
                return back()->with('error', 'The requested record was not found or has been removed.');
            }

            if ($e instanceof \Symfony\Component\HttpKernel\Exception\NotFoundHttpException) {
                if ($request->is('api/*') || $request->expectsJson()) {
                    return response()->json(['message' => 'The requested resource was not found.'], 404);
                }
                if ($request->header('X-Inertia') && ! $request->isMethod('GET')) {
                    return back()->with('error', 'The requested record could not be found. It may have been archived or deleted.');
                }
                return null;
            }

            // Upload File Exceeded (413)
            if ($e instanceof \Illuminate\Http\Exceptions\PostTooLargeException) {
                $safeMessage = 'The uploaded file exceeds the maximum allowed file size. Please choose a smaller file.';
                if ($request->is('api/*') || $request->expectsJson()) {
                    return response()->json(['message' => $safeMessage], 413);
                }
                return back()->with('error', $safeMessage);
            }

            // Unhandled server errors during Inertia mutations (POST/PUT/DELETE)
            if ($request->header('X-Inertia') && ! $request->isMethod('GET')) {
                \Illuminate\Support\Facades\Log::error('Unhandled exception during action: ' . $e->getMessage(), [
                    'exception' => $e,
                    'url' => $request->fullUrl(),
                    'user_id' => $request->user()?->id,
                ]);

                return back()->with('error', 'An unexpected error occurred while processing your request. Please try again.');
            }

            return null;
        });
    })
    ->create();