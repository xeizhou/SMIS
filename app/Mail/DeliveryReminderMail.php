<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Attachment;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;
use App\Models\Delivery;

class DeliveryReminderMail extends Mailable
{
    use Queueable, SerializesModels;

    public Delivery $delivery;

    /**
     * Create a new message instance.
     */
    public function __construct(Delivery $delivery)
    {
        $this->delivery = $delivery;
    }

    /**
     * Get the message envelope.
     */
    public function envelope(): Envelope
    {
        $supplierName = $this->delivery->supplier->supplier_name ?? 'Supplier';
        $refNo = $this->delivery->po_number ?? 'Unknown';

        return new Envelope(
            subject: "Upcoming Delivery Reminder: {$refNo} – {$supplierName}",
        );
    }

    /**
     * Get the message content definition.
     */
    public function content(): Content
    {
        return new Content(
            view: 'emails.delivery-reminder',
        );
    }

    /**
     * Get the attachments for the message.
     *
     * @return array<int, Attachment>
     */
    public function attachments(): array
    {
        return [];
    }
}
