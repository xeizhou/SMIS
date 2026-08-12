<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use App\Models\ServePo;
use App\Traits\LogsActivity;
use App\Traits\SerializesDatesWithoutTimezoneShift;

class PoLetterMonitoring extends Model
{
    use HasFactory, LogsActivity, SerializesDatesWithoutTimezoneShift;

    const LOG_NAME = 'PO Letter Monitoring';

    public function getActivityUrl()
    {
        return route('po-letter-monitoring.index', [
            'highlight_search' => $this->po_number ?? $this->reference_no,
            'highlight_id' => $this->getKey(),
        ]);
    }
    protected $table = 'po_letter_monitoring';

    protected $fillable = [
        'reference_no',
        'supplier_id',
        'po_number',
        'po_date',
        'date_received_by_supplier',
        'delivery_term',
        'due_date',
        'office_end_user',
        'type_of_letter',
        'date_received_by_smu',
        'date_forwarded_to_ovpad',
        'received_by',
        'status_of_the_letter',
        'document_link',
        'date_forwarded_to_end_user',
        'remarks',
    ];

    protected $casts = [
        'po_date' => 'date',
        'date_received_by_smu' => 'date',
        'date_forwarded_to_ovpad' => 'date',
        'date_forwarded_to_end_user' => 'date',
        // date_received_by_supplier, due_date, and delivery_term are
        // intentionally NOT cast here — they're computed live from the
        // linked ServePo via the accessors below, not read from the raw
        // columns. The raw columns still exist and are still written on
        // store()/update() for audit/backup purposes, but display always
        // goes through servePo so these values never go stale when the
        // parent PO's dates change.
    ];

    public function servePo(): BelongsTo
    {
        return $this->belongsTo(ServePo::class, 'po_number', 'po_number');
    }

    public function supplier(): BelongsTo
    {
        return $this->belongsTo(Supplier::class, 'supplier_id');
    }

    public function attachments(): MorphMany
    {
        return $this->morphMany(Attachment::class, 'attachable');
    }

    /**
     * Always reflects the linked PO's current po_received_date, not the
     * value frozen at the time this letter record was created.
     */
    protected function dateReceivedBySupplier(): Attribute
    {
        return Attribute::make(
            get: fn () => $this->servePo?->po_received_date,
        );
    }

    /**
     * Always reflects the linked PO's current due_date.
     */
    protected function dueDate(): Attribute
    {
        return Attribute::make(
            get: fn () => $this->servePo?->due_date,
        );
    }

    /**
     * Always recalculated from the linked PO's current dates. Null when
     * either date is missing (mirrors the frontend's daysBetween() guard).
     */
    protected function deliveryTerm(): Attribute
    {
        return Attribute::make(
            get: function () {
                $received = $this->servePo?->po_received_date;
                $due = $this->servePo?->due_date;

                if (! $received || ! $due) {
                    return null;
                }

                return max(0, $received->diffInDays($due));
            },
        );
    }


}