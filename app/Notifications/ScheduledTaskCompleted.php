<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class ScheduledTaskCompleted extends Notification
{
    use Queueable;

    public function __construct(public string $message, public ?string $target_url = null)
    {
    }

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toArray(object $notifiable): array
    {
        return [
            'message' => $this->message,
            'target_url' => $this->target_url,
        ];
    }
}
