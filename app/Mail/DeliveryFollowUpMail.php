<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;
use App\Models\Delivery;

class DeliveryFollowUpMail extends Mailable
{
    use Queueable, SerializesModels;

    public Delivery $delivery;
    public ?string $customMessage;

    /**
     * Create a new message instance.
     */
    public function __construct(Delivery $delivery, ?string $customMessage = null)
    {
        $this->delivery = $delivery;
        $this->customMessage = $customMessage;
    }

    /**
     * Get the message envelope.
     */
    public function envelope(): Envelope
    {
        $supplierName = $this->delivery->supplier->supplier_name ?? 'Supplier';
        $refNo = $this->delivery->po_number ?? 'Unknown';

        return new Envelope(
            subject: "Delivery Follow-Up: {$refNo} – {$supplierName}",
        );
    }

    /**
     * Get the message content definition.
     */
    public function content(): Content
    {
        return new Content(
            view: 'emails.delivery-follow-up',
        );
    }

    /**
     * Get the attachments for the message.
     */
    public function attachments(): array
    {
        return [];
    }
}
