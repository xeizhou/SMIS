<?php

namespace App\Mail;

use App\Models\Office;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class EmailFunction extends Mailable
{
    use Queueable, SerializesModels;

    public const TYPES = ['pir_created', 'pir_for_release', 'pir_coa_received', 'pir_completed'];

    public function __construct(
        public Office $office,
        public string $type = 'pir_created',
        public ?string $poNumber = null,
        public ?string $supplierName = null
    ) {
    }

    public function build()
    {
        $templates = [
            'pir_created' => [
                'subject' => 'PO Issued From OVPAD',
                'view' => 'emails.pir-created',
            ],
            'pir_for_release' => [
                'subject' => 'PIR Ready for Release',
                'view' => 'emails.pir-for-release',
            ],
            'pir_coa_received' => [
                'subject' => 'PO Received by COA',
                'view' => 'emails.pir-coa-received',
            ],
            'pir_completed' => [
                'subject' => 'Items Ready for Claiming',
                'view' => 'emails.pir-completed',
            ],
        ];

        $template = $templates[$this->type] ?? $templates['pir_created'];

        return $this->subject($template['subject'] . ' - ' . $this->office->office_name)
                    ->view($template['view'], [
                        'poNumber' => $this->poNumber,
                        'supplierName' => $this->supplierName,
                    ]);
    }
}