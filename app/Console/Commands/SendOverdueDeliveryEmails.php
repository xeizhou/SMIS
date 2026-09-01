<?php

namespace App\Console\Commands;

use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;
use App\Models\Delivery;
use App\Models\DeliveryFollowUp;
use App\Mail\DeliveryOverdueMail;
use Illuminate\Support\Facades\Mail;
use Carbon\Carbon;

#[Signature('deliveries:send-overdue-emails')]
#[Description('Sends automated overdue emails for deliveries that are exactly 1 day past due')]
class SendOverdueDeliveryEmails extends Command
{
    /**
     * Execute the console command.
     */
    public function handle()
    {
        $yesterday = Carbon::yesterday()->format('Y-m-d');
        
        // Find deliveries that are not completed or cancelled
        $deliveries = Delivery::with(['supplier', 'servePo'])
            ->whereNotIn('status', ['COMPLETED', 'COMPLETE', 'CANCELLED'])
            ->get()
            ->filter(function ($delivery) use ($yesterday) {
                // Use the computed due_date accessor which reflects live PO dates
                return $delivery->due_date && $delivery->due_date->format('Y-m-d') === $yesterday;
            });

        $count = 0;
        foreach ($deliveries as $delivery) {
            // Check if we already sent an auto email for this delivery
            $alreadySent = DeliveryFollowUp::where('delivery_id', $delivery->delivery_id)
                ->where('notice_type', 'Auto Email')
                ->exists();

            if ($alreadySent || !$delivery->supplier || empty($delivery->supplier->email_address)) {
                continue;
            }

            try {
                Mail::to($delivery->supplier->email_address)->send(new DeliveryOverdueMail($delivery));

                DeliveryFollowUp::create([
                    'delivery_id' => $delivery->delivery_id,
                    'user_id' => null, // System
                    'notice_type' => 'Auto Email',
                    'follow_up_date' => now(),
                    'remarks' => 'Automated overdue email sent to supplier.',
                ]);
                $count++;
            } catch (\Exception $e) {
                $this->error("Failed to send email for Delivery #{$delivery->po_number}: " . $e->getMessage());
            }
        }

        $this->info("Successfully sent {$count} overdue delivery emails.");
    }
}
