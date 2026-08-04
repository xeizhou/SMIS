<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use App\Traits\LogsActivity;

class Transaction extends Model
{
    use HasFactory, LogsActivity;

    const LOG_NAME = 'Transaction Logs';

    protected $table = 'transactions';

    protected $primaryKey = 'transactionID';

    public $timestamps = false; // source table has no created_at/updated_at

    protected $fillable = [
        'transaction_type',
        'fund_cluster',
        'transaction_date',
        'item_name',
        'unitID',
        'reference',
        'quantity',
        'office_code',
    ];

    protected $casts = [
        'transaction_date' => 'datetime',
    ];

    public function fundCluster(): BelongsTo
    {
        return $this->belongsTo(FundCluster::class, 'fund_cluster', 'fund_cluster_id');
    }

    public function office(): BelongsTo
    {
        return $this->belongsTo(Office::class, 'office_code', 'office_code');
    }

    public function unit(): BelongsTo
    {
        return $this->belongsTo(Unit::class, 'unitID', 'unitID');
    }

    public function getActivityUrl()
    {
        return route('transaction-logs.index') . '?highlight_id=' . $this->transactionID;
    }
}
