<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use App\Traits\LogsActivity;
use App\Traits\SerializesDatesWithoutTimezoneShift;

class Delivery extends Model    
{
    use HasFactory, LogsActivity, SerializesDatesWithoutTimezoneShift;

    const LOG_NAME = 'Delivery Monitoring';

    public function getActivityUrl()
    {
        return route('deliveries.index', [
            'highlight_search' => $this->po_number,
            'highlight_id' => $this->getKey(),
        ]);
    }

    protected $table = 'delivery';

    protected $primaryKey = 'delivery_id';

    protected $keyType = 'string';

    public $incrementing = false;

    public $timestamps = false; // source table tracks data_entry_timestamp instead

    protected $fillable = [
        'delivery_id',
        'po_number',
        'supplier_id',
        'delivery_date',
        'po_date_received',
        'delivery_term',
        'due_date',
        'no_of_days_ld',
        'received_by_1',
        'received_by_2',
        'end_user',
        'place_of_delivery',
        'status',
        'remarks',
        'data_entry_timestamp',
        'total_amount_delivered',
        'po_total_amount',
        'folder_link',
    ];

    protected $casts = [
        'delivery_date' => 'date',
        'data_entry_timestamp' => 'datetime',
        'total_amount_delivered' => 'decimal:2',
        'po_total_amount' => 'decimal:2',
        // po_date_received, due_date, delivery_term, and no_of_days_ld are
        // intentionally NOT cast here — they're computed live via the
        // accessors below, sourced from the linked ServePo (and, for
        // no_of_days_ld, from this delivery's own delivery_date). The raw
        // columns still exist and are still written on store()/update(),
        // but reads always go through the accessors so these values never
        // go stale when the parent PO's dates change.
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
     * Always reflects the linked PO's current po_received_date.
     */
    protected function poDateReceived(): Attribute
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
     * either date is missing.
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

    /**
     * Days late = how far delivery_date (actual) fell past due_date
     * (from the linked PO). Not a PO snapshot — depends on the delivery
     * itself, so it's null until delivery_date is set, and 0 if delivered
     * on time or early.
     */
    protected function noOfDaysLd(): Attribute
    {
        return Attribute::make(
            get: function () {
                $delivered = $this->delivery_date;
                $due = $this->servePo?->due_date;

                if (! $delivered || ! $due) {
                    return null;
                }

                if ($delivered->lessThanOrEqualTo($due)) {
                    return 0;
                }

                return $due->diffInDays($delivered);
            },
        );
    }


}