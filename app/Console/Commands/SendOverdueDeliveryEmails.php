<?php

namespace App\Console\Commands;

use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;
use App\Models\Delivery;
use App\Models\DeliveryFollowUp;
use App\Mail\DeliveryOverdueMail;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

#[Signature('deliveries:send-overdue-emails {--manual}')]
#[Description('Sends automated overdue emails for deliveries that are exactly 1 day past due')]
class SendOverdueDeliveryEmails extends Command
{
    /**
     * Execute the console command.
     */
    public function handle()
    {
        $yesterday = Carbon::yesterday()->format('Y-m-d');
        
        $driver = DB::connection()->getDriverName();
        $dateCalculation = $driver === 'sqlite' 
            ? "date(serve_po.po_received_date, '+' || serve_po.delivery_term || ' days')"
            : "DATE_ADD(serve_po.po_received_date, INTERVAL serve_po.delivery_term DAY)";

        // Find deliveries that are 1 day (or more) overdue and haven't received an auto email yet
        $deliveries = Delivery::with(['supplier', 'servePo'])
            ->join('serve_po', 'delivery.po_number', '=', 'serve_po.po_number')
            ->whereNotIn('delivery.status', ['CANCELLED'])
            ->whereRaw("{$dateCalculation} = ?", [$yesterday])
            ->whereDoesntHave('deliveryFollowUps', function ($query) {
                $query->where('notice_type', 'Auto Email');
            })
            ->whereHas('supplier')
            ->select('delivery.*')
            ->get();

        $count = 0;
        foreach ($deliveries as $delivery) {

            try {
                $notifEmail = env('MAIL_NOTIFICATIONS_ADDRESS', config('mail.from.address'));
                Mail::to($notifEmail)->send(new DeliveryOverdueMail($delivery));

                DeliveryFollowUp::withoutEvents(function () use ($delivery) {
                    DeliveryFollowUp::create([
                        'delivery_id' => $delivery->delivery_id,
                        'user_id' => null, // System
                        'notice_type' => 'Auto Email',
                        'follow_up_date' => now(),
                        'remarks' => 'Automated overdue email sent to supplier.',
                    ]);
                });
                $count++;
            } catch (\Exception $e) {
                $this->error("Failed to send email for Delivery #{$delivery->po_number}: " . $e->getMessage());
            }
        }

        $this->info("Successfully sent {$count} overdue delivery emails.");

        if ($count > 0) {
            $isManual = $this->option('manual');
            
            if ($isManual && \Illuminate\Support\Facades\Auth::check()) {
                $user = \Illuminate\Support\Facades\Auth::user();
                \App\Models\AuditLog::create([
                    'log_timestamp' => now(),
                    'userID' => $user->id,
                    'role' => $user->role ?? 'Staff',
                    'action' => 'Used Force Send Delivery Emails command.',
                    'target_url' => null,
                ]);
            }

            $admins = \App\Models\User::where('role', \App\Models\User::ROLE_ADMIN)
                ->where('last_active_at', '>=', now()->subDays(14))
                ->get();
            
            if ($isManual) {
                $message = "Force Send Delivery Emails completed successfully. {$count} delivery email(s) were sent.";
            } else {
                if ($count === 1) {
                    $message = "Overdue Delivery Auto-Emailer successfully sent an automatic email for Delivery #" . ($deliveries->first()?->po_number ?? '');
                } else {
                    $message = "Overdue Delivery Auto-Emailer completed successfully. {$count} overdue delivery email(s) were sent.";
                }
            }
            
            \Illuminate\Support\Facades\Notification::send($admins, new \App\Notifications\ScheduledTaskCompleted($message));
        }
    }
}
