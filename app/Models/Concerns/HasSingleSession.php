<?php

namespace App\Models\Concerns;

use Illuminate\Support\Facades\DB;

trait HasSingleSession
{
    /**
     * Atomically claim the given session ID as this user's active session.
     * Succeeds if there's no current owner, or the current owner is stale
     * (missing from the sessions table, or expired by last_activity).
     *
     * Safe under concurrency: the UPDATE's WHERE clause is evaluated and
     * applied as a single atomic operation by the storage engine. If two
     * requests race to claim the same unclaimed/stale row, the database
     * serializes them via row locking — the second UPDATE re-evaluates the
     * WHERE clause against the now-already-claimed row and matches zero
     * rows, so it correctly fails instead of overwriting the winner.
     */
    public function claimSession(string $sessionId): bool
    {
        $expiredBefore = now()->subMinutes((int) config('session.lifetime'))->getTimestamp();

        $affected = DB::update(
            <<<'SQL'
            UPDATE users
            SET current_session_id = ?
            WHERE id = ?
              AND (
                current_session_id IS NULL
                OR current_session_id NOT IN (SELECT id FROM sessions)
                OR current_session_id IN (
                    SELECT id FROM sessions WHERE last_activity < ?
                )
              )
            SQL,
            [$sessionId, $this->getKey(), $expiredBefore]
        );

        if ($affected > 0) {
            $this->current_session_id = $sessionId;
        }

        return $affected > 0;
    }

    /**
     * Conditionally release ownership — only if it still matches the given
     * session ID. This guards against a logout request clobbering a
     * different, newer session that has since claimed ownership.
     */
    public function releaseSession(string $sessionId): bool
    {
        $affected = DB::update(
            'UPDATE users SET current_session_id = NULL WHERE id = ? AND current_session_id = ?',
            [$this->getKey(), $sessionId]
        );

        if ($affected > 0) {
            $this->current_session_id = null;
        }

        return $affected > 0;
    }

    /**
     * Is this user's recorded session currently owned by someone, and is
     * that ownership still live (not stale)?
     */
    public function hasActiveSessionOwnedByAnother(): bool
    {
        if (empty($this->current_session_id)) {
            return false;
        }

        $expiredBefore = now()->subMinutes((int) config('session.lifetime'))->getTimestamp();

        return DB::table('sessions')
            ->where('id', $this->current_session_id)
            ->where('last_activity', '>=', $expiredBefore)
            ->exists();
    }
}