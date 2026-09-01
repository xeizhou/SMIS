<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Schedule::command('model:prune')->daily();

if (\App\Models\Setting::get('delivery_email_enabled', true)) {
    $time = \App\Models\Setting::get('delivery_email_schedule_time', '08:00');
    Schedule::command('deliveries:send-overdue-emails')->dailyAt($time);
}
