<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

use App\Traits\LogsActivity;

class BonaVidaMonitoring extends Model
{
    use HasFactory, LogsActivity;

    const LOG_NAME = 'Bona Vida Monitoring';

    protected $table = 'bona_vida_monitoring';

    protected $primaryKey = 'bvm_id';

    protected $fillable = [
        'date_received',
        'office_code',
        'qty',
        'price',
        'total_amount',
        'invoice_no',
        'invoice_date',
        'remarks',
    ];

    protected $casts = [
        'date_received' => 'date',
        'invoice_date' => 'date',
        'price' => 'decimal:2',
        'total_amount' => 'decimal:2',
    ];

    public function office(): BelongsTo
    {
        return $this->belongsTo(Office::class, 'office_code', 'office_code');
    }

    public function getActivityUrl()
    {
        return route('bona-vida-monitoring.index') . '?highlight_id=' . $this->id;
    }
}
