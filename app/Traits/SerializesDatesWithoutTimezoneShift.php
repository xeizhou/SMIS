<?php

namespace App\Traits;

/**
 * Eloquent's default JSON serialization converts Carbon dates to UTC
 * before formatting (via Carbon::serializeDate()), regardless of
 * app.timezone. For date-only columns, that shifts midnight
 * Asia/Manila back a day once converted to UTC — e.g. "2024-01-15"
 * becomes "2024-01-14T16:00:00.000000Z" in JSON sent to the frontend.
 *
 * This overrides serialization to keep a plain Y-m-d format with no
 * timezone conversion, so the date shown always matches the date
 * stored. Applies to every date-cast column on the model — datetime-cast
 * columns (created_at, data_entry_timestamp, etc.) are untouched since
 * those still need full precision.
 */
trait SerializesDatesWithoutTimezoneShift
{
    protected function serializeDate(\DateTimeInterface $date): string
    {
        return $date->format('Y-m-d');
    }
}