<?php

namespace App\Providers;

use Carbon\CarbonImmutable;
use Illuminate\Auth\Events\Logout;
use Illuminate\Support\Facades\Date;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\ServiceProvider;
use Illuminate\Validation\Rules\Password;

class AppServiceProvider extends ServiceProvider
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
        $this->configureDefaults();
        \Illuminate\Database\Eloquent\Builder::macro('paginateWithHighlight', function ($perPage = null, $columns = ['*'], $pageName = 'page', $page = null) {
            /** @var \Illuminate\Database\Eloquent\Builder $this */
            $request = request();
            
            $highlightId = $request->query('highlight_id');
            $highlightSearch = $request->query('highlight_search');
            
            if (($highlightId || $highlightSearch) && !$request->has($pageName)) {
                $queryClone = clone $this;
                $queryClone->setEagerLoads([]);
                
                $position = 0;
                $found = false;
                $model = $this->getModel();
                
                if ($highlightId) {
                    $ids = $queryClone->pluck($model->qualifyColumn($model->getKeyName()))->toArray();
                    $index = array_search((string)$highlightId, array_map('strval', $ids), true);
                    if ($index !== false) {
                        $position = $index;
                        $found = true;
                    }
                } elseif ($highlightSearch) {
                    $highlightColumn = $request->query('highlight_column');
                    if ($highlightColumn) {
                        $values = $queryClone->pluck($model->qualifyColumn($highlightColumn))->toArray();
                        $index = array_search((string)$highlightSearch, array_map('strval', $values), true);
                        if ($index !== false) {
                            $position = $index;
                            $found = true;
                        }
                    } else {
                        $queryClone->chunk(500, function ($models) use (&$position, &$found, $highlightSearch) {
                            foreach ($models as $m) {
                                foreach ($m->getAttributes() as $val) {
                                    if ((string)$val === (string)$highlightSearch) {
                                        $found = true;
                                        return false;
                                    }
                                }
                                $position++;
                            }
                        });
                    }
                }
                
                if ($found) {
                    $perPage = $perPage ?: $model->getPerPage();
                    $targetPage = (int) ceil(($position + 1) / $perPage);
                    
                    $currentPage = (int) $request->query($pageName, 1);
                    
                    if ($targetPage !== $currentPage) {
                        $request->query->set($pageName, $targetPage);
                        $newQueryString = http_build_query($request->query());
                        
                        $request->server->set('QUERY_STRING', $newQueryString);
                        $baseUri = strtok($request->server->get('REQUEST_URI'), '?');
                        $request->server->set('REQUEST_URI', $baseUri . '?' . $newQueryString);
                        
                        $reflection = new \ReflectionClass($request);
                        $parent = $reflection->getParentClass();
                        if ($parent && $parent->hasProperty('requestUri')) {
                            $property = $parent->getProperty('requestUri');
                            $property->setAccessible(true);
                            $property->setValue($request, null);
                        }
                    }
                    
                    \Illuminate\Pagination\Paginator::currentPageResolver(function () use ($targetPage) {
                        return $targetPage;
                    });
                }
            }
            
            return $this->paginate($perPage, $columns, $pageName, $page);
        });

        // Clear the "owned session" pointer on logout so the slot frees up
        // for the next login. The claim itself happens exclusively in
        // EnsureSingleSession (post-session-regeneration, via an atomic
        // UPDATE...WHERE) — deliberately NOT here in a Login event listener,
        // because Login fires before Fortify regenerates the session id,
        // so anything written here would immediately mismatch on the very
        // next request and log the user straight back out.
        Event::listen(Logout::class, function (Logout $event) {
            if (!$event->user) {
                return;
            }

            /*
            * If this logout was caused by the single-session
            * protection, DO NOT release the account.
            *
            * The original user's session still owns it.
            */
            if (request()->session()->get('single_session_forced_logout')) {
                return;
            }

            /*
            * This was a normal voluntary logout.
            * Release the account so another login can claim it.
            */
            $event->user->forceFill([
                'current_session_id' => null,
            ])->save();
        });
    }

    /**
     * Configure default behaviors for production-ready applications.
     */
    protected function configureDefaults(): void
    {
        Date::use(CarbonImmutable::class);

        DB::prohibitDestructiveCommands(
            app()->isProduction(),
        );

        Password::defaults(fn (): ?Password => app()->isProduction()
            ? Password::min(12)
                ->mixedCase()
                ->letters()
                ->numbers()
                ->symbols()
                ->uncompromised()
            : null,
        );
    }
}