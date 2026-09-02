<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Schedule::command('model:prune')->daily();

// Read Scheduled Tasks Settings
$settingsPath = storage_path('app/scheduled_tasks_settings.json');
$settings = [];
if (file_exists($settingsPath)) {
    $settings = json_decode(file_get_contents($settingsPath), true) ?? [];
}

$overdueEnabled = filter_var($settings['delivery_email_enabled'] ?? false, FILTER_VALIDATE_BOOLEAN);
$overdueTime = $settings['delivery_email_schedule_time'] ?? '08:00';

$reminderEnabled = filter_var($settings['reminder_email_enabled'] ?? false, FILTER_VALIDATE_BOOLEAN);
$reminderTime = $settings['reminder_email_schedule_time'] ?? '08:00';
$reminderDays = $settings['reminder_email_days'] ?? ['3'];

if ($overdueEnabled) {
    Schedule::command('deliveries:send-overdue-emails')->dailyAt($overdueTime);
}

if ($reminderEnabled && is_array($reminderDays)) {
    foreach ($reminderDays as $days) {
        Schedule::command('deliveries:send-reminders', ['--days' => $days])->dailyAt($reminderTime);
    }
}
