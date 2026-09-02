<?php

namespace App\Console\Commands;

use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;
use App\Models\Delivery;
use App\Models\DeliveryFollowUp;
use App\Mail\DeliveryReminderMail;
use Illuminate\Support\Facades\Mail;
use Carbon\Carbon;

#[Signature('deliveries:send-reminders {--days=} {--date=}')]
#[Description('Sends automated reminder emails for deliveries based on a specific due date offset')]
class SendDeliveryReminders extends Command
{
    /**
     * Execute the console command.
     */
    public function handle()
    {
        $days = $this->option('days');
        $date = $this->option('date');

        if ($date) {
            $targetDate = Carbon::parse($date)->format('Y-m-d');
        } elseif ($days !== null) {
            $targetDate = now()->addDays((int) $days)->format('Y-m-d');
        } else {
            $this->error('You must provide either --days or --date');
            return 1;
        }
        
        $this->info("Checking for deliveries due on: {$targetDate}");

        // Find deliveries that are not completed or cancelled
        $deliveries = Delivery::with(['supplier', 'servePo'])
            ->whereNotIn('status', ['COMPLETED', 'COMPLETE', 'CANCELLED'])
            ->get()
            ->filter(function ($delivery) use ($targetDate) {
                // Use the computed due_date accessor which reflects live PO dates
                return $delivery->due_date && $delivery->due_date->format('Y-m-d') === $targetDate;
            });

        $count = 0;
        foreach ($deliveries as $delivery) {
            // Check if we already sent a reminder for this delivery
            // We could check if we already sent a reminder today, or if we sent a reminder for this exact target.
            // But since this is a "force send" manual trigger, maybe we don't strictly prevent re-sending, or we prevent spamming.
            // Let's check if we sent a notice today to prevent accidental double-clicks.
            $alreadySentToday = DeliveryFollowUp::where('delivery_id', $delivery->delivery_id)
                ->where('notice_type', 'Reminder Email')
                ->whereDate('follow_up_date', now()->format('Y-m-d'))
                ->exists();

            if ($alreadySentToday || !$delivery->supplier) {
                continue;
            }

            try {
                $notifEmail = env('MAIL_NOTIFICATIONS_ADDRESS', config('mail.from.address'));
                Mail::to($notifEmail)->send(new DeliveryReminderMail($delivery));

                DeliveryFollowUp::create([
                    'delivery_id' => $delivery->delivery_id,
                    'user_id' => null, // System / Manual Trigger
                    'notice_type' => 'Reminder Email',
                    'follow_up_date' => now(),
                    'remarks' => "Reminder email sent to supplier (Due on {$targetDate}).",
                ]);
                $count++;
            } catch (\Exception $e) {
                $this->error("Failed to send email for Delivery #{$delivery->po_number}: " . $e->getMessage());
            }
        }

        $this->info("Successfully sent {$count} delivery reminder emails.");
        return 0;
    }
}
