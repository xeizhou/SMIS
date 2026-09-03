<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Schedule::command('model:prune')->daily()->onSuccess(function (\Illuminate\Support\Stringable $output) {
    preg_match('/AuditLog\s*\.{2,}\s*(\d+)\s*records/i', $output->value(), $matches);
    $count = (int) ($matches[1] ?? 0);
    if ($count > 0) {
        $settingsPath = storage_path('app/scheduled_tasks_settings.json');
        $days = 30;
        if (file_exists($settingsPath)) {
            $settings = json_decode(file_get_contents($settingsPath), true) ?? [];
            if (isset($settings['audit_logs_cleanup_days'])) {
                $days = (int) $settings['audit_logs_cleanup_days'];
            }
        }
        
        $admins = \App\Models\User::where('role', \App\Models\User::ROLE_ADMIN)
            ->where('last_active_at', '>=', now()->subDays(14))
            ->get();
        \Illuminate\Support\Facades\Notification::send(
            $admins, 
            new \App\Notifications\ScheduledTaskCompleted("System Audit Logs Cleanup completed successfully. {$count} audit logs older than {$days} days were removed.")
        );
    }
});

Schedule::call(function () {
    // Tiered cleanup: 7 days for system logs, 30 days for others
    \Illuminate\Support\Facades\DB::table('notifications')
        ->where('type', 'App\Notifications\ScheduledTaskCompleted')
        ->where('created_at', '<', now()->subDays(7))
        ->delete();

    \Illuminate\Support\Facades\DB::table('notifications')
        ->where('created_at', '<', now()->subDays(30))
        ->delete();
})->daily()
  ->name('System Notifications Cleanup')
  ->description('Automatically deletes old notification records to free up space.');

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
